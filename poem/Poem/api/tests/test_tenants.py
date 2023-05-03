import datetime
from unittest.mock import patch

from Poem.api import views_internal as views
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.db import connection
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from django_tenants.utils import schema_context, get_public_schema_name, \
    get_tenant_domain_model
from rest_framework import status
from rest_framework.test import force_authenticate


def mock_tenant_resources(*args, **kwargs):
    if args[0] == 'public':
        return {'metric_templates': 354, 'probes': 111}

    elif args[0] == 'test1':
        return {'metrics': 30, 'probes': 10}

    elif args[0] == 'test2':
        return {'metrics': 50, 'probes': 30}

    elif args[0] == "combined":
        return { "metrics": 6, "probes": 6 }

    else:
        return {'metrics': 24, 'probes': 15}


class ListTenantsTests(TenantTestCase):
    def setUp(self) -> None:
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListTenants.as_view()
        self.url = '/api/v2/internal/tenants/'
        self.user = CustUser.objects.create_user(username='testuser')

        with schema_context(get_public_schema_name()):
            self.tenant1 = Tenant(name='TEST1', schema_name='test1')
            self.tenant1.auto_create_schema = False

            self.tenant2 = Tenant(name='TEST2', schema_name='test2')
            self.tenant2.auto_create_schema = False

            self.tenant3 = Tenant(
                name='all', schema_name=get_public_schema_name(),
            )
            self.tenant3.auto_create_schema = False

            self.tenant4 = Tenant(
                name="COMBINED", schema_name="combined", combined=True
            )
            self.tenant4.auto_create_schema = False

            self.tenant1.save()
            self.tenant2.save()
            self.tenant3.save()
            self.tenant4.save()

            get_tenant_domain_model().objects.create(
                domain='test1.domain.url', tenant=self.tenant1, is_primary=True
            )
            get_tenant_domain_model().objects.create(
                domain='test2.domain.url', tenant=self.tenant2, is_primary=True
            )
            get_tenant_domain_model().objects.create(
                domain='domain.url', tenant=self.tenant3, is_primary=True
            )
            get_tenant_domain_model().objects.create(
                domain="combined.domain.url", tenant=self.tenant4,
                is_primary=True
            )

            self.supertenant_superuser = CustUser.objects.create_user(
                username='poem', is_superuser=True
            )
            self.supertenant_user = CustUser.objects.create_user(username='meh')

    def test_get_tenants_no_auth(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("Poem.api.internal_views.tenants.CombinedTenant.tenants")
    @patch('Poem.api.internal_views.tenants.get_tenant_resources')
    def test_get_all_tenants(self, mock_resources, mock_tenants):
        mock_resources.side_effect = mock_tenant_resources
        mock_tenants.return_value = ["TEST1", "TEST2"]
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(mock_resources.call_count, 5)
        self.assertEqual(
            response.data,
            [
                {
                    'name': self.tenant.name,
                    'schema_name': self.tenant.schema_name,
                    'domain_url': 'tenant.test.com',
                    'created_on': datetime.date.strftime(
                        self.tenant.created_on, '%Y-%m-%d'
                    ),
                    'nr_metrics': 24,
                    'nr_probes': 15,
                    "combined": False
                },
                {
                    "name": self.tenant4.name,
                    "schema_name": self.tenant4.schema_name,
                    "domain_url": "combined.domain.url",
                    "created_on": datetime.date.strftime(
                        self.tenant4.created_on, "%Y-%m-%d"
                    ),
                    "nr_metrics": 6,
                    "nr_probes": 6,
                    "combined": True,
                    "combined_from": ["TEST1", "TEST2"]
                },
                {
                    'name': 'SuperPOEM Tenant',
                    'schema_name': get_public_schema_name(),
                    'domain_url': 'domain.url',
                    'created_on': datetime.date.strftime(
                        self.tenant3.created_on, '%Y-%m-%d'
                    ),
                    'nr_metrics': 354,
                    'nr_probes': 111,
                    "combined": False
                },
                {
                    'name': 'TEST1',
                    'domain_url': 'test1.domain.url',
                    'schema_name': 'test1',
                    'created_on': datetime.date.strftime(
                        self.tenant1.created_on, '%Y-%m-%d'
                    ),
                    'nr_metrics': 30,
                    'nr_probes': 10,
                    "combined": False
                },
                {
                    'name': 'TEST2',
                    'domain_url': 'test2.domain.url',
                    'schema_name': 'test2',
                    'created_on': datetime.date.strftime(
                        self.tenant2.created_on, '%Y-%m-%d'
                    ),
                    'nr_metrics': 50,
                    'nr_probes': 30,
                    "combined": False
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
                'nr_probes': 15,
                "combined": False
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
                'nr_probes': 112,
                "combined": False
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

    def test_delete_tenant(self):
        self.assertEqual(Tenant.objects.all().count(), 5)
        request = self.factory.delete(self.url + 'TEST1')
        request.tenant = self.tenant3
        connection.set_schema_to_public()
        force_authenticate(request, user=self.supertenant_superuser)
        response = self.view(request, 'TEST1')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Tenant.objects.all().count(), 4)
        self.assertRaises(
            Tenant.DoesNotExist,
            Tenant.objects.get,
            name='TEST1'
        )

    def test_delete_tenant_when_not_public_schema(self):
        self.assertEqual(Tenant.objects.all().count(), 5)
        request = self.factory.delete(self.url + 'TEST1')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'TEST1')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data['detail'],
            'Cannot delete tenant outside public schema.'
        )
        self.assertEqual(Tenant.objects.all().count(), 5)

    def test_delete_tenant_when_not_superuser(self):
        self.assertEqual(Tenant.objects.all().count(), 5)
        request = self.factory.delete(self.url + 'TEST1')
        request.tenant = self.tenant3
        force_authenticate(request, user=self.supertenant_user)
        response = self.view(request, 'TEST1')
        self.assertEqual(Tenant.objects.all().count(), 5)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete tenants.'
        )

    def test_delete_tenant_without_name(self):
        self.assertEqual(Tenant.objects.all().count(), 5)
        request = self.factory.delete(self.url)
        request.tenant = self.tenant3
        force_authenticate(request, user=self.supertenant_superuser)
        response = self.view(request)
        self.assertEqual(Tenant.objects.all().count(), 5)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Tenant name should be specified.'
        )

    def test_delete_nonexisting_tenant(self):
        self.assertEqual(Tenant.objects.all().count(), 5)
        request = self.factory.delete(self.url + 'nonexisting')
        request.tenant = self.tenant3
        force_authenticate(request, user=self.supertenant_superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(Tenant.objects.all().count(), 5)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Tenant not found.')
