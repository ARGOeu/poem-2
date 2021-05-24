from collections import OrderedDict
from unittest.mock import patch

import pkg_resources
from Poem.api import views_internal as views
from Poem.api.models import MyAPIKey
from Poem.poem import models as poem_models
from Poem.users.models import CustUser
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory
from tenant_schemas.utils import get_public_schema_name


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

    @patch('Poem.api.internal_views.app.saml_login_string',
           return_value='Log in using B2ACCESS')
    @patch('Poem.api.internal_views.app.tenant_from_request',
           return_value='Tenant')
    def test_get_config_options(self, *args):
        with self.settings(
                WEBAPI_METRIC='https://metric.profile.com',
                WEBAPI_AGGREGATION='https://aggregations.com',
                WEBAPI_THRESHOLDS='https://thresholds.com',
                WEBAPI_OPERATIONS='https://operations.com',
                WEBAPI_REPORTS='https://reports.com',
                WEBAPI_REPORTSTAGS='https://reports-tags.com',
                WEBAPI_REPORTSTOPOLOGYGROUPS='https://topology-groups.com',
                WEBAPI_REPORTSTOPOLOGYENDPOINTS='https://endpoints.com'
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
                        'tenant_name': 'Tenant'
                    }
                }
            )


class GetSessionDetailsAPIViewTests(TenantTestCase):
    def setUp(self):
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
        MyAPIKey.objects.create(
            id=1,
            name='WEB-API',
            prefix='foo',
            token='mocked_token_rw'
        )
        MyAPIKey.objects.create(
            id=2,
            name='WEB-API-RO',
            token='mocked_token_ro',
            prefix='bar'
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
        force_authenticate(request, user=self.user)
        response = self.view(request, 'true')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['active'])
        self.assertFalse(response.data['userdetails']['is_superuser'])
        self.assertEqual(response.data['userdetails']['username'], 'testuser')
        self.assertEqual(response.data['userdetails']['groups'], OrderedDict([
            ('aggregations', ['GROUP-aggregations']),
            ('metricprofiles', ['GROUP-metricprofiles']),
            ('metrics', ['GROUP-metrics']),
            ('reports', ['GROUP-reports']),
            ('thresholdsprofiles', ['GROUP-thresholds'])]
        ))
        self.assertEqual(
            response.data['userdetails']['token'], 'mocked_token_rw'
        )

    def test_auth_readonly(self):
        request = self.factory.get(self.url + 'true')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'true')
        self.assertEqual(
            response.data['userdetails']['token'], 'mocked_token_ro'
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
