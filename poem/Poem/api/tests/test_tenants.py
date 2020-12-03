import datetime
from unittest.mock import patch

from Poem.api import views_internal as views
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from rest_framework import status
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory
from tenant_schemas.utils import schema_context, get_public_schema_name


def mock_tenant_resources(*args, **kwargs):
    if args[0] == 'public':
        return {'metric_templates': 354, 'probes': 111}

    elif args[0] == 'test1':
        return {'metrics': 30, 'probes': 10}

    elif args[0] == 'test2':
        return {'metrics': 50, 'probes': 30}

    else:
        return {'metrics': 24, 'probes': 15}


class ListTenantsTests(TenantTestCase):
    def setUp(self) -> None:
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListTenants.as_view()
        self.url = '/api/v2/internal/tenants/'
        self.user = CustUser.objects.create_user(username='testuser')

        with schema_context(get_public_schema_name()):
            self.tenant1 = Tenant(
                name='TEST1', schema_name='test1',
                domain_url='test1.domain.url'
            )
            self.tenant1.auto_create_schema = False

            self.tenant2 = Tenant(
                name='TEST2', schema_name='test2',
                domain_url='test2.domain.url'
            )
            self.tenant2.auto_create_schema = False

            self.tenant3 = Tenant(
                name='all', schema_name=get_public_schema_name(),
                domain_url='domain.url'
            )
            self.tenant3.auto_create_schema = False

            self.tenant1.save()
            self.tenant2.save()
            self.tenant3.save()

    def test_get_tenants_no_auth(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('Poem.api.internal_views.tenants.get_tenant_resources')
    def test_get_all_tenants(self, mock_resources):
        mock_resources.side_effect = mock_tenant_resources
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(mock_resources.call_count, 4)
        self.assertEqual(
            response.data,
            [
                {
                    'name': self.tenant.name,
                    'schema_name': self.tenant.schema_name,
                    'domain_url': self.tenant.domain_url,
                    'created_on': datetime.date.strftime(
                        self.tenant.created_on, '%Y-%m-%d'
                    ),
                    'nr_metrics': 24,
                    'nr_probes': 15
                },
                {
                    'name': 'SuperPOEM Tenant',
                    'schema_name': get_public_schema_name(),
                    'domain_url': 'domain.url',
                    'created_on': datetime.date.strftime(
                        self.tenant3.created_on, '%Y-%m-%d'
                    ),
                    'nr_metrics': 354,
                    'nr_probes': 111
                },
                {
                    'name': 'TEST1',
                    'domain_url': 'test1.domain.url',
                    'schema_name': 'test1',
                    'created_on': datetime.date.strftime(
                        self.tenant1.created_on, '%Y-%m-%d'
                    ),
                    'nr_metrics': 30,
                    'nr_probes': 10
                },
                {
                    'name': 'TEST2',
                    'domain_url': 'test2.domain.url',
                    'schema_name': 'test2',
                    'created_on': datetime.date.strftime(
                        self.tenant2.created_on, '%Y-%m-%d'
                    ),
                    'nr_metrics': 50,
                    'nr_probes': 30
                }
            ]
        )

    @patch('Poem.api.internal_views.tenants.get_tenant_resources')
    def test_get_tenant_by_name(self, mock_resources):
        mock_resources.return_value = {'metrics': 24, 'probes': 15}
        request = self.factory.get(self.url + 'TEST1')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'TEST1')
        self.assertEqual(
            response.data,
            {
                'name': 'TEST1',
                'domain_url': 'test1.domain.url',
                'schema_name': 'test1',
                'created_on': datetime.date.strftime(
                    self.tenant1.created_on, '%Y-%m-%d'
                ),
                'nr_metrics': 24,
                'nr_probes': 15
            }
        )
        mock_resources.assert_called_once_with('test1')

    @patch('Poem.api.internal_views.tenants.get_tenant_resources')
    def test_get_public_schema_tenant_by_name(self, mock_resources):
        mock_resources.return_value = {'metric_templates': 354, 'probes': 112}
        request = self.factory.get(self.url + 'SuperPOEM_Tenant')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'SuperPOEM_Tenant')
        self.assertEqual(
            response.data,
            {
                'name': 'SuperPOEM Tenant',
                'domain_url': 'domain.url',
                'schema_name': get_public_schema_name(),
                'created_on': datetime.date.strftime(
                    self.tenant1.created_on, '%Y-%m-%d'
                ),
                'nr_metrics': 354,
                'nr_probes': 112
            }
        )
        mock_resources.assert_called_once_with(get_public_schema_name())

    @patch('Poem.api.internal_views.tenants.get_tenant_resources')
    def test_get_tenant_by_nonexisting_name(self, mock_resources):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Tenant not found.')
        self.assertFalse(mock_resources.called)
