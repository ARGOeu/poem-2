from rest_framework.test import force_authenticate
from rest_framework import status

from rest_framework_api_key.models import APIKey

from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from Poem.poem.models import *
from Poem.api import views_internal as views


class ListMetricsInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricsInGroup.as_view()
        self.url = '/api/v2/internal/metrics/EOSC'
        self.user = CustUser.objects.create(username='testuser')

        metric1 = Metrics.objects.create(name='org.apel.APEL-Pub')
        metric2 = Metrics.objects.create(name='org.apel.APEL-Sync')

        group1 = GroupOfMetrics.objects.create(name='EOSC')
        group1.metrics.create(name=metric1.name)
        group1.metrics.create(name=metric2.name)

        GroupOfMetrics.objects.create(name='Empty_group')

    def test_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_status_code_in_case_nonexisting_site(self):
        url = '/api/v2/internal/metrics/fake_group'
        request = self.factory.get(url)
        force_authenticate(request, user=self.user)
        response = self.view(request, 'fake_group')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_metrics_in_group_for_a_given_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EOSC')
        self.assertEqual(
            response.data,
            {
                'result': ['org.apel.APEL-Pub', 'org.apel.APEL-Sync']
            }
        )

    def test_get_metrics_in_group_if_empty_group(self):
        url = '/api/v2/internal/metrics/Empty_group'
        request = self.factory.get(url)
        force_authenticate(request, user=self.user)
        response = self.view(request, 'Empty_group')
        self.assertEqual(response.data, {'result': []})


class ListTokensAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListTokens.as_view()
        self.url = '/api/v2/internal/tokens/'
        self.user = CustUser.objects.create(username='testuser')

        key1 = APIKey.objects.create(client_id='EGI')
        self.token1 = key1.token
        key2 = APIKey.objects.create(client_id='EUDAT')
        self.token2 = key2.token

    def test_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_get_list_of_tokens(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        # Those created later are listed first
        self.assertEqual(
            response.data,
            [
                {'name': 'EUDAT',
                 'token': self.token2},
                {'name': 'EGI',
                 'token': self.token1}
            ]
        )


class ListTokenForTenantAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListTokenForTenant.as_view()
        self.url_base = '/api/v2/internal/tokens/'
        self.user = CustUser.objects.create(username='testuser')

        tenant1 = APIKey.objects.create(client_id='EGI')
        self.token1 = tenant1.token
        tenant2 = APIKey.objects.create(client_id='EUDAT')
        self.token2 = tenant2.token

    def test_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url_base + 'EGI')
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_token_for_a_given_tenant(self):
        request1 = self.factory.get(self.url_base + 'EGI')
        request2 = self.factory.get(self.url_base + 'EUDAT')
        force_authenticate(request1, user=self.user)
        force_authenticate(request2, user=self.user)
        response1 = self.view(request1, 'EGI')
        response2 = self.view(request2, 'EUDAT')
        self.assertEqual(response1.data, self.token1)
        self.assertEqual(response2.data, self.token2)

    def test_get_token_in_case_tenant_is_nonexistent(self):
        request = self.factory.get(self.url_base + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Tenant not found'})


class ListUsersAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListUsers.as_view()
        self.url = '/api/v2/internal/users/'
        self.user = CustUser.objects.create_user(
            username='testuser',
            first_name='Test',
            last_name='User',
            email='testuser@example.com'
        )

        CustUser.objects.create_user(
            username='another_user',
            first_name='Another',
            last_name='User',
            email='otheruser@example.com'
        )

    def test_get_users(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.data, {'result': ['another_user',
                                                    'testuser']})

    def test_get_users_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ListProbesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListProbes.as_view()
        self.url_base = '/api/v2/internal/probes/'
        self.user = CustUser.objects.create(username='testuser')

        Probe.objects.create(
            name='ams-probe',
            version='0.1.7',
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            group='ARGOTEST'
        )

    def test_get_probe(self):
        request = self.factory.get(self.url_base + 'ams-probe')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ams-probe')
        self.assertEqual(
            response.data,
            {
                'id': 1,
                'name': 'ams-probe',
                'description': 'Probe is inspecting AMS service by trying to '
                               'publish and consume randomly generated '
                               'messages.',
                'comment': 'Initial version.'
            }
        )

    def test_get_probe_permission_denied_in_case_of_no_authorization(self):
        request = self.factory.get(self.url_base + 'ams-probe')
        response = self.view(request, 'ams-probe')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_probe_empty_dict_in_case_of_nonexisting_probe(self):
        request = self.factory.get(self.url_base + 'nonexisting_probe')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting_probe')
        self.assertEqual(response.data, {})
