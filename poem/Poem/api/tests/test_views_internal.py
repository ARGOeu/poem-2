from collections import OrderedDict
import datetime
from django.db import transaction
from django.test.client import encode_multipart
from rest_framework.test import force_authenticate
from rest_framework import status

from rest_framework_api_key.models import APIKey

from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from unittest.mock import patch, MagicMock

from Poem.poem.models import GroupOfMetrics, Metrics, UserProfile, \
    GroupOfAggregations, GroupOfMetricProfiles
from Poem.poem_super_admin.models import Probe
from Poem.users.models import CustUser
from Poem.api import views_internal as views


def encode_data(data):
    content = encode_multipart('BoUnDaRyStRiNg', data)
    content_type = 'multipart/form-data; boundary=BoUnDaRyStRiNg'

    return content, content_type


class ListMetricsInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricsInGroup.as_view()
        self.url = '/api/v2/internal/metricsgroup/EOSC'
        self.user = CustUser.objects.create(username='testuser')

        metric1 = Metrics.objects.create(name='org.apel.APEL-Pub', id=1)
        metric2 = Metrics.objects.create(name='org.apel.APEL-Sync', id=2)

        group1 = GroupOfMetrics.objects.create(name='EOSC')
        group1.metrics.add(metric1)
        group1.metrics.add(metric2)

        GroupOfMetrics.objects.create(name='Empty_group')

    def test_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_status_code_in_case_nonexisting_site(self):
        url = '/api/v2/internal/metricsgroup/fake_group'
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
                'result': [
                    {'id': 1, 'name': 'org.apel.APEL-Pub'},
                    {'id': 2, 'name': 'org.apel.APEL-Sync'}
                ]
            }
        )

    def test_get_metrics_in_group_if_empty_group(self):
        url = '/api/v2/internal/metricsgroup/Empty_group'
        request = self.factory.get(url)
        force_authenticate(request, user=self.user)
        response = self.view(request, 'Empty_group')
        self.assertEqual(response.data, {'result': []})


class ListTokensAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListTokens.as_view()
        self.url = '/api/v2/internal/tokens/'
        self.user = CustUser.objects.create_user(username='testuser')

        key1 = APIKey.objects.create(client_id='EGI')
        self.id1 = key1.id
        self.token1 = key1.token
        self.created1 = datetime.datetime.strftime(key1.created,
                                                   '%Y-%m-%d %H:%M:%S')
        key2 = APIKey.objects.create(client_id='EUDAT')
        self.id2 = key2.id
        self.token2 = key2.token
        self.created2 = datetime.datetime.strftime(key2.created,
                                                   '%Y-%m-%d %H:%M:%S')
        key3 = APIKey.objects.create(client_id='DELETABLE')
        self.id3 = key3.id
        self.token3 = key3.token
        self.created3 = datetime.datetime.strftime(key3.created,
                                                   '%Y-%m-%d %H:%M:%S')

    def test_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_list_of_tokens(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        # those created later are listed first
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.id3,
                    'name': 'DELETABLE',
                    'token': self.token3,
                    'created': self.created3,
                    'revoked': False
                },
                {
                    'id': self.id2,
                    'name': 'EUDAT',
                    'token': self.token2,
                    'created': self.created2,
                    'revoked': False
                },
                {
                    'id': self.id1,
                    'name': 'EGI',
                    'token': self.token1,
                    'created': self.created1,
                    'revoked': False
                }
            ]
        )

    def test_get_token_for_given_client_id(self):
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

    def test_put_token(self):
        data = {'id': self.id1, 'name': 'EGI2'}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        changed_entry = APIKey.objects.get(id=self.id1)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual('EGI2', changed_entry.client_id)

    def test_put_token_with_name_that_already_exists(self):
        data = {'id': self.id1, 'name': 'EUDAT'}
        content = encode_multipart('BoUnDaRyStRiNg', data)
        content_type = 'multipart/form-data; boundary=BoUnDaRyStRiNg'
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_post_token(self):
        data = {'name': 'test'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_post_token_name_already_exists(self):
        data = {'name': 'EUDAT'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_token(self):
        request = self.factory.delete(self.url + 'DELETABLE')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'DELETABLE')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_nonexisting_token(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_no_token_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ListUsersAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListUsers.as_view()
        self.url = '/api/v2/internal/users/'
        self.user = CustUser.objects.create_user(
            username='testuser',
            first_name='Test',
            last_name='User',
            email='testuser@example.com',
            date_joined=datetime.datetime(2015, 1, 1, 0, 0, 0)
        )

        CustUser.objects.create_user(
            username='another_user',
            first_name='Another',
            last_name='User',
            email='otheruser@example.com',
            date_joined=datetime.datetime(2015, 1, 2, 0, 0, 0)
        )

        self.groupofmetrics = GroupOfMetrics.objects.create(name='Metric1')
        self.groupofmetricprofiles = GroupOfMetricProfiles.objects.create(name='MP1')
        self.groupofaggregations = GroupOfAggregations.objects.create(name='Aggr1')

    def test_get_users(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([('first_name', 'Test'),
                             ('last_name', 'User'),
                             ('username', 'testuser'),
                             ('is_active', True),
                             ('is_superuser', False),
                             ('is_staff', False),
                             ('email', 'testuser@example.com'),
                             ('date_joined', '2015-01-01T00:00:00')]),
                OrderedDict([('first_name', 'Another'),
                             ('last_name', 'User'),
                             ('username', 'another_user'),
                             ('is_active', True),
                             ('is_superuser', False),
                             ('is_staff', False),
                             ('email', 'otheruser@example.com'),
                             ('date_joined', '2015-01-02T00:00:00')])
            ]
        )

    def test_get_users_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_user_by_username(self):
        request = self.factory.get(self.url + 'testuser')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'testuser')
        self.assertEqual(
            response.data,
            OrderedDict([('first_name', 'Test'),
                         ('last_name', 'User'),
                         ('username', 'testuser'),
                         ('is_active', True),
                         ('is_superuser', False),
                         ('is_staff', False),
                         ('email', 'testuser@example.com'),
                         ('date_joined', '2015-01-01T00:00:00')])
        )

    def test_get_user_by_username_if_username_does_not_exist(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_put_user(self):
        data = {
            'username': 'testuser',
            'first_name': 'Test',
            'last_name': 'Newuser',
            'email': 'testuser@example.com',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        user = CustUser.objects.get(username='testuser')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'Newuser')
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.is_staff)
        self.assertTrue(user.is_active)

    @patch('Poem.poem.models.GroupOfMetricProfiles.objects.get')
    @patch('Poem.poem.models.GroupOfMetrics.objects.get')
    @patch('Poem.poem.models.GroupOfAggregations.objects.get')
    def test_post_user(self, aggr, metr, mp, upga):
        aggr.return_value = self.groupofaggregations
        metr.return_value = self.groupofmetrics
        mp.return_value = self.groupofmetricprofiles
        upga.return_value = self.groupofaggregations
        data = {
            'username': 'newuser',
            'first_name': 'New',
            'last_name': 'User',
            'email': 'newuser@example.com',
            'is_superuser': True,
            'is_staff': True,
            'is_active': True,
            'password': 'blablabla',
            'groupsofaggregations': ['Aggr1'],
            'groupsofmetrics': ['Metric1'],
            'groupsofmetricprofiles': ['MP1'],
            'displayname': '',
            'subject': '',
            'egiid': ''
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        user = CustUser.objects.get(username='newuser')
        userprof = UserProfile.objects.get(user=user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(user.username, 'newuser')
        self.assertEqual(user.first_name, 'New')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_active)
        self.assertEqual(userprof.user, user)
        self.assertEqual(userprof.displayname, '')
        self.assertEqual(userprof.subject, '')
        self.assertEqual(userprof.egiid, '')

    def test_delete_user(self):
        request = self.factory.delete(self.url + 'another_user')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'another_user')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_nonexisting_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_user_without_specifying_username(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


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
                   'README.md'
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
