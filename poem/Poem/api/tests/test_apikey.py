import datetime

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

    def test_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_list_of_apikeys(self):
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
                    'revoked': False
                },
                {
                    'id': self.id1,
                    'name': 'EGI',
                    'created': self.created1,
                    'revoked': False
                },
                {
                    'id': self.id2,
                    'name': 'EUDAT',
                    'created': self.created2,
                    'revoked': False
                }
            ]
        )

    def test_get_list_of_apikeys_regular_user_with_some_permissions(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.data, [])

    def test_get_list_of_apikeys_regular_user_with_no_permissions(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request)
        self.assertEqual(response.data, [])

    def test_get_apikey_for_given_name(self):
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
                'revoked': False
            }
        )

    def test_get_apikey_for_given_name_regular_user(self):
        request = self.factory.get(self.url + 'EGI')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission for fetching this API key.'
        )

    def test_get_apikey_for_given_name_regular_user_without_permissions(self):
        request = self.factory.get(self.url + 'EGI')
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission for fetching this API key.'
        )

    def test_put_apikey(self):
        data = {'id': self.id1, 'name': 'EGI2', 'revoked': False}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        changed_entry = MyAPIKey.objects.get(id=self.id1)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual('EGI2', changed_entry.name)

    def test_put_apikey_regular_user(self):
        data = {'id': self.id1, 'name': 'EGI2', 'revoked': False}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        changed_entry = MyAPIKey.objects.get(id=self.id1)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change API keys.'
        )
        self.assertEqual(changed_entry.name, 'EGI')
        self.assertFalse(changed_entry.revoked)

    def test_put_apikey_without_changing_name(self):
        data = {'id': self.id1, 'name': 'EGI', 'revoked': True}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        key = MyAPIKey.objects.get(id=self.id1)
        self.assertEqual(key.name, 'EGI')
        self.assertTrue(key.revoked)

    def test_put_apikey_without_changing_name_regular_user(self):
        data = {'id': self.id1, 'name': 'EGI', 'revoked': True}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change API keys.'
        )
        key = MyAPIKey.objects.get(id=self.id1)
        self.assertEqual(key.name, 'EGI')
        self.assertFalse(key.revoked)

    def test_put_apikey_with_name_that_already_exists(self):
        data = {'id': self.id1, 'name': 'EUDAT', 'revoked': False}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'API key with this name already exists'
        )

    def test_put_apikey_with_name_that_already_exists_regular_user(self):
        data = {'id': self.id1, 'name': 'EUDAT', 'revoked': False}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change API keys.'
        )

    def test_post_apikey(self):
        data = {'name': 'test', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(MyAPIKey.objects.all()), 4)

    def test_post_apikey_regular_user(self):
        data = {'name': 'test', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add API keys.'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)

    def test_post_apikey_name_already_exists(self):
        data = {'name': 'EUDAT', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'API key with this name already exists'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)

    def test_post_apikey_name_already_exists_regular_user(self):
        data = {'name': 'EUDAT', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add API keys.'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 3)

    def test_delete_apikey(self):
        request = self.factory.delete(self.url + 'DELETABLE')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'DELETABLE')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 2)
        self.assertFalse('DELETABLE' in keys)

    def test_delete_apikey_regular_user(self):
        request = self.factory.delete(self.url + 'DELETABLE')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'DELETABLE')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys.'
        )
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 3)
        self.assertTrue('DELETABLE' in keys)

    def test_delete_nonexisting_apikey(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'API key not found')
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 3)

    def test_delete_nonexisting_apikey_regular_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys.'
        )
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 3)

    def test_delete_no_apikey_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'API key name must be defined'
        )

    def test_delete_no_apikey_name_regular_user(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys.'
        )


class ListWebAPIKeysViewTests(TenantTestCase):
    def setUp(self) -> None:
        self.tenant.name = "TENANT"
        self.tenant.save()
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListWebAPIKeys.as_view()
        self.url = "/api/v2/internal/webapikeys/"
        mock_db()

        self.public_tenant = Tenant.objects.get(name="public")
        with schema_context(get_public_schema_name()):
            self.superpoem_superuser = CustUser.objects.get(username="poem")
            self.superpoem_user = CustUser.objects.get(username="test")

        self.superuser = CustUser.objects.get(
            username='testuser', is_superuser=True
        )
        self.user = CustUser.objects.get(username='regular')
        self.poor_user = CustUser.objects.get(username='poor')

        key1 = WebAPIKey.objects.get(name='WEB-API-TENANT')
        self.id1 = key1.id
        self.token1 = key1.token
        self.created1 = datetime.datetime.strftime(
            key1.created, '%Y-%m-%d %H:%M:%S'
        )

        key2 = WebAPIKey.objects.get(name='WEB-API-TENANT-RO')
        self.id2 = key2.id
        self.token2 = key2.token
        self.created2 = datetime.datetime.strftime(
            key2.created, '%Y-%m-%d %H:%M:%S'
        )

        key3 = WebAPIKey.objects.get(name='WEB-API-TENANT2')
        self.id3 = key3.id
        self.token3 = key3.token
        self.created3 = datetime.datetime.strftime(
            key3.created, '%Y-%m-%d %H:%M:%S'
        )

        key4 = WebAPIKey.objects.get(name='WEB-API-TENANT2-RO')
        self.id4 = key4.id
        self.token4 = key4.token
        self.created4 = datetime.datetime.strftime(
            key4.created, '%Y-%m-%d %H:%M:%S'
        )

    def test_get_list_of_webapikeys_superpoem_superuser(self):
        request = self.factory.get(self.url)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.id1,
                    "name": "WEB-API-TENANT",
                    "created": self.created1,
                    "revoked": False
                },
                {
                    "id": self.id3,
                    "name": "WEB-API-TENANT2",
                    "created": self.created3,
                    "revoked": False
                },
                {
                    "id": self.id4,
                    "name": "WEB-API-TENANT2-RO",
                    "created": self.created4,
                    "revoked": False
                },
                {
                    "id": self.id2,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created2,
                    "revoked": False
                }
            ]
        )

    def test_get_list_of_webapikeys_superpoem_regular_user(self):
        request = self.factory.get(self.url)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view Web API keys"
        )

    def test_get_list_of_webapikeys_tenant_superuser(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data, [
                {
                    "id": self.id1,
                    "name": "WEB-API-TENANT",
                    "created": self.created1,
                    "revoked": False
                },
                {
                    "id": self.id2,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created2,
                    "revoked": False
                },
            ]
        )

    def test_get_list_of_webapikeys_tenant_regular_user(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data, [
                {
                    "id": self.id1,
                    "name": "WEB-API-TENANT",
                    "created": self.created1,
                    "revoked": False
                },
                {
                    "id": self.id2,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created2,
                    "revoked": False
                }
            ]
        )

    def test_get_list_of_webapikeys_tenant_user_no_perm(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request)
        self.assertEqual(
            response.data, [
                {
                    "id": self.id2,
                    "name": "WEB-API-TENANT-RO",
                    "created": self.created2,
                    "revoked": False
                }
            ]
        )

    def test_get_webapikey_name_superpoem_superuser(self):
        request = self.factory.get(self.url + "WEB-API-TENANT")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_superuser)
        response = self.view(request, "WEB-API-TENANT")
        self.assertEqual(
            response.data,
            {
                'id': self.id1,
                'name': 'WEB-API-TENANT',
                'token': self.token1,
                'created': self.created1,
                'revoked': False
            }
        )

    def test_get_webapikey_name_superpoem_regular_user(self):
        request = self.factory.get(self.url + "WEB-API-TENANT")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superpoem_user)
        response = self.view(request, "WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view Web API keys"
        )

    def test_get_webapikey_name_tenant_superuser(self):
        request = self.factory.get(self.url + "WEB-API-TENANT")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "WEB-API-TENANT")
        self.assertEqual(
            response.data,
            {
                'id': self.id1,
                'name': 'WEB-API-TENANT',
                'token': self.token1,
                'created': self.created1,
                'revoked': False
            }
        )

    def test_get_webapikey_name_tenant_superuser_wrong_tenant_name(self):
        request = self.factory.get(self.url + "WEB-API-TENANT2")
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "WEB-API-TENANT2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested Web API key"
        )

    def test_get_webapikey_tenant_user(self):
        request = self.factory.get(self.url + "WEB-API-TENANT")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "WEB-API-TENANT")
        self.assertEqual(
            response.data,
            {
                'id': self.id1,
                'name': 'WEB-API-TENANT',
                'token': self.token1,
                'created': self.created1,
                'revoked': False
            }
        )

    def test_get_webapikey_tenant_user_another_tenant_key(self):
        request = self.factory.get(self.url + "WEB-API-TENANT2")
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "WEB-API-TENANT2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested Web API key"
        )

    def test_get_webapikey_tenant_poor_user_rw_key(self):
        request = self.factory.get(self.url + "WEB-API-TENANT")
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, "WEB-API-TENANT")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested Web API key"
        )

    def test_get_webapikey_tenant_poor_user_ro_key(self):
        request = self.factory.get(self.url + "WEB-API-TENANT-RO")
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, "WEB-API-TENANT-RO")
        self.assertEqual(
            response.data,
            {
                "id": self.id2,
                "name": "WEB-API-TENANT-RO",
                "token": self.token2,
                "created": self.created2,
                "revoked": False
            }
        )

    def test_get_webapikey_tenant_poor_user_other_tenant_key(self):
        request = self.factory.get(self.url + "WEB-API-TENANT2")
        request.tenant = self.tenant
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, "WEB-API-TENANT2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view requested Web API key"
        )
