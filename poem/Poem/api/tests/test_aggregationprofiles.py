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


class ListAggregationsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAggregations.as_view()
        self.url = '/api/v2/internal/aggregations/'
        self.user = CustUser.objects.create(username='testuser')
        self.superuser = CustUser.objects.create(
            username='poem', is_superuser=True
        )

        self.aggr1 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.aggr2 = poem_models.Aggregation.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        self.aggr3 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE2',
            apiid='eemie0le-k7zg-6iyq-38t5-wohngoh9hoey',
            groupname='new-group'
        )

        self.group = poem_models.GroupOfAggregations.objects.create(name='EGI')
        poem_models.GroupOfAggregations.objects.create(name='new-group')
        group2 = poem_models.GroupOfAggregations.objects.create(name='ARGO')

        userprofile = poem_models.UserProfile.objects.create(user=self.user)
        userprofile.groupsofaggregations.add(self.group)
        userprofile.groupsofaggregations.add(group2)

        poem_models.UserProfile.objects.create(user=self.superuser)

        self.ct = ContentType.objects.get_for_model(poem_models.Aggregation)

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
                    'name': 'Group2',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'VOMS',
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
            content_type=self.ct
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.aggr2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'endpoint_group': 'servicegroups',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': [
                {
                    'name': 'Group3',
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

        poem_models.TenantHistory.objects.create(
            object_id=self.aggr2.id,
            serialized_data=json.dumps(data),
            object_repr=self.aggr2.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.aggr3],
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
                    'name': 'Group4',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.aggr3.id,
            serialized_data=json.dumps(data),
            object_repr=self.aggr3.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )

    @patch('Poem.api.internal_views.aggregationprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_all_aggregations(self, func):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
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
                OrderedDict([
                    ('name', 'TEST_PROFILE2'),
                    ('description', ''),
                    ('apiid', 'eemie0le-k7zg-6iyq-38t5-wohngoh9hoey'),
                    ('groupname', 'new-group')
                ])
            ]
        )

    @patch('Poem.api.internal_views.aggregationprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_aggregation_by_name(self, func):
        request = self.factory.get(self.url + 'TEST_PROFILE')
        request.tenant = self.tenant
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

    @patch('Poem.api.internal_views.aggregationprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_aggregation_if_wrong_name(self, func):
        request = self.factory.get(self.url + 'nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_aggregation(self):
        data = {
            'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
            'name': 'new-profile',
            'groupname': 'EGI',
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': json.dumps([
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
                }
            ])
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        profile = poem_models.Aggregation.objects.get(name='new-profile')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(profile.name, 'new-profile')
        self.assertEqual(profile.apiid, '12341234-aaaa-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['endpoint_group'], 'sites')
        self.assertEqual(serialized_data['metric_operation'], 'AND')
        self.assertEqual(serialized_data['profile_operation'], 'AND')
        self.assertEqual(
            serialized_data['groups'],
            [
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
                }
            ]
        )

    def test_post_aggregation_superuser(self):
        data = {
            'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
            'name': 'new-profile',
            'groupname': 'EGI',
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': json.dumps([
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
                }
            ])
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        profile = poem_models.Aggregation.objects.get(name='new-profile')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(profile.name, 'new-profile')
        self.assertEqual(profile.apiid, '12341234-aaaa-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['endpoint_group'], 'sites')
        self.assertEqual(serialized_data['metric_operation'], 'AND')
        self.assertEqual(serialized_data['profile_operation'], 'AND')
        self.assertEqual(
            serialized_data['groups'],
            [
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
                }
            ]
        )

    def test_post_aggregations_invalid_data(self):
        data = {'name': 'new-profile'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'apiid: This field is required.'}
        )

    def test_post_aggregations_invalid_data_superuser(self):
        data = {'name': 'new-profile'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'apiid: This field is required.'}
        )

    def test_post_aggregations_no_group_permission(self):
        data = {
            'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
            'name': 'new-profile',
            'groupname': 'new-group',
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': json.dumps([
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
                }
            ])
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data,
            {
                'detail': 'You do not have permission to add resources to the '
                          'given group.'
            }
        )

    def test_post_aggregations_no_group_permission_superuser(self):
        data = {
            'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
            'name': 'new-profile',
            'groupname': 'new-group',
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': json.dumps([
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
                }
            ])
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.Aggregation.objects.get(name='new-profile')
        self.assertEqual(profile.apiid, '12341234-aaaa-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'new-group')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(history.count(), 1)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['endpoint_group'], 'sites')
        self.assertEqual(serialized_data['metric_operation'], 'AND')
        self.assertEqual(serialized_data['profile_operation'], 'AND')
        self.assertEqual(
            serialized_data['groups'],
            [
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
                }
            ]
        )

    def test_post_aggregations_nonexisting_group(self):
        data = {
            'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
            'name': 'new-profile',
            'groupname': 'nonexisting-group',
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': json.dumps([
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
                }
            ])
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {
                'detail': 'Given group of aggregations does not exist.'
            }
        )

    def test_post_aggregations_nonexisting_group_superuser(self):
        data = {
            'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
            'name': 'new-profile',
            'groupname': 'nonexisting-group',
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': json.dumps([
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
                }
            ])
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {
                'detail': 'Given group of aggregations does not exist.'
            }
        )

    def test_post_aggregations_without_groupname(self):
        data = {
            'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
            'name': 'new-profile',
            'groupname': '',
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': json.dumps([
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
                }
            ])
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                'detail': 'You must provide a group of aggregations.'
            }
        )

    def test_post_aggregations_without_groupname_superuser(self):
        data = {
            'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
            'name': 'new-profile',
            'groupname': '',
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': json.dumps([
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
                }
            ])
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                'detail': 'You must provide a group of aggregations.'
            }
        )

    def test_put_aggregations(self):
        data = {
            'name': 'TEST_PROFILE2',
            'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            'groupname': 'ARGO',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.Aggregation.objects.get(id=self.aggr1.id)
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'ARGO')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(history.count(), 2)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['endpoint_group'], 'servicegroups')
        self.assertEqual(serialized_data['metric_operation'], 'OR')
        self.assertEqual(serialized_data['profile_operation'], 'AND')
        self.assertEqual(serialized_data['metric_profile'], 'PROFILE2')
        self.assertEqual(
            serialized_data['groups'],
            [
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ]
        )

    def test_put_aggregations_superuser(self):
        data = {
            'name': 'TEST_PROFILE',
            'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            'groupname': 'ARGO',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.Aggregation.objects.get(id=self.aggr1.id)
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'ARGO')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(history.count(), 2)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['endpoint_group'], 'servicegroups')
        self.assertEqual(serialized_data['metric_operation'], 'OR')
        self.assertEqual(serialized_data['profile_operation'], 'AND')
        self.assertEqual(serialized_data['metric_profile'], 'PROFILE2')
        self.assertEqual(
            serialized_data['groups'],
            [
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ]
        )

    def test_put_aggregations_no_apiid(self):
        data = {
            'name': 'TEST_PROFILE',
            'apiid': '',
            'groupname': 'new-group',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Apiid field undefined!'}
        )

    def test_put_aggregations_no_apiid_superuser(self):
        data = {
            'name': 'TEST_PROFILE',
            'apiid': '',
            'groupname': 'new-group',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Apiid field undefined!'}
        )

    def test_put_aggregations_nonexisting_apiid(self):
        data = {
            'name': 'TEST_PROFILE',
            'apiid': '00000000-0000-0000-0000-000000000000',
            'groupname': 'new-group',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {'detail': 'Aggregation profile with given apiid does not exist.'}
        )

    def test_put_aggregations_nonexisting_apiid_superuser(self):
        data = {
            'name': 'TEST_PROFILE',
            'apiid': '00000000-0000-0000-0000-000000000000',
            'groupname': 'new-group',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {'detail': 'Aggregation profile with given apiid does not exist.'}
        )

    def test_put_aggregations_nonexisting_groupname(self):
        data = {
            'name': 'TEST_PROFILE',
            'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            'groupname': 'nonexisting-group',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {
                'detail': 'Given group of aggregations does not exist.'
            }
        )

    def test_put_aggregations_nonexisting_groupname_superuser(self):
        data = {
            'name': 'TEST_PROFILE',
            'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            'groupname': 'nonexisting-group',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {
                'detail': 'Given group of aggregations does not exist.'
            }
        )

    def test_put_aggregations_nonexisting_initial_groupname(self):
        aggr4 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE3',
            apiid='iv5beeth-v9db-64lw-ak3s-cohjo6ies2da',
            groupname='NONEXISTING'
        )
        history_data = json.loads(
            serializers.serialize(
                'json', [aggr4],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        history_data[0]['fields'].update({
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': [
                {
                    'name': 'Group4',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=aggr4.id,
            serialized_data=json.dumps(history_data),
            object_repr=aggr4.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )

        data = {
            'name': 'TEST_PROFILE3',
            'apiid': 'iv5beeth-v9db-64lw-ak3s-cohjo6ies2da',
            'groupname': 'ARGO',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {
                "detail": "Initial profile's group of aggregations does not "
                          "exist."
            }
        )

    def test_put_aggregations_nonexisting_initial_groupname_superuser(self):
        aggr4 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE3',
            apiid='iv5beeth-v9db-64lw-ak3s-cohjo6ies2da',
            groupname='NONEXISTING'
        )
        history_data = json.loads(
            serializers.serialize(
                'json', [aggr4],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        history_data[0]['fields'].update({
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': [
                {
                    'name': 'Group4',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=aggr4.id,
            serialized_data=json.dumps(history_data),
            object_repr=aggr4.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )

        data = {
            'name': 'TEST_PROFILE3',
            'apiid': 'iv5beeth-v9db-64lw-ak3s-cohjo6ies2da',
            'groupname': 'ARGO',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.Aggregation.objects.get(
            apiid='iv5beeth-v9db-64lw-ak3s-cohjo6ies2da'
        )
        self.assertEqual(profile.name, 'TEST_PROFILE3')
        self.assertEqual(profile.groupname, 'ARGO')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(history.count(), 2)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['endpoint_group'], 'servicegroups')
        self.assertEqual(serialized_data['metric_operation'], 'OR')
        self.assertEqual(serialized_data['profile_operation'], 'AND')
        self.assertEqual(serialized_data['metric_profile'], 'PROFILE2')
        self.assertEqual(
            serialized_data['groups'],
            [
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ]
        )

    def test_put_aggregations_no_group_permission(self):
        data = {
            'name': 'TEST_PROFILE2',
            'apiid': 'eemie0le-k7zg-6iyq-38t5-wohngoh9hoey',
            'groupname': 'ARGO',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data,
            {
                'detail': 'You do not have permission to change resources in '
                          'the given group.'
            }
        )

    def test_put_aggregations_no_group_permission_superuser(self):
        data = {
            'name': 'TEST_PROFILE2',
            'apiid': 'eemie0le-k7zg-6iyq-38t5-wohngoh9hoey',
            'groupname': 'ARGO',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.Aggregation.objects.get(name='TEST_PROFILE2')
        self.assertEqual(profile.apiid, 'eemie0le-k7zg-6iyq-38t5-wohngoh9hoey')
        self.assertEqual(profile.groupname, 'ARGO')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by("-date_created")
        self.assertEqual(history.count(), 2)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['endpoint_group'], 'servicegroups')
        self.assertEqual(serialized_data['metric_operation'], 'OR')
        self.assertEqual(serialized_data['profile_operation'], 'AND')
        self.assertEqual(serialized_data['metric_profile'], 'PROFILE2')
        self.assertEqual(
            serialized_data['groups'],
            [
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ]
        )

    def test_put_aggregations_without_groupname(self):
        data = {
            'name': 'ANOTHER-PROFILE',
            'apiid': '12341234-oooo-kkkk-aaaa-aaeekkccnnee',
            'groupname': 'ARGO',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data,
            {
                'detail': 'You do not have permission to change resources in '
                          'the given group.'
            }
        )

    def test_put_aggregations_without_groupname_superuser(self):
        data = {
            'name': 'ANOTHER-PROFILE',
            'apiid': '12341234-oooo-kkkk-aaaa-aaeekkccnnee',
            'groupname': 'ARGO',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(profile.apiid, '12341234-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'ARGO')
        history = poem_models.TenantHistory.objects.filter(
            object_id=profile.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(history.count(), 2)
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], profile.name)
        self.assertEqual(serialized_data['apiid'], profile.apiid)
        self.assertEqual(serialized_data['groupname'], profile.groupname)
        self.assertEqual(serialized_data['endpoint_group'], 'servicegroups')
        self.assertEqual(serialized_data['metric_operation'], 'OR')
        self.assertEqual(serialized_data['profile_operation'], 'AND')
        self.assertEqual(serialized_data['metric_profile'], 'PROFILE2')
        self.assertEqual(
            serialized_data['groups'],
            [
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ]
        )

    def test_put_aggregations_without_setting_groupname(self):
        data = {
            'name': 'TEST_PROFILE',
            'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            'groupname': '',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'detail': 'Please provide group of aggregations.'
            }
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_put_aggregations_without_setting_groupname_superuser(self):
        data = {
            'name': 'TEST_PROFILE',
            'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            'groupname': '',
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'AND',
            'metric_profile': 'PROFILE2',
            'groups': json.dumps([
                {
                    'name': 'Group3',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'AND'
                        }
                    ]
                }
            ])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'detail': 'Please provide group of aggregations.'
            }
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_aggregation(self):
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.aggr1.id, content_type=self.ct
            ).count(), 1
        )
        request = self.factory.delete(
            self.url + '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        profiles = poem_models.Aggregation.objects.all().values_list(
            'name', flat=True
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse('TEST_PROFILE' in profiles)
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.aggr1.id, content_type=self.ct
            ).count(), 0
        )

    def test_delete_aggregation_superuser(self):
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.aggr1.id, content_type=self.ct
            ).count(), 1
        )
        request = self.factory.delete(
            self.url + '00000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        force_authenticate(request, user=self.superuser)
        response = self.view(request, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        profiles = poem_models.Aggregation.objects.all().values_list(
            'name', flat=True
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse('TEST_PROFILE' in profiles)
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.aggr1.id, content_type=self.ct
            ).count(), 0
        )

    def test_delete_aggregation_with_wrong_id(self):
        self.assertEqual(
            len(poem_models.Aggregation.objects.all()), 3
        )
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data, {'detail': 'Aggregation not found'}
        )
        self.assertEqual(
            len(poem_models.Aggregation.objects.all()), 3
        )

    def test_delete_aggregation_with_wrong_id_superuser(self):
        self.assertEqual(
            len(poem_models.Aggregation.objects.all()), 3
        )
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data, {'detail': 'Aggregation not found'}
        )
        self.assertEqual(
            len(poem_models.Aggregation.objects.all()), 3
        )

    def test_delete_aggregation_without_specifying_apiid(self):
        self.assertEqual(
            len(poem_models.Aggregation.objects.all()), 3
        )
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Aggregation profile not specified!'}
        )
        self.assertEqual(
            len(poem_models.Aggregation.objects.all()), 3
        )

    def test_delete_aggregation_without_specifying_apiid_superuser(self):
        self.assertEqual(
            len(poem_models.Aggregation.objects.all()), 3
        )
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'Aggregation profile not specified!'}
        )
        self.assertEqual(
            len(poem_models.Aggregation.objects.all()), 3
        )

    def test_delete_aggregation_without_group_permission(self):
        request = self.factory.delete(
            self.url + 'eemie0le-k7zg-6iyq-38t5-wohngoh9hoey'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, 'eemie0le-k7zg-6iyq-38t5-wohngoh9hoey')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data,
            {
                'detail': 'You do not have group permission to delete this '
                          'aggregation profile.'
            }
        )

    def test_delete_aggregation_without_group_permission_superuser(self):
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.aggr3.id, content_type=self.ct
            ).count(), 1
        )
        request = self.factory.delete(
            self.url + 'eemie0le-k7zg-6iyq-38t5-wohngoh9hoey'
        )
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'eemie0le-k7zg-6iyq-38t5-wohngoh9hoey')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        profiles = poem_models.Aggregation.objects.all().values_list(
            'name', flat=True
        )
        self.assertFalse('TEST_PROFILE2' in profiles)
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.aggr3.id, content_type=self.ct
            ).count(), 0
        )

    def test_delete_aggregation_without_initial_group(self):
        request = self.factory.delete(
            self.url + '12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, '12341234-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data,
            {
                'detail': 'You do not have group permission to delete this '
                          'aggregation profile.'
            }
        )

    def test_delete_aggregation_without_initial_group_superuser(self):
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.aggr2.id, content_type=self.ct
            ).count(), 1
        )
        request = self.factory.delete(
            self.url + '12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        force_authenticate(request, user=self.superuser)
        response = self.view(request, '12341234-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        profiles = poem_models.Aggregation.objects.all().values_list(
            'name', flat=True
        )
        self.assertFalse('ANOTHER-PROFILE' in profiles)
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.aggr2.id, content_type=self.ct
            ).count(), 0
        )

    def test_delete_aggregation_with_nonexisting_initial_group(self):
        aggr4 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE3',
            apiid='iv5beeth-v9db-64lw-ak3s-cohjo6ies2da',
            groupname='NONEXISTING'
        )
        history_data = json.loads(
            serializers.serialize(
                'json', [aggr4],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        history_data[0]['fields'].update({
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': [
                {
                    'name': 'Group4',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=aggr4.id,
            serialized_data=json.dumps(history_data),
            object_repr=aggr4.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )

        request = self.factory.delete(
            self.url + 'iv5beeth-v9db-64lw-ak3s-cohjo6ies2da'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, 'iv5beeth-v9db-64lw-ak3s-cohjo6ies2da')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data,
            {
                'detail': 'You do not have group permission to delete this '
                          'aggregation profile.'
            }
        )

    def test_delete_aggregation_with_nonexisting_initial_group_superuser(self):
        aggr4 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE3',
            apiid='iv5beeth-v9db-64lw-ak3s-cohjo6ies2da',
            groupname='NONEXISTING'
        )
        history_data = json.loads(
            serializers.serialize(
                'json', [aggr4],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        history_data[0]['fields'].update({
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': [
                {
                    'name': 'Group4',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=aggr4.id,
            serialized_data=json.dumps(history_data),
            object_repr=aggr4.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct
        )

        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=aggr4.id, content_type=self.ct
            ).count(), 1
        )
        request = self.factory.delete(
            self.url + 'iv5beeth-v9db-64lw-ak3s-cohjo6ies2da'
        )
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'iv5beeth-v9db-64lw-ak3s-cohjo6ies2da')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        profiles = poem_models.Aggregation.objects.all().values_list(
            'name', flat=True
        )
        self.assertFalse('TEST_PROFILE3' in profiles)
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=aggr4.id, content_type=self.ct
            ).count(), 0
        )
