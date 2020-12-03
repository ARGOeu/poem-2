import json
from collections import OrderedDict
from unittest.mock import patch

from Poem.api import views_internal as views
from Poem.poem import models as poem_models
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from rest_framework import status
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from .utils_test import mocked_func, encode_data


class ListServiceFlavoursAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAllServiceFlavours.as_view()
        self.url = '/api/v2/internal/serviceflavoursall/'
        self.user = CustUser.objects.create(username='testuser')

        poem_models.ServiceFlavour.objects.create(
            name='SRM',
            description='Storage Resource Manager.'
        )

        poem_models.ServiceFlavour.objects.create(
            name='org.onedata.oneprovider',
            description='Oneprovider is a Onedata component...'
        )

        poem_models.ServiceFlavour.objects.create(
            name='CREAM-CE',
            description='[Site service] The CREAM Compute Element is the new '
                        'CE within the gLite middleware stack.'
        )

    def test_get_service_flavours(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'name': 'CREAM-CE',
                    'description': '[Site service] The CREAM Compute Element '
                                   'is the new CE within the gLite middleware '
                                   'stack.'
                },
                {
                    'name': 'org.onedata.oneprovider',
                    'description': 'Oneprovider is a Onedata component...'
                },
                {
                    'name': 'SRM',
                    'description': 'Storage Resource Manager.'
                }
            ]
        )


class ListMetricProfilesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricProfiles.as_view()
        self.url = '/api/v2/internal/metricprofiles/'
        self.user = CustUser.objects.create(username='testuser')

        self.ct = ContentType.objects.get_for_model(poem_models.MetricProfiles)

        mp1 = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.mp2 = poem_models.MetricProfiles.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        poem_models.GroupOfMetricProfiles.objects.create(name='EGI')
        poem_models.GroupOfMetricProfiles.objects.create(name='new-group')

        data1 = json.loads(
            serializers.serialize(
                'json', [mp1],
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
            object_id=mp1.id,
            serialized_data=json.dumps(data1),
            object_repr=mp1.__str__(),
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
    def test_get_all_metric_profiles(self, func):
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
    def test_get_metric_profile_by_name(self, func):
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
    def test_get_metric_profile_if_wrong_name(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_metric_profile(self):
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

    def test_post_metric_profile_without_description(self):
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

    def test_post_metric_profile_invalid_data(self):
        data = {'name': 'new-profile'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'apiid: This field is required.'}
        )

    def test_put_metric_profile(self):
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
        force_authenticate(request, user=self.user)
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

    def test_put_metric_profile_without_description(self):
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

    def test_put_metric_profile_without_apiid(self):
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
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Apiid field undefined!'}
        )

    def test_delete_metric_profile(self):
        request = self.factory.delete(
            self.url + '12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, '12341234-oooo-kkkk-aaaa-aaeekkccnnee')
        all_profiles = poem_models.MetricProfiles.objects.all().values_list(
            'name', flat=True
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse('ANOTHER-PROFILE' in all_profiles)
        history = poem_models.TenantHistory.objects.filter(
            object_id=self.mp2.id, content_type=self.ct
        )
        self.assertEqual(history.count(), 0)

    def test_delete_metric_profile_with_wrong_id(self):
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data, {'detail': 'Metric profile not found'}
        )

    def test_delete_metric_profile_without_specifying_apiid(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Metric profile not specified!'}
        )
