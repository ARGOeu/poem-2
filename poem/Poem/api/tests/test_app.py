from unittest.mock import patch

import pkg_resources
from Poem.api import views_internal as views
from Poem.poem import models as poem_models
from Poem.users.models import CustUser
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory


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

        userprofile = poem_models.UserProfile.objects.create(user=self.user)
        userprofile.groupsofmetrics.add(gm1)
        userprofile.groupsofmetricprofiles.add(gmp1)
        userprofile.groupsofaggregations.add(ga1)
        userprofile.groupsofthresholdsprofiles.add(gtp1)

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
        with self.settings(WEBAPI_METRIC='https://metric.profile.com',
                           WEBAPI_AGGREGATION='https://aggregations.com',
                           WEBAPI_THRESHOLDS='https://thresholds.com',
                           WEBAPI_OPERATIONS='https://operations.com',
                           WEBAPI_REPORTS='https://reports.com'):
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
                        'version': pkg_resources.get_distribution('poem').version,
                        'webapireports': 'https://reports.com',
                        'tenant_name': 'Tenant'
                    }
                }
            )
