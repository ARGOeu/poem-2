import json
from collections import OrderedDict
from unittest.mock import patch

from Poem.api import views_internal as views
from Poem.poem import models as poem_models
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from rest_framework import status
from rest_framework.test import force_authenticate

from .utils_test import mocked_func, encode_data


class ListMetricProfilesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricProfiles.as_view()
        self.url = '/api/v2/internal/metricprofiles/'
        self.user = CustUser.objects.create_user(username='testuser')
        self.limited_user = CustUser.objects.create_user(username='limited')
        self.superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )

        self.ct = ContentType.objects.get_for_model(poem_models.MetricProfiles)

        self.mp1 = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.mp2 = poem_models.MetricProfiles.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        group1 = poem_models.GroupOfMetricProfiles.objects.create(name='EGI')
        group2 = poem_models.GroupOfMetricProfiles.objects.create(name='ARGO')
        self.group = poem_models.GroupOfMetricProfiles.objects.create(
            name='new-group'
        )

        userprofile = poem_models.UserProfile.objects.create(user=self.user)
        userprofile.groupsofmetricprofiles.add(group1)
        userprofile.groupsofmetricprofiles.add(group2)

        poem_models.UserProfile.objects.create(user=self.limited_user)
        poem_models.UserProfile.objects.create(user=self.superuser)

        data1 = json.loads(
            serializers.serialize(
                'json', [self.mp1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data1[0]['fields'].update({
            'metricinstances': [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        })

        data2 = json.loads(
            serializers.serialize(
                'json', [self.mp2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data2[0]['fields'].update({
            'metricinstances': []
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.mp1.id,
            serialized_data=json.dumps(data1),
            object_repr=self.mp1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )

        poem_models.TenantHistory.objects.create(
            object_id=self.mp2.id,
            serialized_data=json.dumps(data2),
            object_repr=self.mp2.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi')
    def test_get_all_metric_profiles_superuser(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'ANOTHER-PROFILE'),
                    ('description', ''),
                    ('apiid', '12341234-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', '')
                ]),
                OrderedDict([
                    ('name', 'TEST_PROFILE'),
                    ('description', ''),
                    ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', 'EGI')
                ]),
            ]
        )

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi')
    def test_get_all_metric_profiles_regular_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'ANOTHER-PROFILE'),
                    ('description', ''),
                    ('apiid', '12341234-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', '')
                ]),
                OrderedDict([
                    ('name', 'TEST_PROFILE'),
                    ('description', ''),
                    ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', 'EGI')
                ]),
            ]
        )

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi')
    def test_get_all_metric_profiles_regular_user_limited_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'ANOTHER-PROFILE'),
                    ('description', ''),
                    ('apiid', '12341234-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', '')
                ]),
                OrderedDict([
                    ('name', 'TEST_PROFILE'),
                    ('description', ''),
                    ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', 'EGI')
                ]),
            ]
        )

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi')
    def test_get_metric_profile_by_name_superuser(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'TEST_PROFILE')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'TEST_PROFILE')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('name', 'TEST_PROFILE'),
                ('description', ''),
                ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                ('groupname', 'EGI')
            ])
        )

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi')
    def test_get_metric_profile_by_name_regular_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'TEST_PROFILE')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'TEST_PROFILE')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('name', 'TEST_PROFILE'),
                ('description', ''),
                ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                ('groupname', 'EGI')
            ])
        )

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi')
    def test_get_metric_profile_by_name_limited_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'TEST_PROFILE')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request, 'TEST_PROFILE')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('name', 'TEST_PROFILE'),
                ('description', ''),
                ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                ('groupname', 'EGI')
            ])
        )

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi')
    def test_get_metric_profile_if_wrong_name_superuser(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi')
    def test_get_metric_profile_if_wrong_name_regular_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi')
    def test_get_metric_profile_if_wrong_name_limited_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_metric_profile_superuser(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "EGI",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.MetricProfiles.objects.get(name='new-profile')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        )
        self.assertEqual(profile.name, 'new-profile')
        self.assertEqual(profile.apiid, '12341234-aaaa-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(history.count(), 1)
        self.assertEqual(history[0].comment, 'Initial version.')

    def test_post_metric_profile_regular_user(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "EGI",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        profile = poem_models.MetricProfiles.objects.get(name='new-profile')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(profile.name, 'new-profile')
        self.assertEqual(profile.apiid, '12341234-aaaa-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(history.count(), 1)
        self.assertEqual(history[0].comment, 'Initial version.')

    def test_post_metric_profile_regular_user_wrong_group(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "new-group",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign metric profiles to the given '
            'group.'
        )
        self.assertRaises(
            poem_models.MetricProfiles.DoesNotExist,
            poem_models.MetricProfiles.objects.get,
            name='new-profile'
        )
        self.assertEqual(len(poem_models.MetricProfiles.objects.all()), 2)

    def test_post_metric_profile_limited_user(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "EGI",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric profiles.'
        )
        self.assertRaises(
            poem_models.MetricProfiles.DoesNotExist,
            poem_models.MetricProfiles.objects.get,
            name='new-profile'
        )
        self.assertEqual(len(poem_models.MetricProfiles.objects.all()), 2)

    def test_post_metric_profile_nonexisting_group_superuser(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "nonexisting",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of metric profiles not found.'
        )
        self.assertRaises(
            poem_models.MetricProfiles.DoesNotExist,
            poem_models.MetricProfiles.objects.get,
            name='new-profile'
        )

    def test_post_metric_profile_nonexisting_group_regular_user(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "nonexisting",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of metric profiles not found.'
        )
        self.assertRaises(
            poem_models.MetricProfiles.DoesNotExist,
            poem_models.MetricProfiles.objects.get,
            name='new-profile'
        )

    def test_post_metric_profile_nonexisting_group_limited_user(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "nonexisting",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric profiles.'
        )
        self.assertRaises(
            poem_models.MetricProfiles.DoesNotExist,
            poem_models.MetricProfiles.objects.get,
            name='new-profile'
        )

    def test_post_metric_profile_without_description_superuser(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "EGI",
            "description": "",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.MetricProfiles.objects.get(name='new-profile')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        )
        self.assertEqual(profile.name, 'new-profile')
        self.assertEqual(profile.apiid, '12341234-aaaa-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(profile.description, '')
        self.assertEqual(history.count(), 1)
        self.assertEqual(history[0].comment, 'Initial version.')

    def test_post_metric_profile_without_description_regular_user(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "EGI",
            "description": "",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        profile = poem_models.MetricProfiles.objects.get(name='new-profile')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(profile.name, 'new-profile')
        self.assertEqual(profile.apiid, '12341234-aaaa-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(profile.description, '')
        self.assertEqual(history.count(), 1)
        self.assertEqual(history[0].comment, 'Initial version.')

    def test_post_metric_profile_without_desc_regular_user_wrong_group(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "new-group",
            "description": "",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign metric profiles to the given '
            'group.'
        )
        self.assertRaises(
            poem_models.MetricProfiles.DoesNotExist,
            poem_models.MetricProfiles.objects.get,
            name='new-profile'
        )

    def test_post_metric_profile_without_description_limited_user(self):
        data = {
            "apiid": "12341234-aaaa-kkkk-aaaa-aaeekkccnnee",
            "name": "new-profile",
            "groupname": "EGI",
            "description": "",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric profiles.'
        )
        self.assertRaises(
            poem_models.MetricProfiles.DoesNotExist,
            poem_models.MetricProfiles.objects.get,
            name='new-profile'
        )

    def test_post_metric_profile_invalid_data_superuser(self):
        data = {'name': 'new-profile'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'apiid: This field is required.'}
        )
        self.assertEqual(len(poem_models.MetricProfiles.objects.all()), 2)

    def test_post_metric_profile_invalid_data_regular_user(self):
        data = {'name': 'new-profile'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'apiid: This field is required.'
        )
        self.assertEqual(len(poem_models.MetricProfiles.objects.all()), 2)

    def test_post_metric_profile_invalid_data_limited_user(self):
        data = {'name': 'new-profile'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric profiles.'
        )
        self.assertEqual(len(poem_models.MetricProfiles.objects.all()), 2)

    def test_put_metric_profile_superuser(self):
        data = {
            "name": "TEST_PROFILE2",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "new-group",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'new-group')
        self.assertEqual(history.count(), 2)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(
            history[0].comment,
            '[{"added": {"fields": ["description"]}}, '
            '{"changed": {"fields": ["groupname"]}}]'
        )

    def test_put_metric_profile_regular_user(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "ARGO",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        group = poem_models.GroupOfMetricProfiles.objects.get(name='ARGO')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'ARGO')
        self.assertEqual(history.count(), 2)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(
            history[0].comment,
            '[{"added": {"fields": ["description"]}}, '
            '{"changed": {"fields": ["groupname"]}}]'
        )
        self.assertEqual(group.metricprofiles.all().count(), 1)

    def test_put_metric_profile_regular_user_wrong_group(self):
        data = {
            "name": "TEST_PROFILE2",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "new-group",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign metric profiles to the given '
            'group.'
        )
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        group = poem_models.GroupOfMetricProfiles.objects.get(name='new-group')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(history[0].comment, 'Initial version.')
        self.assertFalse(profile in group.metricprofiles.all())

    def test_put_metric_profile_regular_user_wrong_initial_group(self):
        mp3 = poem_models.MetricProfiles.objects.create(
            name='ARGO_MON',
            apiid='quaoqu7a-0nkd-09po-2ymk-aelitoch7ahz',
            groupname='new-group'
        )
        self.group.metricprofiles.add(mp3)
        mp_data = json.loads(
            serializers.serialize(
                'json', [mp3],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        mp_data[0]['fields'].update({
            'metricinstances': [
                [
                    'org.opensciencegrid.htcondorce',
                    'ch.cern.HTCondorCE-JobState'
                ],
                [
                    'org.opensciencegrid.htcondorce',
                    'ch.cern.HTCondorCE-JobSubmit'
                ]
            ]
        })
        poem_models.TenantHistory.objects.create(
            object_id=mp3.id,
            serialized_data=json.dumps(mp_data),
            object_repr=mp3.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )
        data = {
            "name": "ARGO_MON_CRITICAL",
            "apiid": "quaoqu7a-0nkd-09po-2ymk-aelitoch7ahz",
            "groupname": "EGI",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric profiles in the given '
            'group.'
        )
        profile = poem_models.MetricProfiles.objects.get(name='ARGO_MON')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(profile.apiid, 'quaoqu7a-0nkd-09po-2ymk-aelitoch7ahz')
        self.assertEqual(profile.groupname, 'new-group')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                [
                    'org.opensciencegrid.htcondorce',
                    'ch.cern.HTCondorCE-JobState'
                ],
                [
                    'org.opensciencegrid.htcondorce',
                    'ch.cern.HTCondorCE-JobSubmit'
                ]
            ]
        )
        self.assertEqual(history[0].comment, 'Initial version.')

    def test_put_metric_profile_limited_user(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "new-group",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric profiles.'
        )
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        group = poem_models.GroupOfMetricProfiles.objects.get(name='new-group')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(history[0].comment, 'Initial version.')
        self.assertFalse(profile in group.metricprofiles.all())

    def test_put_metric_profile_nonexisting_group_superuser(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "nonexisting",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'],
            'Given group of metric profiles does not exist.'
        )
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(history[0].comment, 'Initial version.')

    def test_put_metric_profile_nonexisting_group_regular_user(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "nonexisting",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'],
            'Given group of metric profiles does not exist.'
        )
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(history[0].comment, 'Initial version.')

    def test_put_metric_profile_nonexisting_group_limited_user(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "nonexisting",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric profiles.'
        )
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(history[0].comment, 'Initial version.')

    def test_put_metric_profile_without_description_superuser(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "new-group",
            "description": "",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'new-group')
        self.assertEqual(profile.description, '')
        self.assertEqual(history.count(), 2)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['description'], profile.description)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(
            history[0].comment,
            '[{"changed": {"fields": ["groupname"]}}]'
        )

    def test_put_metric_profile_without_description_regular_user(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "ARGO",
            "description": "",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'ARGO')
        self.assertEqual(profile.description, '')
        self.assertEqual(history.count(), 2)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['description'], profile.description)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(
            history[0].comment,
            '[{"changed": {"fields": ["groupname"]}}]'
        )

    def test_put_metric_profile_without_description_regular_user_wrong_gr(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "new-group",
            "description": "",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign metric profiles to the given '
            'group.'
        )
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(profile.description, '')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['description'], profile.description)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(history[0].comment, 'Initial version.')

    def test_put_metric_profile_without_description_limited_user(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "00000000-oooo-kkkk-aaaa-aaeekkccnnee",
            "groupname": "new-group",
            "description": "",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric profiles.'
        )
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        self.assertEqual(profile.description, '')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['description'], profile.description)
        self.assertEqual(
            serialized_data['metricinstances'],
            [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        )
        self.assertEqual(history[0].comment, 'Initial version.')

    def test_put_metric_profile_without_apiid_superuser(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "",
            "groupname": "new-group",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Apiid field undefined!'}
        )

    def test_put_metric_profile_without_apiid_regular_user(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "",
            "groupname": "ARGO",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Apiid field undefined!'}
        )

    def test_put_metric_profile_without_apiid_regular_user_wrong_group(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "",
            "groupname": "new-group",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign metric profiles to the given '
            'group.'
        )

    def test_put_metric_profile_without_apiid_limited_user(self):
        data = {
            "name": "TEST_PROFILE",
            "apiid": "",
            "groupname": "new-group",
            "description": "New profile description.",
            "services": [
                {"service": "AMGA", "metric": "org.nagios.SAML-SP"},
                {"service": "APEL", "metric": "org.apel.APEL-Pub"},
                {"service": "APEL", "metric": "org.apel.APEL-Sync"}
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric profiles.'
        )

    def test_delete_metric_profile_superuser(self):
        request = self.factory.delete(
            self.url + '12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        force_authenticate(request, user=self.superuser)
        response = self.view(request, '12341234-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        all_profiles = poem_models.MetricProfiles.objects.all().values_list(
            'name', flat=True
        )
        self.assertFalse('ANOTHER-PROFILE' in all_profiles)
        history = poem_models.TenantHistory.objects.filter(
            object_id=self.mp2.id, content_type=self.ct
        )
        self.assertEqual(history.count(), 0)

    def test_delete_metric_profile_regular_user(self):
        request = self.factory.delete(
            self.url + '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        all_profiles = poem_models.MetricProfiles.objects.all().values_list(
            'name', flat=True
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse('TEST_PROFILE' in all_profiles)
        history = poem_models.TenantHistory.objects.filter(
            object_id=self.mp1.id, content_type=self.ct
        )
        self.assertEqual(history.count(), 0)

    def test_delete_metric_profile_regular_user_wrong_group(self):
        request = self.factory.delete(
            self.url + '12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, '12341234-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric profiles assigned to '
            'this group.'
        )
        self.assertEqual(poem_models.MetricProfiles.objects.all().count(), 2)

    def test_delete_metric_profile_limited_user(self):
        request = self.factory.delete(
            self.url + '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        force_authenticate(request, user=self.limited_user)
        response = self.view(request, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric profiles.'
        )
        self.assertEqual(poem_models.MetricProfiles.objects.all().count(), 2)

    def test_delete_metric_profile_with_wrong_id_superuser(self):
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data, {'detail': 'Metric profile not found'}
        )

    def test_delete_metric_profile_with_wrong_id_regular_user(self):
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data, {'detail': 'Metric profile not found'}
        )

    def test_delete_metric_profile_with_wrong_id_limited_user(self):
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric profiles.'
        )

    def test_delete_metric_profile_without_specifying_apiid_superuser(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Metric profile not specified!'}
        )

    def test_delete_metric_profile_without_specifying_apiid_regular_user(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Metric profile not specified!'}
        )

    def test_delete_metric_profile_without_specifying_apiid_limited_user(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Metric profile not specified!'}
        )
