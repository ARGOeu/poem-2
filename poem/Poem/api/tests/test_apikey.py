import datetime
from unittest.mock import patch

from Poem.api import views_internal as views
from Poem.api.models import MyAPIKey
from Poem.poem import models as poem_models
from Poem.poem_super_admin.models import WebAPIKey
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from django_tenants.utils import get_public_schema_name, schema_context, \
    get_tenant_domain_model
from rest_framework import status
from rest_framework.test import force_authenticate

from .utils_test import encode_data


def mock_db():
    with schema_context(get_public_schema_name()):
        public_tenant = Tenant.objects.create(
            name="public", schema_name=get_public_schema_name()
        )
        get_tenant_domain_model().objects.create(
            domain="public", tenant=public_tenant, is_primary=True
        )
        CustUser.objects.create_user(username="poem", is_superuser=True)
        CustUser.objects.create_user(username="test")

    superuser = CustUser.objects.create_user(
        username='testuser', is_superuser=True
    )
    user = CustUser.objects.create_user(username='regular')
    poor_user = CustUser.objects.create_user(username='poor')

    group1 = poem_models.GroupOfAggregations.objects.create(name='TEST')
    group2 = poem_models.GroupOfMetrics.objects.create(name='TEST')
    userprofile = poem_models.UserProfile.objects.create(user=user)
    userprofile.groupsofaggregations.add(group1)
    userprofile.groupsofmetrics.add(group2)

    poem_models.UserProfile.objects.create(user=superuser)
    poem_models.UserProfile.objects.create(user=poor_user)

    MyAPIKey.objects.create_key(name='EGI')
    MyAPIKey.objects.create_key(name='EUDAT')
    MyAPIKey.objects.create_key(name='DELETABLE')
    WebAPIKey.objects.create_key(name='WEB-API-TENANT')
    WebAPIKey.objects.create_key(name='WEB-API-TENANT-RO')
    WebAPIKey.objects.create_key(name='WEB-API-TENANT2')
    WebAPIKey.objects.create_key(name='WEB-API-TENANT2-RO')
    WebAPIKey.objects.create_key(name='WEB-API-TENANT3')
    WebAPIKey.objects.create_key(name='WEB-API-TENANT3-RO')
    WebAPIKey.objects.create_key(name='WEB-API-TENANT4')
    WebAPIKey.objects.create_key(name='WEB-API-TENANT4-RO')


class ListAPIKeysAPIViewTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAPIKeys.as_view()
        self.url = '/api/v2/internal/apikeys/'
        mock_db()

        self.public_tenant = Tenant.objects.get(name="public")

        with schema_context(get_public_schema_name()):
            self.superpoem_superuser = CustUser.objects.get(username="poem")
            self.superpoem_user = CustUser.objects.get(username="test")

        self.superuser = CustUser.objects.get(username='testuser')
        self.user = CustUser.objects.get(username='regular')
        self.poor_user = CustUser.objects.get(username='poor')

        key1 = MyAPIKey.objects.get(name='EGI')
        self.id1 = key1.id
        self.token1 = key1.token
        self.created1 = datetime.datetime.strftime(
            key1.created, '%Y-%m-%d %H:%M:%S'
        )

        key2 = MyAPIKey.objects.get(name='EUDAT')
        self.id2 = key2.id
        self.token2 = key2.token
        self.created2 = datetime.datetime.strftime(
            key2.created, '%Y-%m-%d %H:%M:%S'
        )

        key3 = MyAPIKey.objects.get(name='DELETABLE')
        self.id3 = key3.id
        self.token3 = key3.token
        self.created3 = datetime.datetime.strftime(
            key3.created, '%Y-%m-%d %H:%M:%S'
        )

        key4 = WebAPIKey.objects.get(name="WEB-API-TENANT")
        self.id4 = key4.id
        self.token4 = key4.token
        self.created4 = datetime.datetime.strftime(
            key4.created, "%Y-%m-%d %H:%M:%S"
        )

        key5 = WebAPIKey.objects.get(name="WEB-API-TENANT-RO")
        self.id5 = key5.id
        self.token5 = key5.token
        self.created5 = datetime.datetime.strftime(
            key5.created, "%Y-%m-%d %H:%M:%S"
        )

        key6 = WebAPIKey.objects.get(name="WEB-API-TENANT2")
        self.id6 = key6.id
        self.token6 = key6.token
        self.created6 = datetime.datetime.strftime(
            key6.created, "%Y-%m-%d %H:%M:%S"
        )

        key7 = WebAPIKey.objects.get(name="WEB-API-TENANT2-RO")
        self.id7 = key7.id
        self.token7 = key7.token
        self.created7 = datetime.datetime.strftime(
            key7.created, "%Y-%m-%d %H:%M:%S"
        )

        key8 = WebAPIKey.objects.get(name="WEB-API-TENANT3")
        self.id8 = key8.id
        self.token8 = key8.token
        self.created8 = datetime.datetime.strftime(
            key8.created, "%Y-%m-%d %H:%M:%S"
        )

        key9 = WebAPIKey.objects.get(name="WEB-API-TENANT3-RO")
        self.id9 = key9.id
        self.token9 = key9.token
        self.created9 = datetime.datetime.strftime(
            key9.created, "%Y-%m-%d %H:%M:%S"
        )

        key10 = WebAPIKey.objects.get(name="WEB-API-TENANT4")
        self.id10 = key10.id
        self.token10 = key10.token
        self.created10 = datetime.datetime.strftime(
            key10.created, "%Y-%m-%d %H:%M:%S"
        )

        key11 = WebAPIKey.objects.get(name="WEB-API-TENANT4-RO")
        self.id11 = key11.id
        self.token11 = key11.token
        self.created11 = datetime.datetime.strftime(
            key11.created, "%Y-%m-%d %H:%M:%S"
        )

    def test_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_list_of_apikeys_superpoem_superuser(self):
        request = self.factory.get(self.url)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.id3,
                    'name': 'DELETABLE',
                    'created': self.created3,
                    'revoked': False,
                    "used_by": "poem"
                },
                {
                    'id': self.id1,
                    'name': 'EGI',
                    'created': self.created1,
                    'revoked': False,
                    "used_by": "poem"
                },
                {
                    'id': self.id2,
                    'name': 'EUDAT',
                    'created': self.created2,
                    'revoked': False,
                    "used_by": "poem"
                },
                {
                    "id": self.id4,
                    "name": "WEB-API-TENANT",
                    "created": self.created4,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id5,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created5,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id6,
                    "name": "WEB-API-TENANT2",
                    "created": self.created6,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id7,
                    "name": "WEB-API-TENANT2-RO",
                    "created": self.created7,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id8,
                    "name": "WEB-API-TENANT3",
                    "created": self.created8,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id9,
                    "name": "WEB-API-TENANT3-RO",
                    "created": self.created9,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id10,
                    "name": "WEB-API-TENANT4",
                    "created": self.created10,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id11,
                    "name": "WEB-API-TENANT4-RO",
                    "created": self.created11,
                    "revoked": False,
                    "used_by": "webapi"
                }
            ]
        )

    def test_get_list_of_apikeys_superpoem_regular_user(self):
        request = self.factory.get(self.url)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view API keys"
        )

    def test_get_list_of_apikeys_tenant_superuser(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.id3,
                    'name': 'DELETABLE',
                    'created': self.created3,
                    'revoked': False,
                    "used_by": "poem"
                },
                {
                    'id': self.id1,
                    'name': 'EGI',
                    'created': self.created1,
                    'revoked': False,
                    "used_by": "poem"
                },
                {
                    'id': self.id2,
                    'name': 'EUDAT',
                    'created': self.created2,
                    'revoked': False,
                    "used_by": "poem"
                },
                {
                    "id": self.id4,
                    "name": "WEB-API-TENANT",
                    "created": self.created4,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id5,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created5,
                    "revoked": False,
                    "used_by": "webapi"
                }
            ]
        )

    def test_get_list_of_apikeys_tenant_regular_user(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.id4,
                    "name": "WEB-API-TENANT",
                    "created": self.created4,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id5,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created5,
                    "revoked": False,
                    "used_by": "webapi"
                }
            ]
        )

    def test_get_list_of_apikeys_regular_user_no_perms(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.id5,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created5,
                    "revoked": False,
                    "used_by": "webapi"
                }
            ]
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_list_of_apikeys_combined_tenant_superuser(self, mock_tenants):
        self.maxDiff = None
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        self.tenant.combined = True
        self.tenant.save()
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.id3,
                    'name': 'DELETABLE',
                    'created': self.created3,
                    'revoked': False,
                    "used_by": "poem"
                },
                {
                    'id': self.id1,
                    'name': 'EGI',
                    'created': self.created1,
                    'revoked': False,
                    "used_by": "poem"
                },
                {
                    'id': self.id2,
                    'name': 'EUDAT',
                    'created': self.created2,
                    'revoked': False,
                    "used_by": "poem"
                },
                {
                    "id": self.id4,
                    "name": "WEB-API-TENANT",
                    "created": self.created4,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id5,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created5,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id7,
                    "name": "WEB-API-TENANT2-RO",
                    "created": self.created7,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id9,
                    "name": "WEB-API-TENANT3-RO",
                    "created": self.created9,
                    "revoked": False,
                    "used_by": "webapi"
                }
            ]
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_list_of_apikeys_combined_tenant_regular_user(
            self, mock_tenants
    ):
        self.tenant.combined = True
        self.tenant.save()
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.id4,
                    "name": "WEB-API-TENANT",
                    "created": self.created4,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id5,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created5,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id7,
                    "name": "WEB-API-TENANT2-RO",
                    "created": self.created7,
                    "revoked": False,
                    "used_by": "webapi"
                },
                {
                    "id": self.id9,
                    "name": "WEB-API-TENANT3-RO",
                    "created": self.created9,
                    "revoked": False,
                    "used_by": "webapi"
                }
            ]
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_list_of_apikeys_combined_tenant_regular_user_no_perms(
            self, mock_tenants
    ):
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.id5,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created5,
                    "revoked": False,
                    "used_by": "webapi"
                }
            ]
        )

    def test_get_apikey_by_name_superpoem_superuser(self):
        request = self.factory.get(self.url + "EGI")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request, "EGI")
        self.assertEqual(
            response.data,
            {
                "id": self.id1,
                "name": "EGI",
                "token": self.token1,
                "created": self.created1,
                "revoked": False,
                "used_by": "poem"
            }
        )

    def test_get_webapikey_by_name_superpoem_superuser(self):
        request = self.factory.get(self.url + "WEB-API-TENANT")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request, "WEB-API-TENANT")
        self.assertEqual(
            response.data,
            {
                "id": self.id4,
                "name": "WEB-API-TENANT",
                "token": self.token4,
                "created": self.created4,
                "revoked": False,
                "used_by": "webapi"
            }
        )

    def test_get_nonexisting_apikey_by_name_superpoem_superuser(self):
        request = self.factory.get(self.url + "NONEXISTING")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request, "NONEXISTING")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "API key not found")

    def test_get_apikey_by_name_superpoem_regular_user(self):
        request = self.factory.get(self.url + "EGI")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request, "EGI")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view API keys"
        )

    def test_get_webapikey_by_name_superpoem_regular_user(self):
        request = self.factory.get(self.url + "WEB-API-TENANT")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request, "WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view API keys"
        )

    def test_get_nonexisting_apikey_by_name_superpoem_regular_user(self):
        request = self.factory.get(self.url + "NONEXISTING")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request, "NONEXISTING")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view API keys"
        )

    def test_get_apikey_by_name_tenant_superuser(self):
        request = self.factory.get(self.url + 'EGI')
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'EGI')
        self.assertEqual(
            response.data,
            {
                'id': self.id1,
                'name': 'EGI',
                'token': self.token1,
                'created': self.created1,
                'revoked': False,
                "used_by": "poem"
            }
        )

    def test_get_webapikey_by_name_tenant_superuser(self):
        request = self.factory.get(self.url + "WEB-API-TENANT")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "WEB-API-TENANT")
        self.assertEqual(
            response.data,
            {
                "id": self.id4,
                "name": "WEB-API-TENANT",
                "token": self.token4,
                "created": self.created4,
                "revoked": False,
                "used_by": "webapi"
            }
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_ro_combined_webapikey_by_name_combined_tenant_superuser(
            self, mock_tenants
    ):
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        self.tenant.combined = True
        self.tenant.save()
        request = self.factory.get(self.url + "WEB-API-TENANT2-RO")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "WEB-API-TENANT2-RO")
        self.assertEqual(
            response.data,
            {
                "id": self.id7,
                "name": "WEB-API-TENANT2-RO",
                "token": self.token7,
                "created": self.created7,
                "revoked": False,
                "used_by": "webapi"
            }
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_rw_combined_webapikey_by_name_combined_tenant_superuser(
            self, mock_tenants
    ):
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        self.tenant.combined = True
        self.tenant.save()
        request = self.factory.get(self.url + "WEB-API-TENANT2")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "WEB-API-TENANT2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    def test_get_other_tenant_webapikey_by_name_tenant_superuser(self):
        request = self.factory.get(self.url + "WEB-API-TENANT2")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "WEB-API-TENANT2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_other_tenant_webapikey_by_name_combined_tenant_superuser(
            self, mock_tenants
    ):
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        self.tenant.combined = True
        self.tenant.save()
        request = self.factory.get(self.url + "WEB-API-TENANT4")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "WEB-API-TENANT4")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    def test_get_nonexisting_apikey_by_name_tenant_superuser(self):
        request = self.factory.get(self.url + "NONEXISTING")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "NONEXISTING")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "API key not found")

    def test_get_apikey_by_name_tenant_regular_user(self):
        request = self.factory.get(self.url + "EGI")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "EGI")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to view requested API key'
        )

    def test_get_webapikey_by_name_tenant_regular_user(self):
        request = self.factory.get(self.url + "WEB-API-TENANT")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "WEB-API-TENANT")
        self.assertEqual(
            response.data,
            {
                "id": self.id4,
                "name": "WEB-API-TENANT",
                "token": self.token4,
                "created": self.created4,
                "revoked": False,
                "used_by": "webapi"
            }
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_ro_combined_webapikey_by_name_combined_tenant_regular_user(
            self, mock_tenants
    ):
        self.tenant.combined = True
        self.tenant.save()
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        request = self.factory.get(self.url + "WEB-API-TENANT2-RO")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "WEB-API-TENANT2-RO")
        self.assertEqual(
            response.data,
            {
                "id": self.id7,
                "name": "WEB-API-TENANT2-RO",
                "token": self.token7,
                "created": self.created7,
                "revoked": False,
                "used_by": "webapi"
            }
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_rw_combined_webapikey_by_name_combined_tenant_regular_user(
            self, mock_tenants
    ):
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        request = self.factory.get(self.url + "WEB-API-TENANT2")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "WEB-API-TENANT2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    def test_get_other_tenant_webapikey_by_name_tenant_regular_user(self):
        request = self.factory.get(self.url + "WEB-API-TENANT2")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "WEB-API-TENANT2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_other_tenant_webapikey_by_name_combined_tenant_regular_user(
            self, mock_tenants
    ):
        self.tenant.combined = True
        self.tenant.save()
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        request = self.factory.get(self.url + "WEB-API-TENANT4")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "WEB-API-TENANT4")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    def test_get_nonexisting_apikey_by_name_tenant_regular_user(self):
        request = self.factory.get(self.url + "NONEXISTING")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "NONEXISTING")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    def test_get_apikey_by_name_tenant_user_no_perms(self):
        request = self.factory.get(self.url + 'EGI')
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to view requested API key'
        )

    def test_get_rw_webapikey_by_name_tenant_user_no_perms(self):
        request = self.factory.get(self.url + "WEB-API-TENANT")
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, "WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_rw_combined_webapikey_by_name_combined_tenant_user_no_perms(
            self, mock_tenants
    ):
        self.tenant.combined = True
        self.tenant.save()
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        request = self.factory.get(self.url + "WEB-API-TENANT2")
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, "WEB-API-TENANT2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    @patch("Poem.api.internal_views.apikey.CombinedTenant.tenants")
    def test_get_ro_combined_webapikey_by_name_combined_tenant_user_no_perms(
            self, mock_tenants
    ):
        self.tenant.combined = True
        self.tenant.save()
        mock_tenants.return_value = ["TENANT2", "TENANT3"]
        request = self.factory.get(self.url + "WEB-API-TENANT2-RO")
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, "WEB-API-TENANT2-RO")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    def test_get_ro_webapikey_by_name_tenant_user_no_perms(self):
        request = self.factory.get(self.url + "WEB-API-TENANT-RO")
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, "WEB-API-TENANT-RO")
        self.assertEqual(
            response.data,
            {
                "id": self.id5,
                "name": "WEB-API-TENANT-RO",
                "token": self.token5,
                "created": self.created5,
                "revoked": False,
                "used_by": "webapi"
            }
        )

    def test_get_nonexisting_apikey_by_name_tenant_user_no_perms(self):
        request = self.factory.get(self.url + "NONEXISTING")
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, "NONEXISTING")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested API key"
        )

    def test_put_apikey_superuser(self):
        data = {
            'id': self.id1,
            'name': 'EGI2',
            'revoked': True,
            "used_by": "poem"
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        changed_entry = MyAPIKey.objects.get(id=self.id1)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual('EGI', changed_entry.name)
        self.assertTrue(changed_entry.revoked)

    def test_put_apikey_regular_user(self):
        data = {
            'id': self.id1,
            'name': 'EGI2',
            'revoked': True,
            "used_by": "poem"
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        changed_entry = MyAPIKey.objects.get(id=self.id1)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change API keys'
        )
        self.assertEqual(changed_entry.name, 'EGI')
        self.assertFalse(changed_entry.revoked)

    def test_put_webapikey_superpoem_superuser(self):
        data = {
            "id": self.id4,
            "name": "WEB-API-TENANT",
            "revoked": True,
            "used_by": "webapi"
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        changed_entry = WebAPIKey.objects.get(id=self.id4)
        self.assertEqual(changed_entry.name, "WEB-API-TENANT")
        self.assertTrue(changed_entry.revoked)

    def test_put_webapikey_superpoem_regular_user(self):
        data = {
            "id": self.id4,
            "name": "WEB-API-TENANT",
            "revoked": True,
            "used_by": "webapi"
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change API keys"
        )
        changed_entry = WebAPIKey.objects.get(id=self.id4)
        self.assertEqual(changed_entry.name, "WEB-API-TENANT")
        self.assertFalse(changed_entry.revoked)

    def test_put_webapikey_tenant_superuser(self):
        data = {
            "id": self.id4,
            "name": "WEB-API-TENANT",
            "revoked": True,
            "used_by": "webapi"
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change API keys"
        )
        changed_entry = WebAPIKey.objects.get(id=self.id4)
        self.assertEqual(changed_entry.name, "WEB-API-TENANT")
        self.assertFalse(changed_entry.revoked)

    def test_put_webapikey_tenant_regular_user(self):
        data = {
            "id": self.id4,
            "name": "WEB-API-TENANT",
            "revoked": True,
            "used_by": "webapi"
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change API keys"
        )
        changed_entry = WebAPIKey.objects.get(id=self.id4)
        self.assertEqual(changed_entry.name, "WEB-API-TENANT")
        self.assertFalse(changed_entry.revoked)

    def test_put_webapikey_tenant_no_perms_user(self):
        data = {
            "id": self.id4,
            "name": "WEB-API-TENANT",
            "revoked": True,
            "used_by": "webapi"
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change API keys"
        )
        changed_entry = WebAPIKey.objects.get(id=self.id4)
        self.assertEqual(changed_entry.name, "WEB-API-TENANT")
        self.assertFalse(changed_entry.revoked)

    def test_post_apikey_superuser(self):
        data = {'name': 'test', 'revoked': False, "used_by": "poem"}
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(MyAPIKey.objects.all()), 4)

    def test_post_apikey_regular_user(self):
        data = {'name': 'test', 'revoked': False, "used_by": "poem"}
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add API keys'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)

    def test_post_apikey_name_already_exists_superuser(self):
        data = {'name': 'EUDAT', 'revoked': False, "used_by": "poem"}
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'API key with this name already exists'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)

    def test_post_apikey_name_already_exists_regular_user(self):
        data = {'name': 'EUDAT', 'revoked': False, "used_by": "poem"}
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add API keys'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)

    def test_post_webapikey_superpoem_superuser(self):
        data = {
            "name": "WEB-API-TENANT5",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 9)
        new_key = WebAPIKey.objects.get(name="WEB-API-TENANT5")
        self.assertFalse(new_key.revoked)

    def test_post_ro_webapikey_superpoem_superuser(self):
        data = {
            "name": "WEB-API-TENANT5-RO",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 9)
        new_key = WebAPIKey.objects.get(name="WEB-API-TENANT5-RO")
        self.assertFalse(new_key.revoked)

    def test_post_webapikey_superpoem_superuser_existing_name(self):
        data = {
            "name": "WEB-API-TENANT",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"], "API key with this name already exists"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_webapikey_superpoem_superuser_wrong_name_form(self):
        data = {
            "name": "WEB-TENANT-API",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Wrong API key name - web API key name must have the form "
            "WEB-API-<tenant_name> or WEB-API-<tenant_name>-RO"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_webapikey_superpoem_regular_user(self):
        data = {
            "name": "WEB-API-TENANT5",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_ro_webapikey_superpoem_regular_user(self):
        data = {
            "name": "WEB-API-TENANT5-RO",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_webapikey_superpoem_regular_user_existing_name(self):
        data = {
            "name": "WEB-API-TENANT",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_webapikey_superpoem_regular_user_wrong_name_form(self):
        data = {
            "name": "WEB-TENANT-API",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_webapikey_tenant_superuser(self):
        data = {
            "name": "WEB-API-TENANT5",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_ro_webapikey_tenant_superuser(self):
        data = {
            "name": "WEB-API-TENANT5-RO",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_webapikey_tenant_superuser_existing_name(self):
        data = {
            "name": "WEB-API-TENANT",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_webapikey_tenant_superuser_wrong_name_form(self):
        data = {
            "name": "WEB-TENANT-API",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_webapikey_tenant_regular_user(self):
        data = {
            "name": "WEB-API-TENANT5",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_ro_webapikey_tenant_regular_user(self):
        data = {
            "name": "WEB-API-TENANT5-RO",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_webapikey_tenant_regular_user_existing_name(self):
        data = {
            "name": "WEB-API-TENANT",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_post_webapikey_tenant_regular_user_wrong_name_form(self):
        data = {
            "name": "WEB-TENANT-API",
            "revoked": False,
            "used_by": "webapi"
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add API keys"
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_delete_apikey(self):
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        request = self.factory.delete(self.url + 'poem_DELETABLE')
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'poem_DELETABLE')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 2)
        self.assertFalse('DELETABLE' in keys)

    def test_delete_apikey_regular_user(self):
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        request = self.factory.delete(self.url + 'poem_DELETABLE')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'poem_DELETABLE')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 3)
        self.assertTrue('DELETABLE' in keys)

    def test_delete_nonexisting_apikey(self):
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        request = self.factory.delete(self.url + 'poem_nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'poem_nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'API key not found')
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 3)

    def test_delete_nonexisting_apikey_regular_user(self):
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        request = self.factory.delete(self.url + 'poem_nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'poem_nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 3)

    def test_delete_no_apikey_name(self):
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        request = self.factory.delete(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'API key name must be defined'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)

    def test_delete_no_apikey_name_regular_user(self):
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        request = self.factory.delete(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)

    def test_delete_wrong_apikey_name(self):
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        request = self.factory.delete(self.url, "meh_DELETABLE")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "meh_DELETABLE")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Missing API key name prefix'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)

    def test_delete_wrong_apikey_name_regular_user(self):
        self.assertEqual(len(MyAPIKey.objects.all()), 3)
        request = self.factory.delete(self.url + "meh_DELETABLE")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "meh_DELETABLE")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)

    def test_delete_webapikey_superpoem_superuser(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + "webapi_WEB-API-TENANT")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request, "webapi_WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        keys = WebAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 7)
        self.assertFalse("WEB-API-TENANT" in keys)

    def test_delete_webapikey_superpoem_regular_user(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + "webapi_WEB-API-TENANT")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request, "webapi_WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        keys = WebAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 8)
        self.assertTrue("WEB-API-TENANT" in keys)

    def test_delete_webapikey_tenant_superuser(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + "webapi_WEB-API-TENANT")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "webapi_WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete web API keys'
        )
        keys = WebAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 8)
        self.assertTrue("WEB-API-TENANT" in keys)

    def test_delete_webapikey_tenant_regular_user(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + "webapi_WEB-API-TENANT")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "webapi_WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        keys = WebAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 8)
        self.assertTrue("WEB-API-TENANT" in keys)

    def test_delete_nonexisting_webapikey_superpoem_superuser(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + 'webapi_nonexisting')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request, 'webapi_nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'API key not found')
        keys = WebAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 8)

    def test_delete_nonexisting_webapikey_superpoem_regular_user(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + 'webapi_nonexisting')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request, 'webapi_nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        keys = WebAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 8)

    def test_delete_nonexisting_webapikey_tenant_superuser(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + 'webapi_nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'webapi_nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete web API keys'
        )
        keys = WebAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 8)

    def test_delete_nonexisting_webapikey_tenant_regular_user(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + 'webapi_nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'webapi_nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        keys = WebAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 8)

    def test_delete_no_webapikey_name_superpoem_superuser(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'API key name must be defined'
        )
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_delete_no_webapikey_name_superpoem_regular_user(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_delete_no_webapikey_name_tenant_superuser(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], "API key name must be defined"
        )
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_delete_no_webapikey_name_tenant_regular_user(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_delete_wrong_webapikey_name_superpoem_superuser(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + "meh_WEB-API-TENANT")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request, "meh_WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Missing API key name prefix'
        )
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_delete_wrong_webapikey_name_superpoem_regular_user(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + "meh_WEB-API-TENANT")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request, "meh_WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_delete_wrong_webapikey_name_tenant_superuser(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url, "meh_WEB-API-TENANT")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "meh_WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], "Missing API key name prefix"
        )
        self.assertEqual(len(WebAPIKey.objects.all()), 8)

    def test_delete_wrong_webapikey_name_tenant_regular_user(self):
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
        request = self.factory.delete(self.url + "meh_WEB-API-TENANT")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "meh_WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys'
        )
        self.assertEqual(len(WebAPIKey.objects.all()), 8)
