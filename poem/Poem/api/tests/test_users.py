import datetime
from collections import OrderedDict

from Poem.api import views_internal as views
from Poem.poem import models as poem_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from django_tenants.utils import schema_context, get_public_schema_name, \
    get_tenant_domain_model
from rest_framework import status
from rest_framework.test import force_authenticate

from .utils_test import encode_data


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
                name='public', schema_name=get_public_schema_name()
            )
            get_tenant_domain_model().objects.create(
                domain='public', tenant=self.super_tenant, is_primary=True
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

    def test_post_user_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            self.assertEqual(CustUser.objects.all().count(), 2)
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
            force_authenticate(request, user=self.user2)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(CustUser.objects.all().count(), 3)
            user = CustUser.objects.get(username='newuser')
            self.assertEqual(user.username, 'newuser')
            self.assertEqual(user.first_name, 'New')
            self.assertEqual(user.last_name, 'User')
            self.assertEqual(user.email, 'newuser@example.com')
            self.assertTrue(user.is_superuser)
            self.assertTrue(user.is_active)

    def test_post_user_sp_user(self):
        with schema_context(get_public_schema_name()):
            self.assertEqual(CustUser.objects.all().count(), 2)
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
            force_authenticate(request, user=self.user1)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to add users.'
            )
            self.assertEqual(CustUser.objects.all().count(), 2)
            self.assertRaises(
                CustUser.DoesNotExist,
                CustUser.objects.get,
                username='newuser'
            )

    def test_post_user_tenant_superuser(self):
        self.assertEqual(CustUser.objects.all().count(), 2)
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
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CustUser.objects.all().count(), 3)
        user = CustUser.objects.get(username='newuser')
        self.assertEqual(user.username, 'newuser')
        self.assertEqual(user.first_name, 'New')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_post_user_tenant_user(self):
        self.assertEqual(CustUser.objects.all().count(), 2)
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
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add users.'
        )
        self.assertEqual(CustUser.objects.all().count(), 2)
        self.assertRaises(
            CustUser.DoesNotExist,
            CustUser.objects.get,
            username='newuser'
        )

    def test_post_user_with_already_existing_username_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            data = {
                'username': 'Number1',
                'first_name': 'New',
                'last_name': 'User',
                'email': 'newuser@example.com',
                'is_superuser': True,
                'is_active': True,
                'password': 'blablabla',
            }
            request = self.factory.post(self.url, data, format='json')
            force_authenticate(request, user=self.user2)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data['detail'],
                'User with this username already exists.'
            )

    def test_post_user_with_already_existing_username_sp_user(self):
        with schema_context(get_public_schema_name()):
            data = {
                'username': 'Number1',
                'first_name': 'New',
                'last_name': 'User',
                'email': 'newuser@example.com',
                'is_superuser': True,
                'is_active': True,
                'password': 'blablabla',
            }
            request = self.factory.post(self.url, data, format='json')
            force_authenticate(request, user=self.user1)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(CustUser.objects.all().count(), 2)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to add users.'
            )

    def test_post_user_with_already_existing_username_tenant_superuser(self):
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
            response.data['detail'], 'User with this username already exists.'
        )

    def test_post_user_with_already_existing_username_tenant_user(self):
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
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add users.'
        )
        self.assertEqual(CustUser.objects.all().count(), 2)

    def test_post_user_with_missing_data_key_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            data = {
                'username': 'newuser',
                'first_name': 'New',
                'last_name': 'User',
                'is_superuser': True,
                'is_active': True,
                'password': 'blablabla',
            }
            request = self.factory.post(self.url, data, format='json')
            force_authenticate(request, user=self.user2)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(response.data['detail'], 'Missing data key: email')
            self.assertEqual(CustUser.objects.all().count(), 2)

    def test_post_user_with_missing_data_key_sp_user(self):
        with schema_context(get_public_schema_name()):
            data = {
                'username': 'newuser',
                'first_name': 'New',
                'last_name': 'User',
                'is_superuser': True,
                'is_active': True,
                'password': 'blablabla',
            }
            request = self.factory.post(self.url, data, format='json')
            force_authenticate(request, user=self.user1)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to add users.'
            )
            self.assertEqual(CustUser.objects.all().count(), 2)

    def test_post_user_with_missing_data_key_tenant_superuser(self):
        data = {
            'username': 'newuser',
            'first_name': 'New',
            'last_name': 'User',
            'is_superuser': True,
            'is_active': True,
            'password': 'blablabla',
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: email')
        self.assertEqual(CustUser.objects.all().count(), 2)

    def test_post_user_with_missing_data_key_tenant_user(self):
        data = {
            'username': 'newuser',
            'first_name': 'New',
            'last_name': 'User',
            'is_superuser': True,
            'is_active': True,
            'password': 'blablabla',
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add users.'
        )
        self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_user_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.delete(self.url + 'Alan_Ford')
            force_authenticate(request, user=self.user2)
            response = self.view(request, 'Alan_Ford')
            self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
            self.assertEqual(CustUser.objects.all().count(), 1)
            self.assertRaises(
                CustUser.DoesNotExist,
                CustUser.objects.get,
                username='Alan_Ford'
            )

    def test_delete_yourself_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.delete(self.url + 'Number1')
            force_authenticate(request, user=self.user2)
            response = self.view(request, 'Number1')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data['detail'], 'You cannot delete yourself.'
            )
            self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_user_sp_user(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.delete(self.url + 'Alan_Ford')
            force_authenticate(request, user=self.user1)
            response = self.view(request, 'Alan_Ford')
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to delete users.'
            )
            self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_user_tenant_superuser(self):
        request = self.factory.delete(self.url + 'testuser')
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request, 'testuser')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(CustUser.objects.all().count(), 1)
        self.assertRaises(
            CustUser.DoesNotExist,
            CustUser.objects.get,
            username='testuser'
        )

    def test_delete_yourself_tenant_superuser(self):
        request = self.factory.delete(self.url + 'another_user')
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request, 'another_user')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'You cannot delete yourself.')
        self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_user_tenant_user(self):
        request = self.factory.delete(self.url + 'testuser')
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request, 'testuser')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete users.'
        )
        self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_nonexisting_user_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.delete(self.url + 'nonexisting')
            force_authenticate(request, user=self.user2)
            response = self.view(request, 'nonexisting')
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(response.data['detail'], 'User does not exist.')
            self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_nonexisting_user_sp_user(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.delete(self.url + 'nonexisting')
            force_authenticate(request, user=self.user1)
            response = self.view(request, 'nonexisting')
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to delete users.'
            )
            self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_nonexisting_user_tenant_superuser(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'User does not exist.')
        self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_nonexisting_user_tenant_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete users.'
        )
        self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_user_without_specifying_username_sp_superuser(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.delete(self.url)
            force_authenticate(request, user=self.user2)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data['detail'], 'Username should be specified.'
            )
            self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_user_without_specifying_username_sp_user(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.delete(self.url)
            force_authenticate(request, user=self.user1)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(
                response.data['detail'],
                'You do not have permission to delete users.'
            )
            self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_user_without_specifying_username_tenant_superuser(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.tenant_user2)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Username should be specified.'
        )
        self.assertEqual(CustUser.objects.all().count(), 2)

    def test_delete_user_without_specifying_username_tenant_user(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.tenant_user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete users.'
        )
        self.assertEqual(CustUser.objects.all().count(), 2)


class GetUserProfileForUsernameAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.GetUserprofileForUsername.as_view()
        self.url = '/api/v2/internal/userprofile/'
        self.user = CustUser.objects.create(username='testuser')
        self.superuser = CustUser.objects.create(
            username='poem', is_superuser=True
        )

        user1 = CustUser.objects.create_user(
            username='username1',
            first_name='First',
            last_name='User',
            email='fuser@example.com',
            is_active=True,
            is_superuser=False
        )

        CustUser.objects.create_user(
            username='username2',
            first_name='Second',
            last_name='user',
            email='user@example.com',
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

    def test_get_user_profile_for_given_username_superuser(self):
        request = self.factory.get(self.url + 'username1')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'username1')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('subject', 'bla'),
                ('egiid', 'blablabla'),
                ('displayname', 'First_User')
            ])
        )

    def test_get_user_profile_for_given_username_user(self):
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

    def test_get_user_profile_if_username_does_not_exist_superuser(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'User does not exist.')

    def test_get_user_profile_if_username_does_not_exist_user(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'User does not exist.')

    def test_get_user_profile_if_user_profile_does_not_exist_superuser(self):
        request = self.factory.get(self.url + 'testuser')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'testuser')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'User profile does not exist.'
        )

    def test_get_user_profile_if_user_profile_does_not_exist_user(self):
        request = self.factory.get(self.url + 'testuser')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'testuser')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'User profile does not exist.'
        )

    def test_put_userprofile_superuser(self):
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
        force_authenticate(request, user=self.superuser)
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

    def test_put_userprofile_user(self):
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
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change user profiles.'
        )
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_put_userprofile_nonexisting_user_superuser(self):
        data = {
            'username': 'nonexisting',
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
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'User does not exist.')

    def test_put_userprofile_nonexisting_user_user(self):
        data = {
            'username': 'nonexisting',
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
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change user profiles.'
        )

    def test_put_userprofile_nonexisting_userprofile_superuser(self):
        data = {
            'username': 'username2',
            'displayname': 'Username_2',
            'egiid': 'newegiid',
            'subject': 'newsubject',
            'groupsofaggregations': ['GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP2-metrics'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP2-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'User profile does not exist.'
        )

    def test_put_userprofile_nonexisting_userprofile_user(self):
        data = {
            'username': 'username2',
            'displayname': 'Username_2',
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
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change user profiles.'
        )

    def test_put_userprofile_nonexisting_group_of_aggr_superuser(self):
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'subject': 'newsubject',
            'groupsofaggregations': ['GROUP3-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP2-metrics'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP2-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of aggregations does not exist.'
        )
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_put_userprofile_nonexisting_group_of_aggr_user(self):
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'subject': 'newsubject',
            'groupsofaggregations': ['GROUP3-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP2-metrics'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP2-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change user profiles.'
        )
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_put_userprofile_nonexisting_group_of_metrics_superuser(self):
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'subject': 'newsubject',
            'groupsofaggregations': ['GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP3-metrics'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP2-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of metrics does not exist.'
        )
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_put_userprofile_nonexisting_group_of_metrics_user(self):
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'subject': 'newsubject',
            'groupsofaggregations': ['GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP3-metrics'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP2-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change user profiles.'
        )
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_put_userprofile_nonexisting_group_of_metric_profiles_suprusr(self):
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'subject': 'newsubject',
            'groupsofaggregations': ['GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP2-metrics'],
            'groupsofmetricprofiles': ['GROUP2-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP2-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of metric profiles does not exist.'
        )
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_put_userprofile_nonexisting_group_of_metric_profiles_user(self):
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'subject': 'newsubject',
            'groupsofaggregations': ['GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP2-metrics'],
            'groupsofmetricprofiles': ['GROUP2-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP2-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change user profiles.'
        )
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_put_userprofile_nonexisting_group_of_thresh_profiles_suprusr(self):
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'subject': 'newsubject',
            'groupsofaggregations': ['GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP2-metrics'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP3-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'],
            'Group of thresholds profiles does not exist.'
        )
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_put_userprofile_nonexisting_group_of_thresh_profiles_user(self):
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'subject': 'newsubject',
            'groupsofaggregations': ['GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP2-metrics'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP3-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change user profiles.'
        )
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_put_userprofile_missing_data_key_superuser(self):
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'groupsofaggregations': ['GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP2-metrics'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: subject')
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_put_userprofile_missing_data_key_user(self):
        data = {
            'username': 'username1',
            'displayname': 'Username_1',
            'egiid': 'newegiid',
            'groupsofaggregations': ['GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics', 'GROUP2-metrics'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles'],
            'groupsofthresholdsprofiles': ['GROUP-thresholds']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change user profiles.'
        )
        userprofile = poem_models.UserProfile.objects.get(
            id=self.userprofile.id
        )
        self.assertEqual(userprofile.displayname, 'First_User')
        self.assertEqual(userprofile.egiid, 'blablabla')
        self.assertEqual(userprofile.subject, 'bla')
        self.assertEqual(userprofile.groupsofaggregations.count(), 1)
        self.assertTrue(
            userprofile.groupsofaggregations.filter(
                name='GROUP-aggregations'
            ).exists()
        )
        self.assertEqual(userprofile.groupsofmetrics.count(), 1)
        self.assertTrue(
            userprofile.groupsofmetrics.filter(
                name='GROUP-metrics'
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
                name='GROUP-thresholds'
            ).exists()
        )

    def test_post_userprofile_superuser(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 2)
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

    def test_post_userprofile_user(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add user profiles.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )

    def test_post_userprofile_nonexisting_user_superuser(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'User does not exist.')
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)

    def test_post_userprofile_nonexisting_user_user(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add user profiles.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)

    def test_post_userprofile_nonexisting_groupofaggr_superuser(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP3-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of aggregations does not exist.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )

    def test_post_userprofile_nonexisting_groupofaggr_user(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP3-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add user profiles.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )

    def test_post_userprofile_nonexisting_groupofmetrics_superuser(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP3-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of metrics does not exist.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )

    def test_post_userprofile_nonexisting_groupofmetrics_user(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP2-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add user profiles.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )

    def test_post_userprofile_nonexisting_groupofmetricprofiles_supruser(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': ['GROUP1-metricprofiles']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'],
            'Group of metric profiles does not exist.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )

    def test_post_userprofile_nonexisting_groupofmetricprofiles_user(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': ['GROUP1-metricprofiles']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add user profiles.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )

    def test_post_userprofile_nonexisting_groupofthreshprofiles_superuser(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': ['GROUP3-thresholds'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'],
            'Group of thresholds profiles does not exist.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )

    def test_post_userprofile_nonexisting_groupofthreshprofiles_user(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'egiid': 'bla',
            'groupsofaggregations': ['GROUP-aggregations',
                                     'GROUP2-aggregations'],
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': ['GROUP3-thresholds'],
            'groupsofmetricprofiles': ['GROUP-metricprofiles']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add user profiles.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )

    def test_post_userprofile_missing_data_key_superuser(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: egiid')
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )

    def test_post_userprofile_missing_data_key_user(self):
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        user = CustUser.objects.create_user(
            username='username3',
            first_name='Second',
            last_name='User',
            email='suser@example.com',
            is_active=True,
            is_superuser=False
        )
        data = {
            'username': 'username3',
            'displayname': 'Second_User',
            'subject': 'secondsubject',
            'groupsofmetrics': ['GROUP-metrics'],
            'groupsofthresholdsprofiles': [],
            'groupsofmetricprofiles': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add user profiles.'
        )
        self.assertEqual(poem_models.UserProfile.objects.all().count(), 1)
        self.assertRaises(
            poem_models.UserProfile.DoesNotExist,
            poem_models.UserProfile.objects.get,
            user=user
        )


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

        self.user2 = CustUser.objects.create_user(
            username='anotheruser',
            first_name='Another',
            last_name='Test',
            email='anotheruser@example.com',
            date_joined=datetime.datetime(2015, 1, 1, 0, 0, 0)
        )

        self.user3 = CustUser.objects.create_user(
            username='testuser3',
            first_name='John',
            last_name='Doe',
            email='testuser3@example.com',
            date_joined=datetime.datetime(2015, 1, 1, 0, 0, 0),
            is_superuser=True
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
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change password for another user.'
        )

    def test_try_change_password_for_different_user_superuser(self):
        data = {
            'username': 'anotheruser',
            'new_password': 'extra-cool-passwd'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user3)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change password for another user.'
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
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change password for another user.'
        )

    def test_change_password_for_nonexisting_user_superuser(self):
        data = {
            'username': 'nonexisting',
            'new_password': 'extra-cool-passwd'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user3)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change password for another user.'
        )

    def test_change_password_missing_data_key(self):
        data = {
            'new_password': 'extra-cool-passwd'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: username')
