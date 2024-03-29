import datetime
import os
from unittest.mock import patch

import pkg_resources
from Poem.api import views_internal as views
from Poem.api.internal_views.app import get_use_service_titles
from Poem.poem import models as poem_models
from Poem.poem_super_admin.models import WebAPIKey
from Poem.users.models import CustUser
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from django_tenants.utils import get_public_schema_name
from rest_framework.test import force_authenticate


class ListGroupsForUserAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListGroupsForUser.as_view()
        self.url = '/api/v2/internal/groups/'
        self.user = CustUser.objects.create_user(username='testuser')
        self.superuser = CustUser.objects.create_user(
            username='superuser', is_superuser=True
        )

        poem_models.GroupOfMetrics.objects.create(name='metricgroup1')
        gm1 = poem_models.GroupOfMetrics.objects.create(name='metricgroup2')

        poem_models.GroupOfMetricProfiles.objects.create(
            name='metricprofilegroup1'
        )
        gmp1 = poem_models.GroupOfMetricProfiles.objects.create(
            name='metricprofilegroup2'
        )

        poem_models.GroupOfAggregations.objects.create(name='aggrgroup1')
        ga1 = poem_models.GroupOfAggregations.objects.create(name='aggrgroup2')

        poem_models.GroupOfThresholdsProfiles.objects.create(
            name='thresholdsgroup1'
        )
        gtp1 = poem_models.GroupOfThresholdsProfiles.objects.create(
            name='thresholdsgroup2'
        )

        poem_models.GroupOfReports.objects.create(name='reportsgroup1')
        gr = poem_models.GroupOfReports.objects.create(name='reportsgroup2')

        userprofile = poem_models.UserProfile.objects.create(user=self.user)
        userprofile.groupsofmetrics.add(gm1)
        userprofile.groupsofmetricprofiles.add(gmp1)
        userprofile.groupsofaggregations.add(ga1)
        userprofile.groupsofthresholdsprofiles.add(gtp1)
        userprofile.groupsofreports.add(gr)

    def test_list_all_groups(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'result': {
                    'aggregations': ['aggrgroup1', 'aggrgroup2'],
                    'metrics': ['metricgroup1', 'metricgroup2'],
                    'metricprofiles': ['metricprofilegroup1',
                                       'metricprofilegroup2'],
                    'reports': ['reportsgroup1', 'reportsgroup2'],
                    'thresholdsprofiles': ['thresholdsgroup1',
                                           'thresholdsgroup2']
                }
            }
        )

    def test_list_groups_for_user_that_is_not_superuser(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'result': {
                    'aggregations': ['aggrgroup2'],
                    'metrics': ['metricgroup2'],
                    'metricprofiles': ['metricprofilegroup2'],
                    'reports': ['reportsgroup2'],
                    'thresholdsprofiles': ['thresholdsgroup2']
                }
            }
        )

    def test_get_aggregation_groups_for_superuser(self):
        request = self.factory.get(self.url + 'aggregations')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'aggregations')
        self.assertEqual(
            response.data,
            ['aggrgroup1', 'aggrgroup2']
        )

    def test_get_metric_groups_for_superuser(self):
        request = self.factory.get(self.url + 'metrics')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'metrics')
        self.assertEqual(
            response.data,
            ['metricgroup1', 'metricgroup2']
        )

    def test_get_metric_profile_groups_for_superuser(self):
        request = self.factory.get(self.url + 'metricprofiles')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'metricprofiles')
        self.assertEqual(
            response.data,
            ['metricprofilegroup1', 'metricprofilegroup2']
        )

    def test_get_thresholds_profiles_groups_for_superuser(self):
        request = self.factory.get(self.url + 'thresholdsprofiles')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'thresholdsprofiles')
        self.assertEqual(
            response.data,
            ['thresholdsgroup1', 'thresholdsgroup2']
        )

    def test_get_aggregation_groups_for_basic_user(self):
        request = self.factory.get(self.url + 'aggregations')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'aggregations')
        self.assertEqual(
            response.data,
            ['aggrgroup2']
        )

    def test_get_metric_groups_for_basic_user(self):
        request = self.factory.get(self.url + 'metrics')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metrics')
        self.assertEqual(
            response.data,
            ['metricgroup2']
        )

    def test_get_metric_profile_groups_for_basic_user(self):
        request = self.factory.get(self.url + 'metricprofiles')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metricprofiles')
        self.assertEqual(
            response.data,
            ['metricprofilegroup2']
        )

    def test_get_thresholds_profiles_groups_for_basic_user(self):
        request = self.factory.get(self.url + 'thresholdsprofiles')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'thresholdsprofiles')
        self.assertEqual(
            response.data,
            ['thresholdsgroup2']
        )


class GetConfigOptionsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.GetConfigOptions.as_view()
        self.url = '/api/v2/internal/config_options/'
        self.user = CustUser.objects.create(username='testuser')

    @patch(
        "Poem.api.internal_views.app.get_use_service_titles",
        return_value=True
    )
    @patch('Poem.api.internal_views.app.saml_login_string',
           return_value='Log in using B2ACCESS')
    @patch('Poem.api.internal_views.app.tenant_from_request',
           return_value='tenant')
    def test_get_config_options(self, *args):
        with self.settings(
            WEBAPI_METRIC='https://metric.profile.com',
            WEBAPI_AGGREGATION='https://aggregations.com',
            WEBAPI_THRESHOLDS='https://thresholds.com',
            WEBAPI_OPERATIONS='https://operations.com',
            WEBAPI_REPORTS='https://reports.com',
            WEBAPI_REPORTSTAGS='https://reports-tags.com',
            WEBAPI_REPORTSTOPOLOGYGROUPS='https://topology-groups.com',
            WEBAPI_REPORTSTOPOLOGYENDPOINTS='https://endpoints.com',
            WEBAPI_SERVICETYPES='https://topology-servicetypes.com',
            WEBAPI_DATAFEEDS="https://data.feeds.com",
            LINKS_TERMS_PRIVACY={
                'tenant': {
                    'terms': 'https://terms.of.use.com',
                    'privacy': 'https://privacy.policies.com'
                }
            }
        ):
            request = self.factory.get(self.url)
            response = self.view(request)
            self.assertEqual(
                response.data,
                {
                    'result': {
                        'saml_login_string': 'Log in using B2ACCESS',
                        'webapimetric': 'https://metric.profile.com',
                        'webapiaggregation': 'https://aggregations.com',
                        'webapithresholds': 'https://thresholds.com',
                        'webapioperations': 'https://operations.com',
                        'version': pkg_resources.get_distribution(
                            'poem'
                        ).version,
                        'webapireports': {
                            'main': 'https://reports.com',
                            'tags': 'https://reports-tags.com',
                            'topologygroups': 'https://topology-groups.com',
                            'topologyendpoints': 'https://endpoints.com'
                        },
                        'webapiservicetypes':
                            'https://topology-servicetypes.com',
                        "webapidatafeeds": "https://data.feeds.com",
                        'tenant_name': 'tenant',
                        'terms_privacy_links': {
                            'terms': 'https://terms.of.use.com',
                            'privacy': 'https://privacy.policies.com'
                        },
                        "use_service_title": True
                    }
                }
            )


class GetSessionDetailsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.IsSessionActive.as_view()
        self.url = '/api/v2/internal/sessionactive/'
        self.user = CustUser.objects.create(username='testuser')

        self.userprofile = poem_models.UserProfile.objects.create(
            user=self.user,
            subject='subject',
            displayname='First_User',
            egiid='blablabla'
        )
        WebAPIKey.objects.create(
            id=1,
            name='WEB-API-TENANT',
            token='mocked_token_rw',
            prefix="prefix1"
        )
        WebAPIKey.objects.create(
            id=2,
            name='WEB-API-TENANT-RO',
            token='mocked_token_ro',
            prefix="prefix2"
        )
        WebAPIKey.objects.create(
            id=3,
            name="WEB-API-TENANT1",
            token="mock_tenant1_rw_token",
            prefix="prefix3"
        )
        WebAPIKey.objects.create(
            id=4,
            name="WEB-API-TENANT1-RO",
            token="mock_tenant1_ro_token",
            prefix="prefix4"
        )
        WebAPIKey.objects.create(
            id=5,
            name="WEB-API-TENANT2",
            token="mock_tenant2_rw_token",
            prefix="prefix5"
        )
        WebAPIKey.objects.create(
            id=6,
            name="WEB-API-TENANT2-RO",
            token="mock_tenant2_ro_token",
            prefix="prefix6"
        )

    def test_unauth(self):
        request = self.factory.get(self.url + 'true')
        response = self.view(request)
        self.assertEqual(response.status_code, 403)

    def test_auth_crud(self):
        gm = poem_models.GroupOfMetrics.objects.create(
            name='GROUP-metrics'
        )
        ga = poem_models.GroupOfAggregations.objects.create(
            name='GROUP-aggregations'
        )
        gmp = poem_models.GroupOfMetricProfiles.objects.create(
            name='GROUP-metricprofiles'
        )
        gtp = poem_models.GroupOfThresholdsProfiles.objects.create(
            name='GROUP-thresholds'
        )
        gr = poem_models.GroupOfReports.objects.create(name='GROUP-reports')

        self.userprofile.groupsofmetrics.add(gm)
        self.userprofile.groupsofaggregations.add(ga)
        self.userprofile.groupsofmetricprofiles.add(gmp)
        self.userprofile.groupsofthresholdsprofiles.add(gtp)
        self.userprofile.groupsofreports.add(gr)

        request = self.factory.get(self.url + 'true')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'true')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "active": True,
                "userdetails": {
                    "first_name": "",
                    "last_name": "",
                    "username": "testuser",
                    "is_superuser": False,
                    "is_active": True,
                    "email": "",
                    "date_joined": datetime.datetime.strftime(
                        self.user.date_joined, "%Y-%m-%dT%H:%M:%S.%f"
                    ),
                    "pk": self.user.id,
                    "groups": {
                        "aggregations": ["GROUP-aggregations"],
                        "metricprofiles": ["GROUP-metricprofiles"],
                        "metrics": ["GROUP-metrics"],
                        "reports": ["GROUP-reports"],
                        "thresholdsprofiles": ["GROUP-thresholds"]
                    },
                    "token": "mocked_token_rw"
                },
                "tenantdetails": {
                    "combined": False,
                    "tenants": {}
                }
            }
        )

    @patch("Poem.api.internal_views.app.CombinedTenant.tenants")
    def test_auth_crud_combined_tenant(self, mock_tenants):
        mock_tenants.return_value = ["TENANT1", "TENANT2"]
        self.tenant.combined = True
        self.tenant.save()
        gm = poem_models.GroupOfMetrics.objects.create(
            name='GROUP-metrics'
        )
        ga = poem_models.GroupOfAggregations.objects.create(
            name='GROUP-aggregations'
        )
        gmp = poem_models.GroupOfMetricProfiles.objects.create(
            name='GROUP-metricprofiles'
        )
        gtp = poem_models.GroupOfThresholdsProfiles.objects.create(
            name='GROUP-thresholds'
        )
        gr = poem_models.GroupOfReports.objects.create(name='GROUP-reports')

        self.userprofile.groupsofmetrics.add(gm)
        self.userprofile.groupsofaggregations.add(ga)
        self.userprofile.groupsofmetricprofiles.add(gmp)
        self.userprofile.groupsofthresholdsprofiles.add(gtp)
        self.userprofile.groupsofreports.add(gr)

        request = self.factory.get(self.url + 'true')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'true')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "active": True,
                "userdetails": {
                    "first_name": "",
                    "last_name": "",
                    "username": "testuser",
                    "is_superuser": False,
                    "is_active": True,
                    "email": "",
                    "date_joined": datetime.datetime.strftime(
                        self.user.date_joined, "%Y-%m-%dT%H:%M:%S.%f"
                    ),
                    "pk": self.user.id,
                    "groups": {
                        "aggregations": ["GROUP-aggregations"],
                        "metricprofiles": ["GROUP-metricprofiles"],
                        "metrics": ["GROUP-metrics"],
                        "reports": ["GROUP-reports"],
                        "thresholdsprofiles": ["GROUP-thresholds"]
                    },
                    "token": "mocked_token_rw"
                },
                "tenantdetails": {
                    "combined": True,
                    "tenants": {
                        "TENANT1": "mock_tenant1_ro_token",
                        "TENANT2": "mock_tenant2_ro_token"
                    }
                }
            }
        )

    def test_auth_readonly(self):
        self.tenant.combined = False
        self.tenant.save()
        request = self.factory.get(self.url + 'true')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'true')
        self.assertEqual(
            response.data,
            {
                "active": True,
                "userdetails": {
                    "first_name": "",
                    "last_name": "",
                    "username": "testuser",
                    "is_superuser": False,
                    "is_active": True,
                    "email": "",
                    "date_joined": datetime.datetime.strftime(
                        self.user.date_joined, "%Y-%m-%dT%H:%M:%S.%f"
                    ),
                    "pk": self.user.id,
                    "groups": {
                        "aggregations": [],
                        "metricprofiles": [],
                        "metrics": [],
                        "reports": [],
                        "thresholdsprofiles": []
                    },
                    "token": "mocked_token_ro"
                },
                "tenantdetails": {
                    "combined": False,
                    "tenants": {}
                }
            }
        )

    def test_auth_readonly_combined_tenant(self):
        self.tenant.combined = True
        self.tenant.save()
        request = self.factory.get(self.url + 'true')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'true')
        self.assertEqual(
            response.data,
            {
                "active": True,
                "userdetails": {
                    "first_name": "",
                    "last_name": "",
                    "username": "testuser",
                    "is_superuser": False,
                    "is_active": True,
                    "email": "",
                    "date_joined": datetime.datetime.strftime(
                        self.user.date_joined, "%Y-%m-%dT%H:%M:%S.%f"
                    ),
                    "pk": self.user.id,
                    "groups": {
                        "aggregations": [],
                        "metricprofiles": [],
                        "metrics": [],
                        "reports": [],
                        "thresholdsprofiles": []
                    },
                    "token": "mocked_token_ro"
                },
                "tenantdetails": {
                    "combined": True,
                    "tenants": {}
                }
            }
        )


class GetIsTenantSchemaAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.GetIsTenantSchema.as_view()
        self.url = '/api/v2/internal/istenantschema/'

    def test_get_tenant_schema(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {'isTenantSchema': True}
        )

    @patch('Poem.api.internal_views.app.connection')
    def test_get_schema_name_if_public_schema(self, args):
        args.schema_name = get_public_schema_name()
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {'isTenantSchema': False}
        )


CONFIGFILE = """
[GENERAL_ALL]
PublicPage = tenant.com
TermsOfUse = https://ui.argo.grnet.gr/egi/termsofUse/
PrivacyPolicies = https://argo.egi.eu/egi/policies/

[SUPERUSER_ALL]
Name =
Password =
Email =

[GENERAL_EGI]
Namespace = hr.cro-ngi.EGI
SamlLoginString = Login using EGI CHECK-IN
SamlServiceName = ARGO POEM EGI-CheckIN
TermsOfUse = https://ui.argo.grnet.gr/egi/termsofUse
PrivacyPolicies = https://argo.egi.eu/egi/policies
UseServiceTitles = False

[GENERAL_EOSC]
Namespace = hr.cro-ngi.EOSC
SamlLoginString = Login using EGI CHECK-IN
SamlServiceName = ARGO POEM EGI-CheckIN
TermsOfUse = https://ui.argo.grnet.gr/eosc/termsofUse
PrivacyPolicies = https://argo.egi.eu/eosc/policies
UseServiceTitles = True
"""

CONFIGFILE2 = """
[GENERAL_ALL]
PublicPage = tenant.com
TermsOfUse = https://ui.argo.grnet.gr/egi/termsofUse/
PrivacyPolicies = https://argo.egi.eu/egi/policies/

[SUPERUSER_ALL]
Name =
Password =
Email =

[GENERAL_EGI]
Namespace = hr.cro-ngi.EGI
SamlLoginString = Login using EGI CHECK-IN
SamlServiceName = ARGO POEM EGI-CheckIN
TermsOfUse = https://ui.argo.grnet.gr/egi/termsofUse
PrivacyPolicies = https://argo.egi.eu/egi/policies

[GENERAL_EOSC]
Namespace = hr.cro-ngi.EOSC
SamlLoginString = Login using EGI CHECK-IN
SamlServiceName = ARGO POEM EGI-CheckIN
TermsOfUse = https://ui.argo.grnet.gr/eosc/termsofUse
PrivacyPolicies = https://argo.egi.eu/eosc/policies
UseServiceTitles = True
"""


class ConfigTests(TenantTestCase):
    def setUp(self) -> None:
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.GetConfigOptions.as_view()
        self.url = '/api/v2/internal/config_options/'
        self.user = CustUser.objects.create(username='testuser')
        self.config_file_name = "test.conf"

    def tearDown(self) -> None:
        if os.path.isfile(self.config_file_name):
            os.remove(self.config_file_name)

    def test_get_use_service_titles_if_all_defined(self):
        with open(self.config_file_name, "w") as f:
            f.write(CONFIGFILE)

        with self.settings(CONFIG_FILE=self.config_file_name):
            self.assertFalse(get_use_service_titles("EGI"))
            self.assertTrue(get_use_service_titles("EOSC"))

    def test_get_use_service_titles_if_key_missing(self):
        with open(self.config_file_name, "w") as f:
            f.write(CONFIGFILE2)

        with self.settings(CONFIG_FILE=self.config_file_name):
            self.assertFalse(get_use_service_titles("EGI"))
            self.assertTrue(get_use_service_titles("EOSC"))
