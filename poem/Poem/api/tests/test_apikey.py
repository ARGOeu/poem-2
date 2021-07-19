import datetime

from Poem.api import views_internal as views
from Poem.api.models import MyAPIKey
from Poem.poem import models as poem_models
from Poem.users.models import CustUser
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from rest_framework import status
from rest_framework.test import force_authenticate

from .utils_test import encode_data


class ListAPIKeysAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAPIKeys.as_view()
        self.url = '/api/v2/internal/apikeys/'
        self.user = CustUser.objects.create_user(
            username='testuser', is_superuser=True
        )
        self.regular_user = CustUser.objects.create_user(username='regular')
        self.poor_user = CustUser.objects.create_user(username='poor')

        group1 = poem_models.GroupOfAggregations.objects.create(name='TEST')
        group2 = poem_models.GroupOfMetrics.objects.create(name='TEST')
        userprofile = poem_models.UserProfile.objects.create(
            user=self.regular_user
        )
        userprofile.groupsofaggregations.add(group1)
        userprofile.groupsofmetrics.add(group2)

        poem_models.UserProfile.objects.create(user=self.user)
        poem_models.UserProfile.objects.create(user=self.poor_user)

        key1, k1 = MyAPIKey.objects.create_key(name='EGI')
        self.id1 = key1.id
        self.token1 = key1.token
        self.created1 = datetime.datetime.strftime(
            key1.created, '%Y-%m-%d %H:%M:%S'
        )
        key2, k2 = MyAPIKey.objects.create_key(name='EUDAT')
        self.id2 = key2.id
        self.token2 = key2.token
        self.created2 = datetime.datetime.strftime(
            key2.created, '%Y-%m-%d %H:%M:%S'
        )
        key3, k3 = MyAPIKey.objects.create_key(name='DELETABLE')
        self.id3 = key3.id
        self.token3 = key3.token
        self.created3 = datetime.datetime.strftime(
            key3.created, '%Y-%m-%d %H:%M:%S'
        )

        key4, k4 = MyAPIKey.objects.create_key(name='WEB-API')
        self.id4 = key4.id
        self.token4 = key4.token
        self.created4 = datetime.datetime.strftime(
            key4.created, '%Y-%m-%d %H:%M:%S'
        )

        key5, k5 = MyAPIKey.objects.create_key(name='WEB-API-RO')
        self.id5 = key5.id
        self.token5 = key5.token
        self.created5 = datetime.datetime.strftime(
            key5.created, '%Y-%m-%d %H:%M:%S'
        )

    def test_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_list_of_apikeys(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
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
                },
                {
                    'id': self.id4,
                    'name': 'WEB-API',
                    'created': self.created4,
                    'revoked': False
                },
                {
                    'id': self.id5,
                    'name': 'WEB-API-RO',
                    'created': self.created5,
                    'revoked': False
                }
            ]
        )

    def test_get_list_of_apikeys_regular_user_with_some_permissions(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.id4,
                    'name': 'WEB-API',
                    'created': self.created4,
                    'revoked': False
                },
                {
                    'id': self.id5,
                    'name': 'WEB-API-RO',
                    'created': self.created5,
                    'revoked': False
                }
            ]
        )

    def test_get_list_of_apikeys_regular_user_with_no_permissions(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.poor_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.id4,
                    'name': 'WEB-API',
                    'created': self.created4,
                    'revoked': False
                },
                {
                    'id': self.id5,
                    'name': 'WEB-API-RO',
                    'created': self.created5,
                    'revoked': False
                }
            ]
        )

    def test_get_apikey_for_given_name(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
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
        force_authenticate(request, user=self.regular_user)
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission for fetching this API key.'
        )

    def test_get_apikey_for_given_name_regular_user_without_permissions(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission for fetching this API key.'
        )

    def test_get_apikey_for_webapi_name_regular_user(self):
        request = self.factory.get(self.url + 'WEB-API')
        force_authenticate(request, user=self.regular_user)
        response = self.view(request, 'WEB-API')
        self.assertEqual(
            response.data,
            {
                'id': self.id4,
                'name': 'WEB-API',
                'token': self.token4,
                'created': self.created4,
                'revoked': False
            }
        )

    def test_get_apikey_for_webapi_name_regular_user_without_permissions(self):
        request = self.factory.get(self.url + 'WEB-API')
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, 'WEB-API')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission for fetching this API key.'
        )

    def test_get_apikey_for_webapi_ro_name_regular_user_without_perms(self):
        request = self.factory.get(self.url + 'WEB-API-RO')
        force_authenticate(request, user=self.poor_user)
        response = self.view(request, 'WEB-API-RO')
        self.assertEqual(
            response.data,
            {
                'id': self.id5,
                'name': 'WEB-API-RO',
                'token': self.token5,
                'created': self.created5,
                'revoked': False
            }
        )

    def test_put_apikey(self):
        data = {'id': self.id1, 'name': 'EGI2', 'revoked': False}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        changed_entry = MyAPIKey.objects.get(id=self.id1)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual('EGI2', changed_entry.name)

    def test_put_apikey_regular_user(self):
        data = {'id': self.id1, 'name': 'EGI2', 'revoked': False}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.regular_user)
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
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        key = MyAPIKey.objects.get(id=self.id1)
        self.assertEqual(key.name, 'EGI')
        self.assertTrue(key.revoked)

    def test_put_apikey_without_changing_name_regular_user(self):
        data = {'id': self.id1, 'name': 'EGI', 'revoked': True}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.regular_user)
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
        force_authenticate(request, user=self.user)
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
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change API keys.'
        )

    def test_post_apikey(self):
        data = {'name': 'test', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(MyAPIKey.objects.all()), 6)

    def test_post_apikey_regular_user(self):
        data = {'name': 'test', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add API keys.'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 5)

    def test_post_apikey_name_already_exists(self):
        data = {'name': 'EUDAT', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'API key with this name already exists'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 5)

    def test_post_apikey_name_already_exists_regular_user(self):
        data = {'name': 'EUDAT', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add API keys.'
        )
        self.assertEqual(len(MyAPIKey.objects.all()), 5)

    def test_delete_apikey(self):
        request = self.factory.delete(self.url + 'DELETABLE')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'DELETABLE')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 4)
        self.assertFalse('DELETABLE' in keys)

    def test_delete_apikey_regular_user(self):
        request = self.factory.delete(self.url + 'DELETABLE')
        force_authenticate(request, user=self.regular_user)
        response = self.view(request, 'DELETABLE')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys.'
        )
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 5)
        self.assertTrue('DELETABLE' in keys)

    def test_delete_nonexisting_apikey(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'API key not found')
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 5)

    def test_delete_nonexisting_apikey_regular_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.regular_user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys.'
        )
        keys = MyAPIKey.objects.all().values_list('name', flat=True)
        self.assertEqual(len(keys), 5)

    def test_delete_no_apikey_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'API key name must be defined'
        )

    def test_delete_no_apikey_name_regular_user(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete API keys.'
        )
