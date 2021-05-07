import datetime
from collections import OrderedDict

from Poem.api import views_internal as views
from Poem.poem import models as poem_models
from Poem.users.models import CustUser
from rest_framework import status
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from .utils_test import encode_data
from tenant_schemas.utils import schema_context, get_public_schema_name
from Poem.tenants.models import Tenant


class ListUsersAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListUsers.as_view()
        self.url = '/api/v2/internal/users/'
        self.tenant_user1 = CustUser.objects.create_user(
            username='testuser',
            first_name='Test',
            last_name='User',
            email='testuser@example.com',
            date_joined=datetime.datetime(2015, 1, 1, 0, 0, 0),
        )

        self.tenant_user2 = CustUser.objects.create_user(
            username='another_user',
            first_name='Another',
            last_name='User',
            email='otheruser@example.com',
            is_superuser=True,
            date_joined=datetime.datetime(2015, 1, 2, 0, 0, 0)
        )

        poem_models.UserProfile.objects.create(user=self.tenant_user1)
        poem_models.UserProfile.objects.create(user=self.tenant_user2)

        with schema_context(get_public_schema_name()):
            self.super_tenant = Tenant.objects.create(
                name='public', domain_url='public',
                schema_name=get_public_schema_name()
            )
            self.user1 = CustUser.objects.create_user(
                username='Alan_Ford',
                first_name='Alan',
                last_name='Ford',
                email='alan.ford@tnt.com',
                date_joined=datetime.datetime(2019, 1, 1, 0, 0, 0)
            )
            self.user2 = CustUser.objects.create_user(
                username='Number1',
                first_name='Number',
                last_name='One',
                email='num1@tnt.com',
                is_superuser=True,
                date_joined=datetime.datetime(1970, 1, 1, 0, 0, 0)
            )

        self.groupofmetrics = poem_models.GroupOfMetrics.objects.create(
            name='Metric1'
        )
        self.groupofmetricprofiles = \
            poem_models.GroupOfMetricProfiles.objects.create(name='MP1')
        self.groupofaggregations = \
            poem_models.GroupOfAggregations.objects.create(name='Aggr1')

    def test_get_users_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.get(self.url)
            force_authenticate(request, user=self.user2)
            response = self.view(request)
            self.assertEqual(
                response.data,
                [
                    {
                        'first_name': 'Alan',
                        'last_name': 'Ford',
                        'username': 'Alan_Ford',
                        'is_active': True,
                        'is_superuser': False,
                        'email': 'alan.ford@tnt.com',
                        'date_joined': '2019-01-01 00:00:00',
                        'last_login': '',
                        'pk': self.user1.pk
                    },
                    {
                        'first_name': 'Number',
                        'last_name': 'One',
                        'username': 'Number1',
                        'is_active': True,
                        'is_superuser': True,
                        'email': 'num1@tnt.com',
                        'date_joined': '1970-01-01 00:00:00',
                        'last_login': '',
                        'pk': self.user2.pk
                    }
                ]
            )

    def test_get_users_sp_user(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.get(self.url)
            request.tenant = self.super_tenant
            force_authenticate(request, user=self.user1)
            response = self.view(request)
            self.assertEqual(
                response.data,
                [
                    {
                        'first_name': 'Alan',
                        'last_name': 'Ford',
                        'username': 'Alan_Ford',
                        'is_active': True,
                        'is_superuser': False,
                        'email': 'alan.ford@tnt.com',
                        'date_joined': '2019-01-01 00:00:00',
                        'last_login': '',
                        'pk': self.user1.pk
                    }
                ]
            )

    def test_get_users_tenant_superuser(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'first_name': 'Another',
                    'last_name': 'User',
                    'username': 'another_user',
                    'is_active': True,
                    'is_superuser': True,
                    'email': 'otheruser@example.com',
                    'date_joined': '2015-01-02 00:00:00',
                    'last_login': '',
                    'pk': self.tenant_user2.pk
                },
                {
                    'first_name': 'Test',
                    'last_name': 'User',
                    'username': 'testuser',
                    'is_active': True,
                    'is_superuser': False,
                    'email': 'testuser@example.com',
                    'date_joined': '2015-01-01 00:00:00',
                    'last_login': '',
                    'pk': self.tenant_user1.pk
                }
            ]
        )

    def test_get_users_tenant_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'first_name': 'Test',
                    'last_name': 'User',
                    'username': 'testuser',
                    'is_active': True,
                    'is_superuser': False,
                    'email': 'testuser@example.com',
                    'date_joined': '2015-01-01 00:00:00',
                    'last_login': '',
                    'pk': self.tenant_user1.pk
                }
            ]
        )

    def test_get_users_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_user_by_username_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.get(self.url + 'Alan_Ford')
            force_authenticate(request, user=self.user2)
            response = self.view(request, 'Alan_Ford')
            self.assertEqual(
                response.data,
                {
                    'first_name': 'Alan',
                    'last_name': 'Ford',
                    'username': 'Alan_Ford',
                    'is_active': True,
                    'is_superuser': False,
                    'email': 'alan.ford@tnt.com',
                    'date_joined': '2019-01-01 00:00:00',
                    'last_login': '',
                    'pk': self.user1.pk
                }
            )

    def test_get_user_by_username_sp_user(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.get(self.url + 'Alan_Ford')
            force_authenticate(request, user=self.user1)
            response = self.view(request, 'Alan_Ford')
            self.assertEqual(
                response.data,
                {
                    'first_name': 'Alan',
                    'last_name': 'Ford',
                    'username': 'Alan_Ford',
                    'is_active': True,
                    'is_superuser': False,
                    'email': 'alan.ford@tnt.com',
                    'date_joined': '2019-01-01 00:00:00',
                    'last_login': '',
                    'pk': self.user1.pk
                }
            )

    def test_get_user_by_username_sp_user_another_username(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.get(self.url + 'Number1')
            force_authenticate(request, user=self.user1)
            response = self.view(request, 'Number1')
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to fetch users other than yourself.'
            )

    def test_get_user_by_username_tenant_superuser(self):
        request = self.factory.get(self.url + 'testuser')
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request, 'testuser')
        self.assertEqual(
            response.data,
            {
                'first_name': 'Test',
                'last_name': 'User',
                'username': 'testuser',
                'is_active': True,
                'is_superuser': False,
                'email': 'testuser@example.com',
                'date_joined': '2015-01-01 00:00:00',
                'last_login': '',
                'pk': self.tenant_user1.pk
            }
        )

    def test_get_user_by_username_tenant_user(self):
        request = self.factory.get(self.url + 'testuser')
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request, 'testuser')
        self.assertEqual(
            response.data,
            {
                'first_name': 'Test',
                'last_name': 'User',
                'username': 'testuser',
                'is_active': True,
                'is_superuser': False,
                'email': 'testuser@example.com',
                'date_joined': '2015-01-01 00:00:00',
                'last_login': '',
                'pk': self.tenant_user1.pk
            }
        )

    def test_get_user_by_username_tenant_user_another_username(self):
        request = self.factory.get(self.url + 'another_user')
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request, 'another_user')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to fetch users other than yourself.'
        )

    def test_get_user_by_username_if_username_does_not_exist_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.get(self.url + 'testuser')
            force_authenticate(request, user=self.user2)
            response = self.view(request, 'testuser')
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(response.data['detail'], 'User does not exist.')

    def test_get_user_by_username_if_username_does_not_exist_sp_user(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.get(self.url + 'testuser')
            force_authenticate(request, user=self.user1)
            response = self.view(request, 'testuser')
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to fetch users other than yourself.'
            )

    def test_get_user_by_username_if_username_does_not_exist_tnant_sprusr(self):
        request = self.factory.get(self.url + 'Alan_Ford')
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request, 'Alan_Ford')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'User does not exist.')

    def test_get_user_by_username_if_username_does_not_exist_tenant_user(self):
        request = self.factory.get(self.url + 'Alan_Ford')
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request, 'Alan_Ford')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to fetch users other than yourself.'
        )

    def test_put_user_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            data = {
                'pk': self.user1.pk,
                'username': 'testuser2',
                'first_name': 'Testing',
                'last_name': 'Newuser',
                'email': 'testuser@test.com',
                'is_superuser': True,
                'is_active': True
            }
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user2)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            user = CustUser.objects.get(id=self.user1.id)
            self.assertEqual(user.username, 'testuser2')
            self.assertEqual(user.first_name, 'Testing')
            self.assertEqual(user.last_name, 'Newuser')
            self.assertEqual(user.email, 'testuser@test.com')
            self.assertTrue(user.is_superuser)
            self.assertTrue(user.is_active)

    def test_put_user_sp_user(self):
        with schema_context(get_public_schema_name()):
            data = {
                'pk': self.user1.pk,
                'username': 'testuser2',
                'first_name': 'Testing',
                'last_name': 'Newuser',
                'email': 'testuser@test.com',
                'is_superuser': True,
                'is_active': True
            }
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user1)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to change users.'
            )
            user = CustUser.objects.get(id=self.user1.id)
            self.assertEqual(user.username, 'Alan_Ford')
            self.assertEqual(user.first_name, 'Alan')
            self.assertEqual(user.last_name, 'Ford')
            self.assertEqual(user.email, 'alan.ford@tnt.com')
            self.assertFalse(user.is_superuser)
            self.assertTrue(user.is_active)

    def test_put_user_tenant_superuser(self):
        data = {
            'pk': self.tenant_user1.pk,
            'username': 'testuser2',
            'first_name': 'Testing',
            'last_name': 'Newuser',
            'email': 'testuser@test.com',
            'is_superuser': True,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = CustUser.objects.get(id=self.tenant_user1.pk)
        self.assertEqual(user.username, 'testuser2')
        self.assertEqual(user.first_name, 'Testing')
        self.assertEqual(user.last_name, 'Newuser')
        self.assertEqual(user.email, 'testuser@test.com')
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_put_user_tenant_user(self):
        data = {
            'pk': self.tenant_user1.pk,
            'username': 'testuser2',
            'first_name': 'Testing',
            'last_name': 'Newuser',
            'email': 'testuser@test.com',
            'is_superuser': True,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change users.'
        )
        user = CustUser.objects.get(id=self.tenant_user1.pk)
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.email, 'testuser@example.com')
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_put_user_with_already_existing_name_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            data = {
                'pk': self.user1.pk,
                'username': 'Number1',
                'first_name': 'Test',
                'last_name': 'Newuser',
                'email': 'testuser@example.com',
                'is_superuser': False,
                'is_active': True
            }
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user2)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data['detail'],
                'User with this username already exists.'
            )

    def test_put_user_with_already_existing_name_sp_user(self):
        with schema_context(get_public_schema_name()):
            data = {
                'pk': self.user1.pk,
                'username': 'Number1',
                'first_name': 'Test',
                'last_name': 'Newuser',
                'email': 'testuser@example.com',
                'is_superuser': False,
                'is_active': True
            }
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user1)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to change users.'
            )

    def test_put_user_with_already_existing_name_tenant_superuser(self):
        data = {
            'pk': self.tenant_user1.pk,
            'username': 'another_user',
            'first_name': 'Test',
            'last_name': 'Newuser',
            'email': 'testuser@example.com',
            'is_superuser': False,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'User with this username already exists.'
        )

    def test_put_user_with_already_existing_name_tenant_user(self):
        data = {
            'pk': self.tenant_user1.pk,
            'username': 'another_user',
            'first_name': 'Test',
            'last_name': 'Newuser',
            'email': 'testuser@example.com',
            'is_superuser': False,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change users.'
        )

    def test_put_nonexisting_user_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            data = {
                'pk': 999,
                'username': 'testuser2',
                'first_name': 'Test',
                'last_name': 'Newuser',
                'email': 'testuser@example.com',
                'is_superuser': False,
                'is_active': True
            }
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user2)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(response.data['detail'], 'User does not exist.')

    def test_put_nonexisting_user_sp_user(self):
        with schema_context(get_public_schema_name()):
            data = {
                'pk': 999,
                'username': 'testuser2',
                'first_name': 'Test',
                'last_name': 'Newuser',
                'email': 'testuser@example.com',
                'is_superuser': False,
                'is_active': True
            }
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user1)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to change users.'
            )

    def test_put_nonexisting_user_tenant_superuser(self):
        data = {
            'pk': 999,
            'username': 'testuser2',
            'first_name': 'Test',
            'last_name': 'Newuser',
            'email': 'testuser@example.com',
            'is_superuser': False,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'User does not exist.')

    def test_put_nonexisting_user_tenant_user(self):
        data = {
            'pk': 999,
            'username': 'testuser2',
            'first_name': 'Test',
            'last_name': 'Newuser',
            'email': 'testuser@example.com',
            'is_superuser': False,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change users.'
        )

    def test_put_user_missing_data_key_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            data = {
                'pk': self.user1.pk,
                'username': 'testuser2',
                'last_name': 'Newuser',
                'email': 'testuser@example.com',
                'is_superuser': False,
                'is_active': True
            }
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user2)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data['detail'], 'Missing data key: first_name'
            )
            user = CustUser.objects.get(id=self.user1.id)
            self.assertEqual(user.username, 'Alan_Ford')
            self.assertEqual(user.first_name, 'Alan')
            self.assertEqual(user.last_name, 'Ford')
            self.assertEqual(user.email, 'alan.ford@tnt.com')
            self.assertFalse(user.is_superuser)
            self.assertTrue(user.is_active)

    def test_put_user_missing_data_key_sp_user(self):
        with schema_context(get_public_schema_name()):
            data = {
                'pk': self.user1.pk,
                'username': 'testuser2',
                'last_name': 'Newuser',
                'email': 'testuser@example.com',
                'is_superuser': False,
                'is_active': True
            }
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user1)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to change users.'
            )
            user = CustUser.objects.get(id=self.user1.id)
            self.assertEqual(user.username, 'Alan_Ford')
            self.assertEqual(user.first_name, 'Alan')
            self.assertEqual(user.last_name, 'Ford')
            self.assertEqual(user.email, 'alan.ford@tnt.com')
            self.assertFalse(user.is_superuser)
            self.assertTrue(user.is_active)

    def test_put_user_missing_data_key_tenant_superuser(self):
        data = {
            'pk': self.tenant_user1.pk,
            'username': 'testuser2',
            'last_name': 'Newuser',
            'email': 'testuser@example.com',
            'is_superuser': False,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Missing data key: first_name'
        )
        user = CustUser.objects.get(id=self.tenant_user1.id)
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.email, 'testuser@example.com')
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_put_user_missing_data_key_tenant_user(self):
        data = {
            'pk': self.tenant_user1.pk,
            'username': 'testuser2',
            'last_name': 'Newuser',
            'email': 'testuser@example.com',
            'is_superuser': False,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change users.'
        )
        user = CustUser.objects.get(id=self.tenant_user1.id)
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.email, 'testuser@example.com')
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_post_user(self):
        data = {
            'username': 'newuser',
            'first_name': 'New',
            'last_name': 'User',
            'email': 'newuser@example.com',
            'is_superuser': True,
            'is_active': True,
            'password': 'blablabla',
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request)
        user = CustUser.objects.get(username='newuser')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(user.username, 'newuser')
        self.assertEqual(user.first_name, 'New')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_post_user_with_already_existing_username(self):
        data = {
            'username': 'testuser',
            'first_name': 'New',
            'last_name': 'User',
            'email': 'newuser@example.com',
            'is_superuser': True,
            'is_active': True,
            'password': 'blablabla',
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'User with this username already exists.'}
        )

    def test_delete_user(self):
        request = self.factory.delete(self.url + 'another_user')
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request, 'another_user')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_nonexisting_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_user_without_specifying_username(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class GetUserProfileForUsernameAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.GetUserprofileForUsername.as_view()
        self.url = '/api/v2/internal/userprofile/'
        self.user = CustUser.objects.create(username='testuser')

        user1 = CustUser.objects.create_user(
            username='username1',
            first_name='First',
            last_name='User',
            email='fuser@example.com',
            is_active=True,
            is_superuser=False
        )

        self.gm = poem_models.GroupOfMetrics.objects.create(
            name='GROUP-metrics'
        )
        poem_models.GroupOfMetrics.objects.create(name='GROUP2-metrics')
        self.ga = poem_models.GroupOfAggregations.objects.create(
            name='GROUP-aggregations'
        )
        poem_models.GroupOfAggregations.objects.create(
            name='GROUP2-aggregations'
        )
        self.gmp = poem_models.GroupOfMetricProfiles.objects.create(
            name='GROUP-metricprofiles'
        )
        self.gtp = poem_models.GroupOfThresholdsProfiles.objects.create(
            name='GROUP-thresholds'
        )
        poem_models.GroupOfThresholdsProfiles.objects.create(
            name='GROUP2-thresholds'
        )

        self.userprofile = poem_models.UserProfile.objects.create(
            user=user1,
            subject='bla',
            displayname='First_User',
            egiid='blablabla'
        )
        self.userprofile.groupsofmetrics.add(self.gm)
        self.userprofile.groupsofaggregations.add(self.ga)
        self.userprofile.groupsofmetricprofiles.add(self.gmp)
        self.userprofile.groupsofthresholdsprofiles.add(self.gtp)

    def test_get_user_profile_for_given_username(self):
        request = self.factory.get(self.url + 'username1')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'username1')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('subject', 'bla'),
                ('egiid', 'blablabla'),
                ('displayname', 'First_User')
            ])
        )

    def test_get_user_profile_if_username_does_not_exist(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'User not found'})

    def test_get_user_profile_if_user_profile_does_not_exist(self):
        request = self.factory.get(self.url + 'testuser')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'testuser')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'User profile not found'})

    def test_put_userprofile(self):
        self.assertEqual(self.userprofile.groupsofmetrics.count(), 1)
        self.assertEqual(self.userprofile.groupsofmetricprofiles.count(), 1)
        self.assertEqual(self.userprofile.groupsofaggregations.count(), 1)
        self.assertEqual(self.userprofile.groupsofthresholdsprofiles.count(), 1)
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'subject': 'newsubject',
            'groupsofaggregations': ['GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP2-metrics'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP2-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'Username_1')
        self.assertEqual(userprofile.egiid, 'newegiid')
        self.assertEqual(userprofile.subject, 'newsubject')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP2-aggregations'
            ).exists()
        )
        self.assertFalse(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 2)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
            ).exists()
        )
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP2-metrics'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetricprofiles.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetricprofiles.filter(
                name='GROUP-metricprofiles'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofthresholdsprofiles.count(), 1)
        self.assertTrue(
            userprofile.groupsofthresholdsprofiles.filter(
                name='GROUP2-thresholds'
            ).exists()
        )
        self.assertFalse(
            userprofile.groupsofthresholdsprofiles.filter(
                name='GROUP-thresholds'
            ).exists()
        )

    def test_post_userprofile(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username2',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username2',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        userprofile = poem_models.UserProfile.objects.get(user=user)
        self.assertEqual(userprofile.displayname, 'Second_User')
        self.assertEqual(userprofile.egiid, 'bla')
        self.assertEqual(userprofile.subject, 'secondsubject')
        self.assertEqual(userprofile.groupsofaggregations.count(), 2)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP2-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetricprofiles.count(), 0)
        self.assertEqual(userprofile.groupsofthresholdsprofiles.count(), 0)


class ListGroupsForGivenUserAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListGroupsForGivenUser.as_view()
        self.url = '/api/v2/internal/usergroups/'
        self.user = CustUser.objects.create(username='testuser')

        user1 = CustUser.objects.create_user(
            username='username1',
            first_name='First',
            last_name='User',
            email='fuser@example.com',
            is_active=True,
            is_superuser=False
        )

        gm = poem_models.GroupOfMetrics.objects.create(name='GROUP-metrics')
        poem_models.GroupOfMetrics.objects.create(name='GROUP2-metrics')
        ga = poem_models.GroupOfAggregations.objects.create(
            name='GROUP-aggregations'
        )
        gmp = poem_models.GroupOfMetricProfiles.objects.create(
            name='GROUP-metricprofiles'
        )
        gtp = poem_models.GroupOfThresholdsProfiles.objects.create(
            name='GROUP-thresholds'
        )
        poem_models.GroupOfReports.objects.create(name='GROUP1-reports')
        gr = poem_models.GroupOfReports.objects.create(name='GROUP2-reports')

        userprofile = poem_models.UserProfile.objects.create(
            user=user1
        )
        userprofile.groupsofmetrics.add(gm)
        userprofile.groupsofaggregations.add(ga)
        userprofile.groupsofmetricprofiles.add(gmp)
        userprofile.groupsofthresholdsprofiles.add(gtp)
        userprofile.groupsofreports.add(gr)

    def test_get_groups_for_given_user(self):
        request = self.factory.get(self.url + 'username1')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'username1')
        self.assertEqual(
            response.data,
            {
                'result': {
                    'aggregations': ['GROUP-aggregations'],
                    'metrics': ['GROUP-metrics'],
                    'metricprofiles': ['GROUP-metricprofiles'],
                    'reports': ['GROUP2-reports'],
                    'thresholdsprofiles': ['GROUP-thresholds']
                }
            }
        )

    def test_get_all_groups(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'result': {
                    'aggregations': ['GROUP-aggregations'],
                    'metrics': ['GROUP-metrics', 'GROUP2-metrics'],
                    'metricprofiles': ['GROUP-metricprofiles'],
                    'reports': ['GROUP1-reports', 'GROUP2-reports'],
                    'thresholdsprofiles': ['GROUP-thresholds']
                }
            }
        )


class ChangePasswordTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ChangePassword.as_view()
        self.url = '/api/v2/internal/change_password'
        self.user1 = CustUser.objects.create_user(
            username='testuser',
            first_name='Test',
            last_name='User',
            email='testuser@example.com',
            date_joined=datetime.datetime(2015, 1, 1, 0, 0, 0)
        )

        self.user2 = CustUser.objects.create(
            username='anotheruser',
            first_name='Another',
            last_name='Test',
            email='anotheruser@example.com',
            date_joined=datetime.datetime(2015, 1, 1, 0, 0, 0)
        )

    def test_change_password(self):
        data = {
            'username': 'testuser',
            'new_password': 'extra-cool-passwd'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = CustUser.objects.get(username=self.user1.username)
        self.assertTrue(user.check_password('extra-cool-passwd'))

    def test_try_change_password_for_different_user(self):
        data = {
            'username': 'anotheruser',
            'new_password': 'extra-cool-passwd'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data['detail'],
            'Trying to change password for another user.'
        )

    def test_change_password_for_nonexisting_user(self):
        data = {
            'username': 'nonexisting',
            'new_password': 'extra-cool-passwd'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'User not found.')
