import datetime
import json
from collections import OrderedDict
from unittest.mock import patch

import requests
from Poem.api import views_internal as views
from Poem.api.models import MyAPIKey
from Poem.helpers.history_helpers import create_comment, update_comment
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django.test.client import encode_multipart
from rest_framework import status
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory
from tenant_schemas.utils import get_public_schema_name

ALLOWED_TEST_DOMAIN = '.test.com'


def encode_data(data):
    content = encode_multipart('BoUnDaRyStRiNg', data)
    content_type = 'multipart/form-data; boundary=BoUnDaRyStRiNg'

    return content, content_type


def mocked_func(*args, **kwargs):
    pass


def mocked_inline_metric_for_db(data):
    data = json.loads(data)

    result = []
    for item in data:
        if item['key']:
            result.append('{} {}'.format(item['key'], item['value']))

    if result:
        return json.dumps(result)
    else:
        return ''


class MockResponse:
    def __init__(self, data, status_code):
        self.data = data
        self.status_code = status_code

        if self.status_code == 200:
            self.reason = 'OK'

        elif self.status_code == 401:
            self.reason = 'Unauthorized'

        elif self.status_code == 404:
            self.reason = 'Not Found'

    def json(self):
        if isinstance(self.data, dict):
            return self.data
        else:
            try:
                json.loads(self.data)
            except json.decoder.JSONDecodeError:
                raise

    def raise_for_status(self):
        if self.status_code == 200:
            return ''

        elif self.status_code == 401:
            raise requests.exceptions.HTTPError(
                '401 Client Error: Unauthorized'
            )

        elif self.status_code == 404:
            raise requests.exceptions.HTTPError('404 Client Error: Not Found')


def mocked_web_api_request(*args, **kwargs):
    if args[0] == 'metric_profiles':
        return MockResponse(
            {
                'data': [
                    {
                        'id': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                        'date': '2015-01-01',
                        'name': 'TEST_PROFILE',
                        'services': [
                            {
                                'service': 'dg.3GBridge',
                                'metrics': [
                                    'eu.egi.cloud.Swift-CRUD'
                                ]
                            }
                        ]
                    },
                    {
                        'id': '11110000-aaaa-kkkk-aaaa-aaeekkccnnee',
                        'date': '2015-01-01',
                        'name': 'NEW_PROFILE',
                        'services': [
                            {
                                'service': 'dg.3GBridge',
                                'metrics': [
                                    'eu.egi.cloud.Swift-CRUD'
                                ]
                            }
                        ]

                    }
                ]
            }, 200
        )

    if args[0] == 'aggregation_profiles':
        return MockResponse(
            {
                'data': [
                    {
                        'id': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                        'date': '2015-01-01',
                        'name': 'TEST_PROFILE',
                        'namespace': 'egi',
                        'endpoint_group': 'sites',
                        'metric_operation': 'AND',
                        'profile_operation': 'AND',
                        'metric_profile': {
                            'name': 'TEST_PROFILE',
                            'id': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                        },
                        'groups': []
                    },
                    {
                        'id': '11110000-aaaa-kkkk-aaaa-aaeekkccnnee',
                        'date': '2015-01-01',
                        'name': 'NEW_PROFILE',
                        'namespace': 'egi',
                        'endpoint_group': 'sites',
                        'metric_operation': 'AND',
                        'profile_operation': 'AND',
                        'metric_profile': {
                            'name': 'TEST_PROFILE',
                            'id': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                        },
                        'groups': []

                    }
                ]
            }, 200
        )

    if args[0] == 'thresholds_profiles':
        return MockResponse(
            {
                'data': [
                    {
                        'id': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                        'date': '2015-01-01',
                        'name': 'TEST_PROFILE',
                        'rules': [
                            {
                                'metric': 'httpd.ResponseTime',
                                'thresholds': 'response=20ms;0:300;299:1000'
                            },
                            {
                                'host': 'webserver01.example.foo',
                                'metric': 'httpd.ResponseTime',
                                'thresholds': 'response=20ms;0:200;199:300'
                            },
                            {
                                'endpoint_group': 'TEST-SITE-51',
                                'metric': 'httpd.ResponseTime',
                                'thresholds': 'response=20ms;0:500;499:1000'
                            }
                        ]
                    },
                    {
                        'id': '11110000-aaaa-kkkk-aaaa-aaeekkccnnee',
                        'date': '2015-01-01',
                        'name': 'NEW_PROFILE',
                        'rules': [
                            {
                                'metric': 'httpd.ResponseTime',
                                'thresholds': 'response=20ms;0:300;299:1000'
                            }
                        ]
                    }
                ]
            }, 200
        )


def mocked_web_api_metric_profiles(*args, **kwargs):
    return MockResponse(
        {
            "status": {
                "message": "Success",
                "code": "200"
            },
            "data": [
                {
                    "id": "11111111-2222-3333-4444-555555555555",
                    "date": "2020-04-20",
                    "name": "PROFILE1",
                    "description": "First profile",
                    "services": [
                        {
                            "service": "service1",
                            "metrics": [
                                "metric1",
                                "metric2"
                            ]
                        },
                        {
                            "service": "service2",
                            "metrics": [
                                "metric3",
                                "metric4"
                            ]
                        }
                    ]
                },
                {
                    "id": "66666666-7777-8888-9999-000000000000",
                    "date": "2020-03-27",
                    "name": "PROFILE2",
                    "description": "Second profile",
                    "services": [
                        {
                            "service": "service3",
                            "metrics": [
                                "metric3",
                                "metric5",
                                "metric2"
                            ]
                        },
                        {
                            "service": "service4",
                            "metrics": [
                                "metric7"
                            ]
                        }
                    ]
                }
            ]
        }, 200
    )


def mocked_web_api_metric_profiles_empty(*args, **kwargs):
    return MockResponse(
        {
            "status": {
                "message": "Success",
                "code": "200"
            },
            "data": []
        }, 200
    )


def mocked_web_api_metric_profiles_wrong_token(*args, **kwargs):
    return MockResponse(
        {
            "status": {
                "message": "Unauthorized",
                "code": "401",
                "details": "You need to provide a correct authentication token "
                           "using the header 'x-api-key'"
            }
        }, 401
    )


def mocked_web_api_metric_profiles_not_found(*args, **kwargs):
    return MockResponse('404 page not found', 404)


def mocked_web_api_metric_profile(*args, **kwargs):
    return MockResponse(
        {
            "status": {
                "message": "Success",
                "code": "200"
            },
            "data": [
                {
                    "id": "11111111-2222-3333-4444-555555555555",
                    "date": "2020-04-20",
                    "name": "PROFILE1",
                    "description": "First profile",
                    "services": [
                        {
                            "service": "service1",
                            "metrics": [
                                "metric1",
                                "metric2"
                            ]
                        },
                        {
                            "service": "service2",
                            "metrics": [
                                "metric3",
                                "metric4"
                            ]
                        }
                    ]
                }
            ]
        }, 200
    )


def mocked_web_api_metric_profile_put(*args, **kwargs):
    return MockResponse(
        {
            "status": {
                "message": "Metric Profile successfully updated",
                "code": "200"
            },
            "data": {
                "id": "11111111-2222-3333-4444-555555555555",
                "links": {
                    "self": "https:///api/v2/metric_profiles/"
                            "11111111-2222-3333-4444-555555555555"
                }
            }
        }, 200
    )


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
            date_joined=datetime.datetime(2015, 1, 1, 0, 0, 0),
        )

        self.user2 = CustUser.objects.create_user(
            username='another_user',
            first_name='Another',
            last_name='User',
            email='otheruser@example.com',
            is_superuser=True,
            date_joined=datetime.datetime(2015, 1, 2, 0, 0, 0)
        )

        poem_models.UserProfile.objects.create(user=self.user2)

        self.groupofmetrics = poem_models.GroupOfMetrics.objects.create(
            name='Metric1'
        )
        self.groupofmetricprofiles = \
            poem_models.GroupOfMetricProfiles.objects.create(name='MP1')
        self.groupofaggregations = \
            poem_models.GroupOfAggregations.objects.create(name='Aggr1')

    def test_get_users(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user2)
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
                    'pk': self.user2.pk
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
                    'pk': self.user.pk
                }
            ]
        )

    def test_get_users_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_user_by_username(self):
        request = self.factory.get(self.url + 'testuser')
        force_authenticate(request, user=self.user2)
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
                'pk': self.user.pk
            }
        )

    def test_get_user_by_username_if_username_does_not_exist(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_put_user(self):
        data = {
            'pk': self.user.pk,
            'username': 'testuser',
            'first_name': 'Test',
            'last_name': 'Newuser',
            'email': 'testuser@example.com',
            'is_superuser': False,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user2)
        response = self.view(request)
        user = CustUser.objects.get(username='testuser')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'Newuser')
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_put_user_with_already_existing_name(self):
        data = {
            'pk': self.user.pk,
            'username': 'another_user',
            'first_name': 'Test',
            'last_name': 'Newuser',
            'email': 'testuser@example.com',
            'is_superuser': False,
            'is_active': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user2)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'User with this username already exists.'}
        )

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
        force_authenticate(request, user=self.user2)
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
        force_authenticate(request, user=self.user2)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'User with this username already exists.'}
        )

    def test_delete_user(self):
        request = self.factory.delete(self.url + 'another_user')
        force_authenticate(request, user=self.user2)
        response = self.view(request, 'another_user')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_nonexisting_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user2)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_user_without_specifying_username(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user2)
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


class GetSessionDetailsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.IsSessionActive.as_view()
        self.url = '/api/v2/internal/sessionactive/'
        self.user = CustUser.objects.create(username='testuser')

        self.userprofile = poem_models.UserProfile.objects.create(
            user=self.user,
            subject='subject',
            displayname='First_User',
            egiid='blablabla'
        )
        MyAPIKey.objects.create(
            id=1,
            name='WEB-API',
            prefix='foo',
            token='mocked_token_rw'
        )
        MyAPIKey.objects.create(
            id=2,
            name='WEB-API-RO',
            token='mocked_token_ro',
            prefix='bar'
        )

    def test_unauth(self):
        request = self.factory.get(self.url + 'true')
        response = self.view(request)
        self.assertEqual(response.status_code, 403)

    def test_auth_crud(self):
        gm = poem_models.GroupOfMetrics.objects.create(
            name='GROUP-metrics'
        )
        ga = poem_models.GroupOfAggregations.objects.create(
            name='GROUP-aggregations'
        )
        gmp = poem_models.GroupOfMetricProfiles.objects.create(
            name='GROUP-metricprofiles'
        )
        gtp = poem_models.GroupOfThresholdsProfiles.objects.create(
            name='GROUP-thresholds'
        )

        self.userprofile.groupsofmetrics.add(gm)
        self.userprofile.groupsofaggregations.add(ga)
        self.userprofile.groupsofmetricprofiles.add(gmp)
        self.userprofile.groupsofthresholdsprofiles.add(gtp)

        request = self.factory.get(self.url + 'true')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'true')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['active'])
        self.assertFalse(response.data['userdetails']['is_superuser'])
        self.assertEqual(response.data['userdetails']['username'], 'testuser')
        self.assertEqual(response.data['userdetails']['groups'], OrderedDict([
            ('aggregations', ['GROUP-aggregations']),
            ('metricprofiles', ['GROUP-metricprofiles']),
            ('metrics', ['GROUP-metrics']),
            ('thresholdsprofiles', ['GROUP-thresholds'])]
        ))
        self.assertEqual(response.data['userdetails']['token'], 'mocked_token_rw')

    def test_auth_readonly(self):
        request = self.factory.get(self.url + 'true')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'true')
        self.assertEqual(response.data['userdetails']['token'], 'mocked_token_ro')


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

        userprofile = poem_models.UserProfile.objects.create(
            user=user1
        )
        userprofile.groupsofmetrics.add(gm)
        userprofile.groupsofaggregations.add(ga)
        userprofile.groupsofmetricprofiles.add(gmp)
        userprofile.groupsofthresholdsprofiles.add(gtp)

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
                    'thresholdsprofiles': ['GROUP-thresholds']
                }
            }
        )


class GetIsTenantSchemaAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.GetIsTenantSchema.as_view()
        self.url = '/api/v2/internal/istenantschema/'

    def test_get_tenant_schema(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {'isTenantSchema': True}
        )

    @patch('Poem.api.internal_views.app.connection')
    def test_get_schema_name_if_public_schema(self, args):
        args.schema_name = get_public_schema_name()
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {'isTenantSchema': False}
        )


class ListTenantVersionsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListTenantVersions.as_view()
        self.url = '/api/v2/internal/tenantversion/'
        self.user = CustUser.objects.create_user(username='testuser')

        tag = admin_models.OSTag.objects.create(name='CentOS 6')
        repo = admin_models.YumRepo.objects.create(name='repo-1', tag=tag)
        package1 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.7'
        )
        package1.repos.add(repo)

        package2 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.11'
        )
        package2.repos.add(repo)

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            package=package1,
            description='Probe is inspecting AMS service.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        ct_m = ContentType.objects.get_for_model(poem_models.Metric)
        ct_mp = ContentType.objects.get_for_model(poem_models.MetricProfiles)
        ct_aggr = ContentType.objects.get_for_model(poem_models.Aggregation)
        ct_tp = ContentType.objects.get_for_model(
            poem_models.ThresholdsProfiles
        )

        self.probever1 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe1.package = package2
        probe1.save()

        self.probever2 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Changed package.',
            version_user=self.user.username
        )

        self.mtype1 = poem_models.MetricType.objects.create(name='Active')
        self.mtype2 = poem_models.MetricType.objects.create(name='Passive')

        self.mtag1 = admin_models.MetricTags.objects.create(name='test_tag1')
        self.mtag2 = admin_models.MetricTags.objects.create(name='test_tag2')
        self.mtag3 = admin_models.MetricTags.objects.create(name='test_tag3')

        group1 = poem_models.GroupOfMetrics.objects.create(name='EGI')
        group2 = poem_models.GroupOfMetrics.objects.create(name='TEST')

        poem_models.GroupOfMetricProfiles.objects.create(name='EGI')
        poem_models.GroupOfMetricProfiles.objects.create(name='NEW_GROUP')

        self.metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            mtype=self.mtype1,
            group=group1,
            probekey=self.probever1,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        self.metric1.tags.add(self.mtag1, self.mtag2)

        poem_models.Metric.objects.create(
            name='test.AMS-Check',
            mtype=self.mtype1,
            group=group1,
            probekey=self.probever1,
            description='Description of test.AMS-Check.',
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        self.ver1 = poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr='argo.AMS-Check',
            content_type=ct_m,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.metric1.name = 'argo.AMS-Check-new'
        self.metric1.probeexecutable = '["ams-probe-2"]'
        self.metric1.probekey = self.probever2
        self.metric1.description = 'Description of argo.AMS-Check-new.'
        self.metric1.group = group2
        self.metric1.parent = '["new-parent"]'
        self.metric1.config = '["maxCheckAttempts 4", "timeout 70", ' \
                              '"path /usr/libexec/argo-monitoring/' \
                              'probes/argo2", "interval 5", "retryInterval 4"]'
        self.metric1.attribute = '["argo.ams_TOKEN2 --token"]'
        self.metric1.dependancy = '["new-key new-value"]'
        self.metric1.flags = ''
        self.metric1.parameter = ''
        self.metric1.fileparameter = '["new-key new-value"]'
        self.metric1.save()
        self.metric1.tags.add(self.mtag3)

        comment = create_comment(
            self.metric1, ct=ct_m, new_serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        self.ver2 = poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric1.__str__(),
            content_type=ct_m,
            date_created=datetime.datetime.now(),
            comment=comment,
            user=self.user.username
        )

        self.metric2 = poem_models.Metric.objects.create(
            name='org.apel.APEL-Pub',
            description='Description of org.apel.APEL-Pub.',
            mtype=self.mtype2,
            group=group1,
            flags='["OBSESS 1", "PASSIVE 1"]'
        )

        self.ver3 = poem_models.TenantHistory.objects.create(
            object_id=self.metric2.id,
            serialized_data=serializers.serialize(
                'json', [self.metric2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric2.__str__(),
            content_type=ct_m,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.mp1 = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.mp1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]["fields"].update({
            "metricinstances": [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        })

        self.ver4 = poem_models.TenantHistory.objects.create(
            object_id=self.mp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.mp1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=ct_mp
        )

        self.mp1.groupname = 'NEW_GROUP'
        self.mp1.name = 'TEST_PROFILE2'
        self.mp1.save()

        data = json.loads(
            serializers.serialize(
                'json', [self.mp1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]["fields"].update({
            "metricinstances": [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
            ]
        })

        comment = create_comment(
            self.mp1, ct=ct_mp, new_serialized_data=json.dumps(data)
        )

        self.ver5 = poem_models.TenantHistory.objects.create(
            object_id=self.mp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.mp1.__str__(),
            comment=comment,
            user='testuser',
            content_type=ct_mp
        )

        self.aggr1 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.aggr1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': [
                {
                    'name': 'Group1',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'AMGA',
                            'operation': 'OR'
                        },
                        {
                            'name': 'APEL',
                            'operation': 'OR'
                        }
                    ]
                },
                {
                    'name': 'Group2',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'OR'
                        },
                        {
                            'name': 'argo.api',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })

        self.ver6 = poem_models.TenantHistory.objects.create(
            object_id=self.aggr1.id,
            serialized_data=json.dumps(data),
            object_repr=self.aggr1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=ct_aggr
        )

        self.aggr1.name = 'TEST_PROFILE2'
        self.aggr1.groupname = 'TEST2'
        self.aggr1.save()

        data = json.loads(
            serializers.serialize(
                'json', [self.aggr1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'OR',
            'metric_profile': 'TEST_PROFILE2',
            'groups': [
                {
                    'name': 'Group1a',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'AMGA',
                            'operation': 'OR'
                        },
                        {
                            'name': 'APEL',
                            'operation': 'OR'
                        }
                    ]
                },
                {
                    'name': 'Group2',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'argo.api',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })

        self.ver7 = poem_models.TenantHistory.objects.create(
            object_id=self.aggr1.id,
            serialized_data=json.dumps(data),
            object_repr=self.aggr1.__str__(),
            comment='[{"changed": {"fields": ["endpoint_group", "groupname", '
                    '"metric_operation", "metric_profile", "name", '
                    '"profile_operation"]}}, {"deleted": {"fields": '
                    '["groups"], "object": ["Group1"]}}, {"added": {"fields": '
                    '["groups"], "object": ["Group1a"]}}, {"changed": '
                    '{"fields": ["groups"], "object": ["Group2"]}}]',
            user='testuser',
            content_type=ct_aggr
        )

        self.tp1 = poem_models.ThresholdsProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='GROUP'
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.tp1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'rules': [
                {
                    'host': 'hostFoo',
                    'metric': 'metricA',
                    'thresholds': 'freshness=1s;10;9:;0;25 entries=1;3;0:2;10'
                }
            ]
        })

        self.ver8 = poem_models.TenantHistory.objects.create(
            object_id=self.tp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.tp1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=ct_tp
        )

        self.tp1.name = 'TEST_PROFILE2'
        self.tp1.groupname = 'NEW_GROUP'
        self.tp1.save()

        data = json.loads(
            serializers.serialize(
                'json', [self.tp1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'rules': [
                {
                    'host': 'hostFoo',
                    'metric': 'newMetric',
                    'endpoint_group': 'test',
                    'thresholds': 'entries=1;3;0:2;10'
                }
            ]
        })

        self.ver9 = poem_models.TenantHistory.objects.create(
            object_id=self.tp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.tp1.__str__(),
            comment='[{"changed": {"fields": ["name", "groupname"]}}, '
                    '{"added": {"fields": ["rules"], '
                    '"object": ["newMetric"]}}, '
                    '{"deleted": {"fields": ["rules"], '
                    '"object": ["metricA"]}}]',
            user='testuser',
            content_type=ct_tp
        )

    def test_get_versions_of_metrics(self):
        request = self.factory.get(self.url + 'metric/argo.AMS-Check-new')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metric', 'argo.AMS-Check-new')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver2.id,
                    'object_repr': 'argo.AMS-Check-new',
                    'fields': {
                        'name': 'argo.AMS-Check-new',
                        'mtype': self.mtype1.name,
                        'tags': ['test_tag1', 'test_tag2', 'test_tag3'],
                        'group': 'TEST',
                        'probeversion': 'ams-probe (0.1.11)',
                        'description': 'Description of argo.AMS-Check-new.',
                        'parent': 'new-parent',
                        'probeexecutable': 'ams-probe-2',
                        'config': [
                            {'key': 'maxCheckAttempts', 'value': '4'},
                            {'key': 'timeout', 'value': '70'},
                            {'key': 'path',
                             'value':
                                 '/usr/libexec/argo-monitoring/probes/argo2'},
                            {'key': 'interval', 'value': '5'},
                            {'key': 'retryInterval', 'value': '4'}
                        ],
                        'attribute': [
                            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
                        ],
                        'dependancy': [
                            {'key': 'new-key', 'value': 'new-value'}
                        ],
                        'flags': [],
                        'files': [],
                        'parameter': [],
                        'fileparameter': [
                            {'key': 'new-key', 'value': 'new-value'}
                        ]
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver2.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Added tags field "test_tag3". '
                               'Changed config fields "maxCheckAttempts", '
                               '"retryInterval" and "timeout". Added '
                               'description. Changed group and probekey.',
                    'version': datetime.datetime.strftime(
                        self.ver2.date_created, '%Y%m%d-%H%M%S'
                    )
                },
                {
                    'id': self.ver1.id,
                    'object_repr': 'argo.AMS-Check',
                    'fields': {
                        'name': 'argo.AMS-Check',
                        'mtype': self.mtype1.name,
                        'tags': ['test_tag1', 'test_tag2'],
                        'group': 'EGI',
                        'probeversion': 'ams-probe (0.1.7)',
                        'description': '',
                        'parent': '',
                        'probeexecutable': 'ams-probe',
                        'config': [
                            {'key': 'maxCheckAttempts', 'value': '3'},
                            {'key': 'timeout', 'value': '60'},
                            {'key': 'path',
                             'value':
                                 '/usr/libexec/argo-monitoring/probes/argo'},
                            {'key': 'interval', 'value': '5'},
                            {'key': 'retryInterval', 'value': '3'}
                        ],
                        'attribute': [
                            {'key': 'argo.ams_TOKEN', 'value': '--token'}
                        ],
                        'dependancy': [],
                        'flags': [
                            {'key': 'OBSESS', 'value': '1'}
                        ],
                        'files': [],
                        'parameter': [
                            {'key': '--project', 'value': 'EGI'}
                        ],
                        'fileparameter': []
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver1.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': datetime.datetime.strftime(
                        self.ver1.date_created, '%Y%m%d-%H%M%S'
                    )
                }
            ]
        )

    def test_get_passive_metric_version(self):
        request = self.factory.get(self.url + 'metric/org.apel.APEL-Pub')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metric', 'org.apel.APEL-Pub')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver3.id,
                    'object_repr': 'org.apel.APEL-Pub',
                    'fields': {
                        'name': 'org.apel.APEL-Pub',
                        'mtype': self.mtype2.name,
                        'tags': [],
                        'group': 'EGI',
                        'probeversion': '',
                        'description': 'Description of org.apel.APEL-Pub.',
                        'parent': '',
                        'probeexecutable': '',
                        'config': [],
                        'attribute': [],
                        'dependancy': [],
                        'flags': [
                            {'key': 'OBSESS', 'value': '1'},
                            {'key': 'PASSIVE', 'value': '1'}
                        ],
                        'files': [],
                        'parameter': [],
                        'fileparameter': []
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver3.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': datetime.datetime.strftime(
                        self.ver2.date_created, '%Y%m%d-%H%M%S'
                    )
                }
            ]
        )

    def test_get_nonexisting_metric_version(self):
        request = self.factory.get(self.url + 'metric/test.AMS-Check')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metric', 'test.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Version not found.'})

    def test_get_nonexisting_metric(self):
        request = self.factory.get(self.url + 'metric/nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metric', 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Metric not found.'})

    def test_get_metric_version_without_specifying_name(self):
        request = self.factory.get(self.url + 'metric')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metric')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_metric_profile_versions(self):
        request = self.factory.get(self.url + 'metricprofile/TEST_PROFILE2')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metricprofile', 'TEST_PROFILE2')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver5.id,
                    'object_repr': 'TEST_PROFILE2',
                    'fields': {
                        'name': 'TEST_PROFILE2',
                        'groupname': 'NEW_GROUP',
                        'description': '',
                        'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                        'metricinstances': [
                            {'service': 'AMGA', 'metric': 'org.nagios.SAML-SP'},
                            {'service': 'APEL', 'metric': 'org.apel.APEL-Pub'}
                        ]
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver5.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Deleted service-metric instance tuple '
                               '(APEL, org.apel.APEL-Sync). Changed groupname '
                               'and name.',
                    'version': datetime.datetime.strftime(
                        self.ver5.date_created, '%Y%m%d-%H%M%S'
                    )
                },
                {
                    'id': self.ver4.id,
                    'object_repr': 'TEST_PROFILE',
                    'fields': {
                        'name': 'TEST_PROFILE',
                        'groupname': 'EGI',
                        'description': '',
                        'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                        'metricinstances': [
                            {'service': 'AMGA', 'metric': 'org.nagios.SAML-SP'},
                            {'service': 'APEL', 'metric': 'org.apel.APEL-Pub'},
                            {'service': 'APEL', 'metric': 'org.apel.APEL-Sync'}
                        ]
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver4.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': datetime.datetime.strftime(
                        self.ver4.date_created, '%Y%m%d-%H%M%S'
                    )
                }
            ]
        )

    def test_get_nonexisting_metricprofile(self):
        request = self.factory.get(self.url + 'metricprofile/nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metricprofile', 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Metric profile not found.'})

    def test_get_metric_version_without_specifying_name(self):
        request = self.factory.get(self.url + 'metricprofile')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metricprofile')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_aggregation_profile_version(self):
        request = self.factory.get(
            self.url + 'aggregationprofile/TEST_PROFILE2'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, 'aggregationprofile', 'TEST_PROFILE2')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver7.id,
                    'object_repr': 'TEST_PROFILE2',
                    'fields': {
                        'name': 'TEST_PROFILE2',
                        'description': '',
                        'groupname': 'TEST2',
                        'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                        'endpoint_group': 'servicegroups',
                        'metric_operation': 'OR',
                        'profile_operation': 'OR',
                        'metric_profile': 'TEST_PROFILE2',
                        'groups': [
                            {
                                'name': 'Group1a',
                                'operation': 'AND',
                                'services': [
                                    {
                                        'name': 'AMGA',
                                        'operation': 'OR'
                                    },
                                    {
                                        'name': 'APEL',
                                        'operation': 'OR'
                                    }
                                ]
                            },
                            {
                                'name': 'Group2',
                                'operation': 'OR',
                                'services': [
                                    {
                                        'name': 'argo.api',
                                        'operation': 'OR'
                                    }
                                ]
                            }
                        ]
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver7.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Changed endpoint_group, groupname, '
                               'metric_operation, metric_profile, name and '
                               'profile_operation. Deleted groups field '
                               '"Group1". Added groups field "Group1a". '
                               'Changed groups field "Group2".',
                    'version': datetime.datetime.strftime(
                        self.ver7.date_created, '%Y%m%d-%H%M%S'
                    )
                },
                {
                    'id': self.ver6.id,
                    'object_repr': 'TEST_PROFILE',
                    'fields': {
                        'name': 'TEST_PROFILE',
                        'description': '',
                        'groupname': 'EGI',
                        'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                        'endpoint_group': 'sites',
                        'metric_operation': 'AND',
                        'profile_operation': 'AND',
                        'metric_profile': 'TEST_PROFILE',
                        'groups': [
                            {
                                'name': 'Group1',
                                'operation': 'AND',
                                'services': [
                                    {
                                        'name': 'AMGA',
                                        'operation': 'OR'
                                    },
                                    {
                                        'name': 'APEL',
                                        'operation': 'OR'
                                    }
                                ]
                            },
                            {
                                'name': 'Group2',
                                'operation': 'AND',
                                'services': [
                                    {
                                        'name': 'VOMS',
                                        'operation': 'OR'
                                    },
                                    {
                                        'name': 'argo.api',
                                        'operation': 'OR'
                                    }
                                ]
                            }
                        ]
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver6.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': datetime.datetime.strftime(
                        self.ver6.date_created, '%Y%m%d-%H%M%S'
                    )
                }
            ]
        )

    def test_get_nonexisting_aggregation_profile(self):
        request = self.factory.get(self.url + 'aggregationprofile/nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'aggregationprofile', 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data, {'detail': 'Aggregation profile not found.'}
        )

    def test_get_aggregation_profile_version_without_specifying_name(self):
        request = self.factory.get(self.url + 'aggregationprofile')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'aggregationprofile')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_thresholds_profile_version(self):
        request = self.factory.get(
            self.url + 'thresholdsprofile/TEST_PROFILE2'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, 'thresholdsprofile', 'TEST_PROFILE2')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver9.id,
                    'object_repr': 'TEST_PROFILE2',
                    'fields': {
                        'name': 'TEST_PROFILE2',
                        'description': '',
                        'groupname': 'NEW_GROUP',
                        'apiid': self.tp1.apiid,
                        'rules': [
                            {
                                'host': 'hostFoo',
                                'metric': 'newMetric',
                                'endpoint_group': 'test',
                                'thresholds': 'entries=1;3;0:2;10'
                            }
                        ]
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver9.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Changed name and groupname. '
                               'Added rule for metric "newMetric". '
                               'Deleted rule for metric "metricA".',
                    'version': datetime.datetime.strftime(
                        self.ver9.date_created, '%Y%m%d-%H%M%S'
                    )
                },
                {
                    'id': self.ver8.id,
                    'object_repr': 'TEST_PROFILE',
                    'fields': {
                        'name': 'TEST_PROFILE',
                        'description': '',
                        'groupname': 'GROUP',
                        'apiid': self.tp1.apiid,
                        'rules': [
                            {
                                'host': 'hostFoo',
                                'metric': 'metricA',
                                'thresholds': 'freshness=1s;10;9:;0;25 '
                                              'entries=1;3;0:2;10'
                            }
                        ]
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver8.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': datetime.datetime.strftime(
                        self.ver8.date_created, '%Y%m%d-%H%M%S'
                    )
                }
            ]
        )


class ListYumReposAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListYumRepos.as_view()
        self.url = '/api/v2/internal/yumrepos/'
        self.user = CustUser.objects.create_user(username='testuser')

        self.tag1 = admin_models.OSTag.objects.create(name='CentOS 6')
        self.tag2 = admin_models.OSTag.objects.create(name='CentOS 7')

        self.repo1 = admin_models.YumRepo.objects.create(
            name='repo-1',
            tag=self.tag1,
            content='content1=content1\ncontent2=content2',
            description='Repo 1 description.'
        )

        self.repo2 = admin_models.YumRepo.objects.create(
            name='repo-2',
            tag=self.tag2,
            content='content1=content1\ncontent2=content2',
            description='Repo 2 description.'
        )

    def test_get_list_of_yum_repos(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.repo1.id,
                    'name': 'repo-1',
                    'tag': 'CentOS 6',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Repo 1 description.'
                },
                {
                    'id': self.repo2.id,
                    'name': 'repo-2',
                    'tag': 'CentOS 7',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Repo 2 description.'
                }
            ]
        )

    def test_get_yum_repo_by_name(self):
        request = self.factory.get(self.url + 'repo-1/centos6')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'repo-1', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'id': self.repo1.id,
                'name': 'repo-1',
                'tag': 'CentOS 6',
                'content': 'content1=content1\ncontent2=content2',
                'description': 'Repo 1 description.'
            }
        )

    def test_get_yum_repo_in_case_of_nonexisting_name(self):
        request = self.factory.get(self.url + 'nonexisting/centos6')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_yum_repo(self):
        data = {
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        repo = admin_models.YumRepo.objects.get(name='repo-3')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(
            repo.content,
            'content1=content1\ncontent2=content2'
        )
        self.assertEqual(repo.description, 'Repo 3 description')

    def test_post_yum_repo_with_name_and_tag_that_already_exist(self):
        data = {
            'name': 'repo-1',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Another description.'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'YUM repo with this name and tag already exists.'}
        )

    def test_put_yum_repo(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-new-1',
            'tag': 'CentOS 7',
            'content': 'content3=content3\ncontent4=content4',
            'description': 'Another description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-new-1')
        self.assertEqual(repo.tag, self.tag2)
        self.assertEqual(repo.name, 'repo-new-1')
        self.assertEqual(repo.content, 'content3=content3\ncontent4=content4')
        self.assertEqual(repo.description, 'Another description.')

    def test_put_yum_repo_with_existing_name_and_tag(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'tag': 'CentOS 7',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Existing repo-2'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'YUM repo with this name and tag already exists.'}
        )

    def test_put_yum_repo_with_existing_name_but_different_tag(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Existing repo-2'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-2')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Existing repo-2')

    def test_delete_yum_repo(self):
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        request = self.factory.delete(self.url + 'repo-1/centos6')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'repo-1', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 1)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-1'
        )

    def test_delete_yum_repo_without_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_yum_repo_nonexisting_name(self):
        request = self.factory.delete(self.url + 'nonexisting/centos7')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting', 'centos7')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'YUM repo not found.'})


class HistoryHelpersTests(TenantTestCase):
    def setUp(self):
        tag = admin_models.OSTag.objects.create(name='CentOS 6')
        self.repo = admin_models.YumRepo.objects.create(name='repo-1', tag=tag)

        self.package1 = admin_models.Package.objects.create(
            name='package-1',
            version='1.0.0'
        )
        self.package1.repos.add(self.repo)

        package2 = admin_models.Package.objects.create(
            name='package-1',
            version='1.0.1'
        )
        package2.repos.add(self.repo)

        package3 = admin_models.Package.objects.create(
            name='package-1',
            version='2.0.0'
        )

        self.probe1 = admin_models.Probe.objects.create(
            name='probe-1',
            package=self.package1,
            description='Some description.',
            comment='Some comment.',
            repository='https://repository.url',
            docurl='https://doc.url',
            user='testuser',
            datetime=datetime.datetime.now()
        )

        self.ct_metric = ContentType.objects.get_for_model(poem_models.Metric)
        self.ct_mp = ContentType.objects.get_for_model(
            poem_models.MetricProfiles
        )
        self.ct_aggr = ContentType.objects.get_for_model(
            poem_models.Aggregation
        )
        self.ct_tp = ContentType.objects.get_for_model(
            poem_models.ThresholdsProfiles
        )

        self.active = admin_models.MetricTemplateType.objects.create(
            name='Active'
        )
        self.metric_active = poem_models.MetricType.objects.create(
            name='Active'
        )

        probe_history1 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            version_comment='Initial version.',
            version_user='testuser'
        )

        self.probe1.package = package2
        self.probe1.comment = 'New version.'
        self.probe1.save()

        self.probe_history2 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user='testuser'
        )

        self.probe1.package = package3
        self.probe1.comment = 'Newest version.'
        self.probe1.save()

        self.probe_history3 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user='testuser'
        )

        self.metrictag1 = admin_models.MetricTags.objects.create(
            name='test_tag1'
        )
        self.metrictag2 = admin_models.MetricTags.objects.create(
            name='test_tag2'
        )
        self.metrictag3 = admin_models.MetricTags.objects.create(
            name='test_tag3'
        )

        self.mt1 = admin_models.MetricTemplate.objects.create(
            name='metric-template-1',
            description='Description of metric-template-1.',
            parent='["parent"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependency='["dependency-key1 dependency-value1", '
                       '"dependency-key2 dependency-value2"]',
            flags='["flags-key flags-value"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.active,
            probekey=probe_history1
        )
        self.mt1.tags.add(self.metrictag1, self.metrictag2)

        mth1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            parent=self.mt1.parent,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user='testuser'
        )
        mth1.tags.add(self.metrictag1, self.metrictag2)

        self.mt1.probekey = self.probe_history2
        self.mt1.config = '["maxCheckAttempts 3", "timeout 70", ' \
                          '"path $USER", "interval 5", "retryInterval 3"]'
        self.mt1.save()

        mth2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            parent=self.mt1.parent,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='[{"changed": {"fields": ["config"], '
                            '"object": ["timeout"]}}, {"changed": {"fields": '
                            '["probekey"]}}]',
            version_user='testuser'
        )
        mth2.tags.add(self.metrictag1, self.metrictag2)

        self.mt2 = admin_models.MetricTemplate.objects.create(
            name='metric-template-3',
            description='Description of metric-template-3.',
            parent='["parent"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependency='["dependency-key1 dependency-value1", '
                       '"dependency-key2 dependency-value2"]',
            flags='["flags-key flags-value"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.active,
            probekey=probe_history1
        )
        self.mt2.tags.add(self.metrictag1)

        mth3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt2,
            name=self.mt2.name,
            mtype=self.mt2.mtype,
            probekey=self.mt2.probekey,
            description=self.mt2.description,
            parent=self.mt2.parent,
            probeexecutable=self.mt2.probeexecutable,
            config=self.mt2.config,
            attribute=self.mt2.attribute,
            dependency=self.mt2.dependency,
            flags=self.mt2.flags,
            files=self.mt2.files,
            parameter=self.mt2.parameter,
            fileparameter=self.mt2.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user='testuser'
        )
        mth3.tags.add(self.metrictag1)

        self.metric1 = poem_models.Metric.objects.create(
            name='metric-1',
            description='Description of metric-1.',
            parent='["parent"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependancy='["dependency-key1 dependency-value1", '
                       '"dependency-key2 dependency-value2"]',
            flags='["flags-key flags-value"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.metric_active,
            probekey=probe_history1
        )
        self.metric1.tags.add(self.metrictag1, self.metrictag2)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct_metric
        )

        poem_models.GroupOfMetricProfiles.objects.create(name='TEST')
        poem_models.GroupOfMetricProfiles.objects.create(name='TEST2')

        self.mp1 = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='TEST'
        )

        data = json.loads(serializers.serialize(
            'json', [self.mp1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'metricinstances': [
                ('AMGA', 'org.nagios.SAML-SP'),
                ('APEL', 'org.apel.APEL-Pub'),
                ('APEL', 'org.apel.APEL-Sync')
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.mp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.mp1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct_mp
        )

        poem_models.GroupOfAggregations.objects.create(name='TEST')
        poem_models.GroupOfAggregations.objects.create(name='TEST2')

        self.aggr1 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='TEST'
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.aggr1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': [
                {
                    'name': 'Group1',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'AMGA',
                            'operation': 'OR'
                        },
                        {
                            'name': 'APEL',
                            'operation': 'OR'
                        }
                    ]
                },
                {
                    'name': 'Group2',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'OR'
                        },
                        {
                            'name':'argo.api',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.aggr1.id,
            serialized_data=json.dumps(data),
            object_repr=self.aggr1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct_aggr
        )

        self.tp1 = poem_models.ThresholdsProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='TEST'
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.tp1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'rules': [
                {
                    'host': 'hostFoo',
                    'metric': 'metricA',
                    'thresholds': 'freshness=1s;10;9:;0;25 entries=1;3;0:2;10'
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.tp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.tp1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct_tp
        )

    def test_create_comment_for_metric_template(self):
        self.mt1.name = 'metric-template-2'
        self.mt1.description = 'New description for metric-template-2.'
        self.mt1.probekey = self.probe_history3
        self.mt1.parent = ''
        self.mt1.probeexecutable = '["new-probeexecutable"]'
        self.mt1.dependency = '["dependency-key1 dependency-value1"]'
        self.mt1.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        self.mt1.save()
        self.mt1.tags.remove(self.metrictag1)
        self.mt1.tags.add(self.metrictag3)
        comment = create_comment(self.mt1)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"deleted": {"fields": ["dependency"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"added": {"fields": ["tags"], "object": ["test_tag3"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag1"]}}',
                '{"added": {"fields": ["probeexecutable"]}}',
                '{"changed": {"fields": ["description", "name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_create_comment_for_metric_template_if_initial(self):
        mt = admin_models.MetricTemplate.objects.create(
            name='metric-template-2',
            description='Description for metric-template-2.',
            probekey=self.probe_history2,
            probeexecutable='["new-probeexecutable"]',
            config='["maxCheckAttempts 4", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 4"]',
            attribute='["attribute-key attribute-value"]',
            dependency='["dependency-key1 dependency-value1"]',
            flags='["flags-key flags-value", "flags-key1 flags-value2"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.active
        )
        mt.tags.add(self.metrictag1)
        comment = create_comment(mt)
        self.assertEqual(comment, 'Initial version.')

    def test_update_comment_for_metric_template(self):
        self.mt1.name = 'metric-template-2'
        self.mt1.parent = ''
        self.mt1.probeexecutable = '["new-probeexecutable"]'
        self.mt1.dependency = '["dependency-key1 dependency-value1"]'
        self.mt1.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        self.mt1.save()
        self.mt1.tags.add(self.metrictag3)
        comment = update_comment(self.mt1)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], "object": ["timeout"]}}',
                '{"deleted": {"fields": ["dependency"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"added": {"fields": ["tags"], "object": ["test_tag3"]}}',
                '{"added": {"fields": ["probeexecutable"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_do_not_update_comment_for_metric_template_if_initial(self):
        self.mt2.name = 'metric-template-4'
        self.mt2.description = 'Description for metric-template-4.'
        self.mt2.parent = ''
        self.mt2.probeexecutable = '["new-probeexecutable"]'
        self.mt2.dependency = '["dependency-key1 dependency-value1"]'
        self.mt2.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        self.mt2.save()
        self.mt2.tags.add(self.metrictag3)
        comment = update_comment(self.mt2)
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_probe(self):
        package = admin_models.Package.objects.create(
            name='package',
            version='2.0.2'
        )
        package.repos.add(self.repo)
        self.probe1.name = 'probe-2'
        self.probe1.package = package
        self.probe1.description = 'Some new description.'
        self.probe1.comment = 'Newer version.'
        self.probe1.repository = 'https://repository2.url'
        self.probe1.docurl = 'https://doc2.url',
        self.probe1.save()
        comment = create_comment(self.probe1)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["comment", "description", "docurl", '
                '"name", "package", "repository"]}}'
            }
        )

    def test_update_comment_for_probe(self):
        package = admin_models.Package.objects.create(
            name='package',
            version='2.0.2'
        )
        package.repos.add(self.repo)
        self.probe1.name = 'probe-2'
        self.probe1.package = package
        self.probe1.save()
        comment = update_comment(self.probe1)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["comment", "name", "package"]}}'
            }
        )

    def test_do_not_update_comment_for_probe_if_initial(self):
        probe2 = admin_models.Probe.objects.create(
            name='probe-3',
            package=self.package1,
            description='Some description.',
            comment='Initial version.',
            repository='https://repository.url',
            docurl='https://doc.url',
            user='testuser',
            datetime=datetime.datetime.now()
        )
        admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=probe2.package,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            version_comment='Initial version.',
            version_user='testuser'
        )
        probe2.comment = 'Some comment.'
        probe2.save()
        comment = update_comment(probe2)
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_probe_if_initial(self):
        package = admin_models.Package.objects.create(
            name='package',
            version='1.0.2'
        )
        package.repos.add(self.repo)
        probe2 = admin_models.Probe.objects.create(
            name='probe-2',
            package=package,
            description='Some new description.',
            comment='Newer version.',
            repository='https://repository2.url',
            docurl='https://doc2.url',
            user='testuser',
            datetime=datetime.datetime.now()
        )
        comment = create_comment(probe2)
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_metric(self):
        metric = poem_models.Metric.objects.get(
            id=self.metric1.id
        )
        metric.name = 'metric-2'
        metric.description = 'Description for metric-2.'
        metric.probekey = self.probe_history2
        metric.probeexecutable = '["new-probeexecutable"]'
        metric.config = '["maxCheckAttempts 3", "timeout 60",'\
                        ' "path $USER", "interval 5", "retryInterval 3"]'
        metric.attribute = '["attribute-key attribute-value"]'
        metric.dependancy = '["dependency-key1 dependency-value1"]'
        metric.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        metric.files = '["files-key files-value"]'
        metric.parameter = '["parameter-key parameter-value"]'
        metric.fileparameter = '["fileparameter-key fileparameter-value"]'
        metric.mtype = self.metric_active
        metric.parent = ''
        metric.save()
        serialized_data = serializers.serialize(
            'json', [metric],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        comment = create_comment(self.metric1, self.ct_metric,
                                 serialized_data)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"deleted": {"fields": ["dependancy"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"added": {"fields": ["probeexecutable"]}}',
                '{"changed": {"fields": ["description", "name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_create_comment_for_metric_if_field_deleted_from_model(self):
        mt = poem_models.Metric.objects.get(
            id=self.metric1.id
        )
        mt.name = 'metric-2'
        mt.description = 'Description of metric-1.'
        mt.probekey = self.probe_history2
        mt.probeexecutable = '["new-probeexecutable"]'
        mt.config = '["maxCheckAttempts 4", "timeout 60",'\
                    ' "path $USER", "interval 5", "retryInterval 3"]'
        mt.attribute = '["attribute-key attribute-value"]'
        mt.dependancy = '["dependency-key1 dependency-value1"]'
        mt.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        mt.files = '["files-key files-value"]'
        mt.parameter = '["parameter-key parameter-value"]'
        mt.mtype = self.metric_active
        mt.parent = ''
        mt.save()
        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        # let's say fileparameter field no longer exists in the model
        dict_serialized = json.loads(serialized_data)
        del dict_serialized[0]['fields']['fileparameter']
        new_serialized_data = json.dumps(dict_serialized)
        comment = create_comment(self.metric1, self.ct_metric,
                                 new_serialized_data)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts"]}}',
                '{"deleted": {"fields": ["dependancy"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"added": {"fields": ["probeexecutable"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_create_comment_for_metric_if_field_added_to_model(self):
        mt = poem_models.Metric.objects.get(
            id=self.metric1.id
        )
        mt.name = 'metric-2'
        mt.description = 'Description of metric-1.'
        mt.probekey = self.probe_history2
        mt.probeexecutable = '["new-probeexecutable"]'
        mt.config = '["maxCheckAttempts 4", "timeout 60",'\
                    ' "path $USER", "interval 5", "retryInterval 4"]'
        mt.attribute = '["attribute-key attribute-value"]'
        mt.dependancy = '["dependency-key1 dependency-value1"]'
        mt.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        mt.files = '["files-key files-value"]'
        mt.parameter = '["parameter-key parameter-value"]'
        mt.fileparameter = '["fileparameter-key fileparameter-value"]'
        mt.mtype = self.metric_active
        mt.parent = ''
        mt.save()
        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        # let's say mock_field was added to model
        dict_serialized = json.loads(serialized_data)
        dict_serialized[0]['fields']['mock_field'] = 'mock_value'
        new_serialized_data = json.dumps(dict_serialized)
        comment = create_comment(self.metric1, self.ct_metric,
                                 new_serialized_data)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "retryInterval"]}}',
                '{"deleted": {"fields": ["dependancy"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"added": {"fields": ["mock_field", "probeexecutable"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_create_comment_for_metric_if_initial(self):
        mt = poem_models.Metric.objects.create(
            name='metric-template-2',
            description='Description for metric-2.',
            probekey=self.probe_history2,
            probeexecutable='["new-probeexecutable"]',
            config='["maxCheckAttempts 4", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 4"]',
            attribute='["attribute-key attribute-value"]',
            dependancy='["dependency-key1 dependency-value1"]',
            flags='["flags-key flags-value", "flags-key1 flags-value2"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.metric_active
        )
        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        comment = create_comment(mt, self.ct_metric, serialized_data)
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_metric_if_group_was_none(self):
        group = poem_models.GroupOfMetrics.objects.create(name='EGI')
        m = self.metric1
        m.group = group
        m.save()
        serialized_data = serializers.serialize(
            'json', [m],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        comment = create_comment(m, self.ct_metric, serialized_data)
        self.assertEqual(comment, '[{"added": {"fields": ["group"]}}]')

    def test_create_comment_for_metricprofile(self):
        self.mp1.name = 'TEST_PROFILE2',
        self.mp1.groupname = 'TEST2'
        self.mp1.save()
        data = json.loads(serializers.serialize(
            'json', [self.mp1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'metricinstances': [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['ARC-CE', 'org.nordugrid.ARC-CE-IGTF']
            ]
        })
        comment = create_comment(self.mp1, self.ct_mp, json.dumps(data))
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["groupname", "name"]}}',
                '{"added": {"fields": ["metricinstances"], '
                '"object": ["ARC-CE", "org.nordugrid.ARC-CE-IGTF"]}}',
                '{"deleted": {"fields": ["metricinstances"], '
                '"object": ["APEL", "org.apel.APEL-Sync"]}}'
            }
        )

    def test_create_comment_for_metricprofile_if_initial(self):
        mp = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE2',
            groupname='TEST',
            apiid='10000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        data = json.loads(serializers.serialize(
            'json', [mp],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'metricinstances': [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['ARC-CE', 'org.nordugrid.ARC-CE-IGTF']
            ]
        })
        comment = create_comment(mp, self.ct_mp, json.dumps(data))
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_aggregation_profile(self):
        self.aggr1.name = 'TEST_PROFILE2'
        self.aggr1.groupname = 'TEST2'
        data = json.loads(serializers.serialize(
            'json', [self.aggr1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'OR',
            'metric_profile': 'TEST_PROFILE2',
            'groups': [
                {
                    'name': 'Group1a',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'AMGA',
                            'operation': 'OR'
                        },
                        {
                            'name': 'APEL',
                            'operation': 'OR'
                        }
                    ]
                },
                {
                    'name': 'Group2',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'argo.api',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })
        comment = create_comment(self.aggr1, self.ct_aggr, json.dumps(data))
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["endpoint_group", "groupname", '
                '"metric_operation", "metric_profile", "name", '
                '"profile_operation"]}}',
                '{"deleted": {"fields": ["groups"], "object": ["Group1"]}}',
                '{"added": {"fields": ["groups"], "object": ["Group1a"]}}',
                '{"changed": {"fields": ["groups"], "object": ["Group2"]}}'
            }
        )
        self.aggr1.save()

    def test_create_comment_for_aggregationprofile_if_initial(self):
        aggr = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE2',
            groupname='TEST',
            apiid='10000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        data = json.loads(serializers.serialize(
            'json', [aggr],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'OR',
            'metric_profile': 'TEST_PROFILE2',
            'groups': [
                {
                    'name': 'Group1a',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'AMGA',
                            'operation': 'OR'
                        },
                        {
                            'name': 'APEL',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })
        comment = create_comment(aggr, self.ct_aggr, json.dumps(data))
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_thresholds_profile(self):
        self.tp1.name = 'TEST_PROFILE2'
        self.tp1.groupname = 'TEST2'
        self.tp1.save()
        data = json.loads(serializers.serialize(
            'json', [self.tp1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'rules': [
                {
                    'host': 'hostFoo',
                    'metric': 'metricA',
                    'thresholds': 'freshness=1s;10;9:;0;25'
                },
                {
                    'host': 'hostBar',
                    'endpoint_group': 'TEST-SITE-51',
                    'metric': 'httpd.ResponseTime',
                    'thresholds': 'response=20ms;0:500;499:1000'
                },
                {
                    'metric': 'httpd.ResponseTime',
                    'thresholds': 'response=20ms;0:300;299:1000'
                }
            ]
        })
        comment = create_comment(self.tp1, self.ct_tp, json.dumps(data))
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["groupname", "name"]}}',
                '{"changed": {"fields": ["rules"], "object": ["metricA"]}}',
                '{"added": {"fields": ["rules"], '
                '"object": ["httpd.ResponseTime"]}}',
            }
        )

    def test_create_comment_for_thresholds_profile_if_initial(self):
        tp = poem_models.ThresholdsProfiles.objects.create(
            name='TEST_PROFILE2',
            groupname='TEST',
            apiid='10000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        data = json.loads(serializers.serialize(
            'json', [tp],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'rules': [
                {
                    'host': 'hostBar',
                    'endpoint_group': 'TEST-SITE-51',
                    'metric': 'httpd.ResponseTime',
                    'thresholds': 'response=20ms;0:500;499:1000'
                },
                {
                    'metric': 'httpd.ResponseTime',
                    'thresholds': 'response=20ms;0:300;299:1000'
                }
            ]
        })
        comment = create_comment(tp, self.ct_tp, json.dumps(data))
        self.assertEqual(comment, 'Initial version.')


class ListThresholdsProfilesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListThresholdsProfiles.as_view()
        self.url = '/api/v2/internal/thresholdsprofiles/'
        self.user = CustUser.objects.create_user(username='testuser')

        self.tp1 = poem_models.ThresholdsProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='GROUP'
        )

        self.tp2 = poem_models.ThresholdsProfiles.objects.create(
            name='ANOTHER_PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        poem_models.GroupOfThresholdsProfiles.objects.create(name='GROUP')
        poem_models.GroupOfThresholdsProfiles.objects.create(name='NEWGROUP')

        self.ct = ContentType.objects.get_for_model(
            poem_models.ThresholdsProfiles
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.tp1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'rules': [
                {
                    'host': 'hostFoo',
                    'metric': 'metricA',
                    'thresholds': 'freshness=1s;10;9:;0;25 entries=1;3;0:2;10'
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.tp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.tp1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.tp2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'rules': [
                {
                    'metric': 'metricB',
                    'thresholds': 'freshness=1s;10;9:;0;25'
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.tp2.id,
            serialized_data=json.dumps(data),
            object_repr=self.tp2.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )

    @patch('Poem.api.internal_views.thresholdsprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_all_thresholds_profiles(self, func):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'ANOTHER_PROFILE'),
                    ('description', ''),
                    ('apiid', '12341234-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', '')
                ]),
                OrderedDict([
                    ('name', 'TEST_PROFILE'),
                    ('description', ''),
                    ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', 'GROUP')
                ])
            ]
        )

    @patch('Poem.api.internal_views.thresholdsprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_thresholds_profiles_if_no_authentication(self, func):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('Poem.api.internal_views.thresholdsprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_thresholds_profile_by_name(self, func):
        request = self.factory.get(self.url + 'TEST_PROFILE')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'TEST_PROFILE')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('name', 'TEST_PROFILE'),
                ('description', ''),
                ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                ('groupname', 'GROUP')
            ])
        )

    @patch('Poem.api.internal_views.thresholdsprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_thresholds_profile_by_nonexisting_name(self, func):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {'detail': 'Thresholds profile not found.'}
        )

    def test_put_thresholds_profile(self):
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        data = {
            'name': 'NEW_TEST_PROFILE',
            'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            'groupname': 'NEWGROUP',
            'rules': json.dumps([
                {
                    'host': 'newHost',
                    'metric': 'newMetric',
                    'thresholds': 'entries=1;3;0:2;10'
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tp = poem_models.ThresholdsProfiles.objects.get(id=self.tp1.id)
        self.assertEqual(tp.name, 'NEW_TEST_PROFILE')
        self.assertEqual(tp.groupname, 'NEWGROUP')
        group1 = poem_models.GroupOfThresholdsProfiles.objects.get(
            name='NEWGROUP'
        )
        group2 = poem_models.GroupOfThresholdsProfiles.objects.get(
            name='GROUP'
        )
        self.assertTrue(
            group1.thresholdsprofiles.filter(
                apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee'
            ).exists()
        )
        self.assertFalse(
            group2.thresholdsprofiles.filter(
                apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee'
            ).exists()
        )
        history = poem_models.TenantHistory.objects.filter(
            object_id=tp.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(history.count(), 2)
        comment_set = set()
        for item in json.loads(history[0].comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {'{"changed": {"fields": ["groupname", "name", "rules"]}}'}
        )
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], tp.name)
        self.assertEqual(serialized_data['groupname'], tp.groupname)
        self.assertEqual(serialized_data['apiid'], tp.apiid)
        self.assertEqual(
            serialized_data['rules'],
            json.dumps([
                {
                    'host': 'newHost',
                    'metric': 'newMetric',
                    'thresholds': 'entries=1;3;0:2;10'
                }
            ])
        )

    def test_put_thresholds_profile_with_invalid_data(self):
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        data = {
            'name': 'NEW_TEST_PROFILE',
            'apiid': '',
            'groupname': 'GROUP',
            'rules': json.dumps([
                {
                    'host': 'newHost',
                    'metric': 'newMetric',
                    'thresholds': 'entries=1;3;0:2;10'
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {'detail': 'Apiid field undefined!'})

    def test_post_thresholds_profile(self):
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        data = {
            'name': 'NEW_PROFILE',
            'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
            'groupname': 'GROUP',
            'rules': json.dumps([
                {
                    'host': 'newHost',
                    'metric': 'newMetric',
                    'thresholds': 'entries=1;3;0:2;10'
                }
            ])
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 3
        )
        profile = poem_models.ThresholdsProfiles.objects.get(
            apiid='12341234-aaaa-kkkk-aaaa-aaeekkccnnee'
        )
        self.assertEqual(profile.name, 'NEW_PROFILE')
        self.assertEqual(profile.groupname, 'GROUP')
        group = poem_models.GroupOfThresholdsProfiles.objects.get(name='GROUP')
        self.assertTrue(
            group.thresholdsprofiles.filter(
                apiid='12341234-aaaa-kkkk-aaaa-aaeekkccnnee'
            ).exists()
        )
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(history.count(), 1)
        self.assertEqual(history[0].comment, 'Initial version.')
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(
            serialized_data['rules'],
            '[{"host": "newHost", "metric": "newMetric", '
            '"thresholds": "entries=1;3;0:2;10"}]'
        )

    def test_post_thresholds_profile_with_invalid_data(self):
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        data = {
            'name': 'NEW_PROFILE',
            'apiid': '',
            'groupname': 'GROUP',
            'rules': json.dumps([
                {
                    'host': 'newHost',
                    'metric': 'newMetric',
                    'thresholds': 'entries=1;3;0:2;10'
                }
            ])
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                'detail': 'apiid: This field may not be blank.'
            }
        )

    def test_delete_thresholds_profile(self):
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.tp1.id, content_type=self.ct
            ).count(), 1
        )
        request = self.factory.delete(
            self.url + '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertRaises(
            poem_models.ThresholdsProfiles.DoesNotExist,
            poem_models.ThresholdsProfiles.objects.get,
            id=self.tp1.id
        )
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.tp1.id, content_type=self.ct
            ).count(), 0
        )

    def test_delete_nonexisting_thresholds_profile(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data, {'detail': 'Thresholds profile not found.'}
        )

    def test_delete_thresholds_profile_without_specifying_apiid(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Thresholds profile not specified!'}
        )


class ListOSTagsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListOSTags.as_view()
        self.url = '/api/v2/internal/ostags/'
        self.user = CustUser.objects.create(username='testuser')

        admin_models.OSTag.objects.create(name='CentOS 6')
        admin_models.OSTag.objects.create(name='CentOS 7')

    def test_get_tags(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            [r for r in response.data],
            [
                'CentOS 6',
                'CentOS 7',
            ]
        )
