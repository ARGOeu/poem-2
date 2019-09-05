from collections import OrderedDict
import datetime

from django.contrib.contenttypes.models import ContentType
from django.test.client import encode_multipart

from Poem.api import views_internal as views
from Poem.api.internal_views.metrics import inline_metric_for_db
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.users.models import CustUser

from rest_framework.test import force_authenticate
from rest_framework import status
from rest_framework_api_key.models import APIKey

from reversion.models import Revision, Version

from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory
from tenant_schemas.utils import schema_context, get_public_schema_name

from unittest.mock import patch


def encode_data(data):
    content = encode_multipart('BoUnDaRyStRiNg', data)
    content_type = 'multipart/form-data; boundary=BoUnDaRyStRiNg'

    return content, content_type


def mocked_func(*args):
    pass


class ListMetricsInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricsInGroup.as_view()
        self.url = '/api/v2/internal/metricsgroup/EOSC'
        self.user = CustUser.objects.create(username='testuser')

        metric1 = poem_models.Metrics.objects.create(name='org.apel.APEL-Pub', id=1)
        metric2 = poem_models.Metrics.objects.create(name='org.apel.APEL-Sync', id=2)

        group1 = poem_models.GroupOfMetrics.objects.create(name='EOSC')
        group1.metrics.add(metric1)
        group1.metrics.add(metric2)

        poem_models.GroupOfMetrics.objects.create(name='Empty_group')

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
        data = {'id': self.id1, 'name': 'EGI2', 'revoked': False}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        changed_entry = APIKey.objects.get(id=self.id1)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual('EGI2', changed_entry.client_id)

    def test_put_token_with_name_that_already_exists(self):
        data = {'id': self.id1, 'name': 'EUDAT', 'revoked': False}
        content = encode_multipart('BoUnDaRyStRiNg', data)
        content_type = 'multipart/form-data; boundary=BoUnDaRyStRiNg'
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_post_token(self):
        data = {'name': 'test', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_post_token_name_already_exists(self):
        data = {'name': 'EUDAT', 'revoked': False}
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

        self.groupofmetrics = poem_models.GroupOfMetrics.objects.create(name='Metric1')
        self.groupofmetricprofiles = poem_models.GroupOfMetricProfiles.objects.create(name='MP1')
        self.groupofaggregations = poem_models.GroupOfAggregations.objects.create(name='Aggr1')

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
    def test_post_user(self, aggr, metr, mp):
        aggr.return_value = self.groupofaggregations
        metr.return_value = self.groupofmetrics
        mp.return_value = self.groupofmetricprofiles
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
        userprof = poem_models.UserProfile.objects.get(user=user)
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

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            version='0.1.7',
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probe2 = admin_models.Probe.objects.create(
            name='argo-web-api',
            version='0.1.7',
            description='This is a probe for checking AR and status reports are'
                        ' properly working.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        with schema_context(get_public_schema_name()):
            user = CustUser.objects.create_user('superadmin')
            revision1 = Revision.objects.create(
                date_created=datetime.datetime.now(),
                comment='Initial version.',
                user=user
            )

            revision2 = Revision.objects.create(
                date_created=datetime.datetime.now(),
                comment='Initial version',
                user=user
            )

        admin_models.ExtRevision.objects.create(
            probeid=probe1.id,
            version=probe1.version,
            revision=revision1
        )

        admin_models.ExtRevision.objects.create(
            probeid=probe2.id,
            version=probe2.version,
            revision=revision2
        )


    def test_get_list_of_all_probes(self):
        request = self.factory.get(self.url_base)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'name': 'ams-probe',
                    'version': '0.1.7',
                    'docurl':
                        'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                        'master/README.md',
                    'description': 'Probe is inspecting AMS service by trying '
                                   'to publish and consume randomly generated '
                                   'messages.',
                    'comment': 'Initial version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'nv': 1
                },
                {
                    'name': 'argo-web-api',
                    'version': '0.1.7',
                    'description': 'This is a probe for checking AR and status '
                                   'reports are properly working.',
                    'comment': 'Initial version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/'
                              'blob/master/README.md',
                    'nv': 1
                }
            ]
        )

    def test_get_probe_by_name(self):
        request = self.factory.get(self.url_base + 'ams-probe')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ams-probe')
        self.assertEqual(
            response.data,
            {
                'name': 'ams-probe',
                'version': '0.1.7',
                'docurl':
                    'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                    'README.md',
                'description': 'Probe is inspecting AMS service by trying to '
                               'publish and consume randomly generated '
                               'messages.',
                'comment': 'Initial version.',
                'repository': 'https://github.com/ARGOeu/nagios-plugins-argo'
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
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ListServicesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListServices.as_view()
        self.url = '/api/v2/internal/services/'
        self.user = CustUser.objects.create(username='testuser')

        poem_models.Service.objects.create(
            id='2838b1ae-af25-4719-89c5-5484181d6201',
            service_id='7dc97be9-bcd9-46af-8bca-aa976bc8e207',
            service_name='B2SAFE',
            service_category='Storage & Data',
            service_version='1',
            service_type='b2safe.dsi',
            component_version='1.11.13',
            component_name='Storage',
            visible_to_marketplace=False,
            in_catalogue=True,
            external_service=False,
            internal_service=False
        )

        poem_models.Service.objects.create(
            id='31024d6a-9dd4-44d9-996e-599108ed23a7',
            service_id='39917801-850e-4378-9ca3-ea2d2bfc5860',
            service_name='EGI DataHub',
            service_category='Storage & Data',
            service_version='1',
            service_type='org.onedata.oneprovider',
            component_version='stable',
            component_name='OpenData',
            visible_to_marketplace=False,
            in_catalogue=True,
            external_service=False,
            internal_service=False
        )

        poem_models.Service.objects.create(
            id='4d297cea-5bf7-434a-b428-b52d35dfcac1',
            service_id='9689afb1-f5d6-4716-ae5e-9de347803884',
            service_name='EGI Online Storage',
            service_category='Storage & Data',
            service_version='1',
            service_type='SRM',
            component_version='1.11.13',
            component_name='Storage',
            visible_to_marketplace=False,
            in_catalogue=True,
            external_service=False,
            internal_service=False
        )

        poem_models.ServiceFlavour.objects.create(
            name='org.onedata.oneprovider',
            description='Oneprovider is a Onedata component...'
        )

        poem_models.ServiceFlavour.objects.create(
            name='SRM',
            description='Storage Resource Manager.'
        )

        poem_models.MetricInstance.objects.create(
            service_flavour='org.onedata.oneprovider',
            metric='org.onedata.Oneprovider-Health'
        )

        poem_models.MetricInstance.objects.create(
            service_flavour='org.onedata.oneprovider',
            metric='eu.egi.CertValidity'
        )

        poem_models.MetricInstance.objects.create(
            service_flavour='SRM',
            metric='hr.srce.SRM2-CertLifetime'
        )

        poem_models.MetricInstance.objects.create(
            service_flavour='SRM',
            metric='org.sam.SRM-All'
        )

        tag = poem_models.Tags.objects.create(
            name='Production'
        )

        mtype = poem_models.MetricType.objects.create(
            name='Active'
        )

        poem_models.Metric.objects.create(
            name='org.onedata.Oneprovider-Health',
            probeversion='check_oneprovider (3.2.0)',
            tag=tag,
            mtype=mtype
        )

        poem_models.Metric.objects.create(
            name='eu.egi.CertValidity',
            probeversion='check_ssl_cert (1.84.0)',
            tag=tag,
            mtype=mtype
        )

        poem_models.Metric.objects.create(
            name='hr.srce.SRM2-CertLifetime',
            probeversion='CertLifetime-probe (1.0.0)',
            tag=tag,
            mtype=mtype
        )

        poem_models.Metric.objects.create(
            name='org.sam.SRM-All',
            probeversion='SRM-probe (1.0.1)',
            tag=tag,
            mtype=mtype
        )

    def test_get_services(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {'result':
                {
                    'rows': [
                        {
                            'service_category': 'Storage & Data',
                            'service_name': 'EGI DataHub',
                            'service_type': 'org.onedata.oneprovider',
                            'metric': 'org.onedata.Oneprovider-Health',
                            'probe': 'check_oneprovider (3.2.0)'
                        },
                        {
                            'service_category': '',
                            'service_name': '',
                            'service_type': '',
                            'metric': 'eu.egi.CertValidity',
                            'probe': 'check_ssl_cert (1.84.0)'
                        },
                        {
                            'service_category': '',
                            'service_name': 'EGI Online Storage',
                            'service_type': 'SRM',
                            'metric': 'hr.srce.SRM2-CertLifetime',
                            'probe': 'CertLifetime-probe (1.0.0)'
                        },
                        {
                            'service_category': '',
                            'service_name': '',
                            'service_type': '',
                            'metric': 'org.sam.SRM-All',
                            'probe': 'SRM-probe (1.0.1)'
                        }
                    ],
                    'rowspan': {
                        'service_category': [
                            ('Storage & Data', 4 )
                        ],
                        'service_name': [
                            ('EGI DataHub', 2),
                            ('EGI Online Storage', 2)
                        ],
                        'service_type': [
                            ('org.onedata.oneprovider', 2),
                            ('SRM', 2)
                        ],
                        'metric': [
                            ('org.onedata.Oneprovider-Health', 1),
                            ('eu.egi.CertValidity', 1),
                            ('hr.srce.SRM2-CertLifetime', 1),
                            ('org.sam.SRM-All', 1)
                        ],
                        'probe': [
                            ('check_oneprovider (3.2.0)', 1),
                            ('check_ssl_cert (1.84.0)', 1),
                            ('CertLifetime-probe (1.0.0)', 1),
                            ('SRM-probe (1.0.1)', 1)
                        ]
                    }
                }
            }
        )


class ListAggregationsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAggregations.as_view()
        self.url = '/api/v2/internal/aggregations/'
        self.user = CustUser.objects.create(username='testuser')

        poem_models.Aggregation.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        poem_models.Aggregation.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        self.group = poem_models.GroupOfAggregations.objects.create(name='EGI')
        poem_models.GroupOfAggregations.objects.create(name='new-group')

    @patch('Poem.api.internal_views.aggregationprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_all_aggregations(self, func):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'TEST_PROFILE'),
                    ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', 'EGI')
                ]),
                OrderedDict([
                    ('name', 'ANOTHER-PROFILE'),
                    ('apiid', '12341234-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', '')
                ])
            ]
        )

    @patch('Poem.api.internal_views.aggregationprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_aggregation_by_name(self, func):
        request = self.factory.get(self.url + 'TEST_PROFILE')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'TEST_PROFILE')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('name', 'TEST_PROFILE'),
                ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                ('groupname', 'EGI')
            ])
        )

    @patch('Poem.api.internal_views.aggregationprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_aggregation_if_wrong_name(self, func):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_aggregation(self):
        data = {'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
                'name': 'new-profile',
                'groupname': 'EGI'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        profile = poem_models.Aggregation.objects.get(name='new-profile')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(profile.name, 'new-profile')
        self.assertEqual(profile.apiid, '12341234-aaaa-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')

    def test_post_aggregations_invalid_data(self):
        data = {'name': 'new-profile'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_put_aggregations(self):
        data = {'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                'groupname': 'new-group'}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'new-group')

    def test_delete_aggregation(self):
        request = self.factory.delete(self.url +
                                      '12341234-oooo-kkkk-aaaa-aaeekkccnnee')
        force_authenticate(request, user=self.user)
        response = self.view(request, '12341234-oooo-kkkk-aaaa-aaeekkccnnee')
        all = poem_models.Aggregation.objects.all().values_list(
            'name', flat=True
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse('ANOTHER-PROFILE' in all)

    def test_delete_aggregation_with_wrong_id(self):
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ListServiceFlavoursAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAllServiceFlavours.as_view()
        self.url = '/api/v2/internal/serviceflavoursall/'
        self.user = CustUser.objects.create(username='testuser')

        poem_models.ServiceFlavour.objects.create(
            name='org.onedata.oneprovider',
            description='Oneprovider is a Onedata component...'
        )

        poem_models.ServiceFlavour.objects.create(
            name='SRM',
            description='Storage Resource Manager.'
        )

    def test_get_service_flavours(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'org.onedata.oneprovider'),
                    ('description', 'Oneprovider is a Onedata component...')
                ]),
                OrderedDict([
                    ('name', 'SRM'),
                    ('description', 'Storage Resource Manager.')
                ])
            ]
        )


class ListAllMetricsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAllMetrics.as_view()
        self.url = '/api/v2/internal/metricsall/'
        self.user = CustUser.objects.create(username='testuser')

        poem_models.Metrics.objects.create(name='hr.srce.GRAM-Auth')
        poem_models.Metrics.objects.create(name='org.apel.APEL-Pub')

    def test_get_all_metrics(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'hr.srce.GRAM-Auth')
                ]),
                OrderedDict([
                    ('name', 'org.apel.APEL-Pub')
                ])
            ]
        )


class ListMetricProfilesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricProfiles.as_view()
        self.url = '/api/v2/internal/metricprofiles/'
        self.user = CustUser.objects.create(username='testuser')

        poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        poem_models.MetricProfiles.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        poem_models.GroupOfMetricProfiles.objects.create(name='EGI')
        poem_models.GroupOfMetricProfiles.objects.create(name='new-group')

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_all_metric_profiles(self, func):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'TEST_PROFILE'),
                    ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', 'EGI')
                ]),
                OrderedDict([
                    ('name', 'ANOTHER-PROFILE'),
                    ('apiid', '12341234-oooo-kkkk-aaaa-aaeekkccnnee'),
                    ('groupname', '')
                ])
            ]
        )

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_metric_profile_by_name(self, func):
        request = self.factory.get(self.url + 'TEST_PROFILE')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'TEST_PROFILE')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('name', 'TEST_PROFILE'),
                ('apiid', '00000000-oooo-kkkk-aaaa-aaeekkccnnee'),
                ('groupname', 'EGI')
            ])
        )

    @patch('Poem.api.internal_views.metricprofiles.sync_webapi',
           side_effect=mocked_func)
    def test_get_metric_profile_if_wrong_name(self, func):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_metric_profile(self):
        data = {'apiid': '12341234-aaaa-kkkk-aaaa-aaeekkccnnee',
                'name': 'new-profile',
                'groupname': 'EGI'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        profile = poem_models.MetricProfiles.objects.get(name='new-profile')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(profile.name, 'new-profile')
        self.assertEqual(profile.apiid, '12341234-aaaa-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'EGI')

    def test_post_metric_profile_invalid_data(self):
        data = {'name': 'new-profile'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_put_metric_profile(self):
        data = {'apiid': '00000000-oooo-kkkk-aaaa-aaeekkccnnee',
                'groupname': 'new-group'}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        self.assertEqual(profile.name, 'TEST_PROFILE')
        self.assertEqual(profile.apiid, '00000000-oooo-kkkk-aaaa-aaeekkccnnee')
        self.assertEqual(profile.groupname, 'new-group')

    def test_delete_metric_profile(self):
        request = self.factory.delete(self.url + 'ANOTHER-PROFILE')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ANOTHER-PROFILE')
        all = poem_models.MetricProfiles.objects.all().values_list(
            'name', flat=True
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse('ANOTHER-PROFILE' in all)

    def test_delete_metric_profile_with_wrong_id(self):
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


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
            is_staff=True,
            is_active=True,
            is_superuser=False
        )

        self.gm = poem_models.GroupOfMetrics.objects.create(name='EGI')
        self.ga = poem_models.GroupOfAggregations.objects.create(name='EUDAT')
        self.gmp = poem_models.GroupOfMetricProfiles.objects.create(name='SDC')

        userprofile = poem_models.UserProfile.objects.create(
            user=user1,
            subject='bla',
            displayname='First_User',
            egiid='blablabla'
        )
        userprofile.groupsofmetrics.add(self.gm)
        userprofile.groupsofaggregations.add(self.ga)
        userprofile.groupsofmetricprofiles.add(self.gmp)


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
            is_staff=True,
            is_active=True,
            is_superuser=False
        )

        gm = poem_models.GroupOfMetrics.objects.create(name='EGI')
        poem_models.GroupOfMetrics.objects.create(name='EUDAT')
        ga = poem_models.GroupOfAggregations.objects.create(name='EUDAT')
        gmp = poem_models.GroupOfMetricProfiles.objects.create(name='SDC')

        userprofile = poem_models.UserProfile.objects.create(
            user=user1
        )
        userprofile.groupsofmetrics.add(gm)
        userprofile.groupsofaggregations.add(ga)
        userprofile.groupsofmetricprofiles.add(gmp)

    def test_get_groups_for_given_user(self):
        request = self.factory.get(self.url + 'username1')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'username1')
        aggr = [r for r in response.data['result']['aggregations']]
        met = [r for r in response.data['result']['metrics']]
        mp = [r for r in response.data['result']['metricprofiles']]
        self.assertEqual(aggr, ['EUDAT'])
        self.assertEqual(met, ['EGI'])
        self.assertEqual(mp, ['SDC'])

    def test_get_all_groups(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        aggr = [r for r in response.data['result']['aggregations']]
        met = [r for r in response.data['result']['metrics']]
        mp = [r for r in response.data['result']['metricprofiles']]
        self.assertEqual(aggr, ['EUDAT'])
        self.assertEqual(met, ['EGI', 'EUDAT'])
        self.assertEqual(mp, ['SDC'])


class ListMetricsInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricsInGroup.as_view()
        self.url = '/api/v2/internal/metricsgroup/'
        self.user = CustUser.objects.create(username='testuser')

        self.metric1 = poem_models.Metrics.objects.create(name='hr.srce.GRAM-Auth')
        self.metric2 = poem_models.Metrics.objects.create(name='eu.egi.CREAM-IGTF')
        self.metric3 = poem_models.Metrics.objects.create(name='pl.plgrid.QCG-Broker')

        self.id1 = self.metric1.id
        self.id2 = self.metric2.id
        self.id3 = self.metric3.id

        group = poem_models.GroupOfMetrics.objects.create(name='EGI')
        poem_models.GroupOfMetrics.objects.create(name='delete')
        group.metrics.add(self.metric1)
        group.metrics.add(self.metric2)

    def test_get_metrics_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.id2, 'name': 'eu.egi.CREAM-IGTF'},
                    {'id': self.id1, 'name': 'hr.srce.GRAM-Auth'}
                ]
            }
        )

    def test_get_metric_without_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.id3, 'name': 'pl.plgrid.QCG-Broker'}
                ]
            }
        )

    def test_get_metrics_with_wrong_group(self):
        request = self.factory.get(self.url + 'bla')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'bla')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('Poem.poem.models.Metrics.objects.get')
    def test_put_metrics(self, metrics):
        metrics.return_value = self.metric1
        data = {'name': 'EGI',
                'items': ['hr.srce.GRAM-Auth', 'pl.plgrid.QCG-Broker']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch('Poem.poem.models.Metrics.objects.get')
    def test_post_metrics(self, metrics):
        metrics.return_value = self.metric1
        data = {'name': 'new_name',
                'items': ['pl.plgrid.QCG-Broker']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_post_metrics_group_with_name_that_already_exists(self):
        data = {'name': 'EGI',
                'items': [self.metric1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_metric_group(self):
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 1)

    def test_delete_nonexisting_metric_group(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_metric_group_without_specifying_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ListAggregationsInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAggregationsInGroup.as_view()
        self.url = '/api/v2/internal/aggregationsgroup/'
        self.user = CustUser.objects.create(username='testuser')

        self.aggr1 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        aggr2 = poem_models.Aggregation.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        self.id1 = self.aggr1.id
        self.id2 = aggr2.id

        group = poem_models.GroupOfAggregations.objects.create(name='EGI')
        poem_models.GroupOfAggregations.objects.create(name='delete')
        group.aggregations.add(self.aggr1)

    def test_get_aggregations_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.id1, 'name': 'TEST_PROFILE'}
                ]
            }
        )

    def test_get_aggregation_without_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.id2, 'name': 'ANOTHER-PROFILE'}
                ]
            }
        )

    def test_get_aggregation_with_wrong_group(self):
        request = self.factory.get(self.url + 'bla')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'bla')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('Poem.poem.models.Aggregation.objects.get')
    def test_put_aggregation_profile(self, aggr):
        aggr.return_value = self.aggr1
        data = {'name': 'EGI',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch('Poem.poem.models.Aggregation.objects.get')
    def test_post_aggregation_profile(self, aggr):
        aggr.return_value = self.aggr1
        data = {'name': 'new_name',
                'items': ['ANOTHER-PROFILE']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_post_aggregation_group_with_name_that_already_exists(self):
        data = {'name': 'EGI',
                'items': [self.aggr1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_aggregation_group(self):
        self.assertEqual(poem_models.GroupOfAggregations.objects.all().count(),
                         2)
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.GroupOfAggregations.objects.all().count(),
                         1)

    def test_delete_nonexisting_aggregation_group(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_aggregation_group_without_specifying_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ListMetricProfilesInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricProfilesInGroup.as_view()
        self.url = '/api/v2/internal/metricprofilesgroup/'
        self.user = CustUser.objects.create(username='testuser')

        self.mp1 = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        mp2 = poem_models.MetricProfiles.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        self.id1 = self.mp1.id
        self.id2 = mp2.id

        group = poem_models.GroupOfMetricProfiles.objects.create(name='EGI')
        poem_models.GroupOfMetricProfiles.objects.create(name='delete')

        group.metricprofiles.add(self.mp1)

    def test_get_metric_profiles_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.id1, 'name': 'TEST_PROFILE'}
                ]
            }
        )

    def test_get_metric_profiles_without_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.id2, 'name': 'ANOTHER-PROFILE'}
                ]
            }
        )

    def test_get_metric_profiles_with_wrong_group(self):
        request = self.factory.get(self.url + 'bla')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'bla')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('Poem.poem.models.MetricProfiles.objects.get')
    def test_put_metric_profile_group(self, mp):
        mp.return_value = self.mp1
        data = {'name': 'EGI',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch('Poem.poem.models.MetricProfiles.objects.get')
    def test_post_metric_profile_group(self, mp):
        mp.return_value = self.mp1
        data = {'name': 'new_name',
                'items': ['ANOTHER-PROFILE']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_post_metric_profile_group_with_name_that_already_exists(self):
        data = {'name': 'EGI',
                'items': [self.mp1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_metric_profile_group(self):
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 1
        )

    def test_delete_nonexisting_metric_profile_group(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_metric_profile_group_without_specifying_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ListMetricAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetric.as_view()
        self.url = '/api/v2/internal/metric/'
        self.user = CustUser.objects.create(username='testuser')

        tag = poem_models.Tags.objects.create(name='Production')
        poem_models.Tags.objects.create(name='TEST')

        mtype1 = poem_models.MetricType.objects.create(name='Active')
        mtype2 = poem_models.MetricType.objects.create(name='Passive')

        group = poem_models.GroupOfMetrics.objects.create(name='EGI')
        poem_models.GroupOfMetrics.objects.create(name='EUDAT')

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            version='0.1.7',
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probe_revision1 = Revision.objects.create(
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user
        )

        ct = ContentType.objects.get_for_model(admin_models.Probe)

        self.probeversion1 = Version.objects.create(
            object_id=probe1.id,
            serialized_data='[{"pk": 5, "model": "poem_super_admin.probe",'
                            ' "fields": {"name": "ams-probe",'
                            ' "version": "0.1.7", "description":'
                            ' "Probe is inspecting AMS service by trying to'
                            ' publish and consume randomly generated messages.'
                            ', "comment": "Initial version",'
                            ' "repository": "https://github.com/ARGOeu/nagios'
                            '-plugins-argo", "docurl":'
                            ' "https://github.com/ARGOeu/nagios-plugins-argo/'
                            'blob/master/README.md", "user": "poem"}}]',
            object_repr='ams-probe (0.1.7)',
            content_type_id=ct.id,
            revision_id=probe_revision1.id
        )

        metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            tag=tag,
            mtype=mtype1,
            probeversion='ams-probe (0.1.7)',
            probekey=self.probeversion1,
            group=group,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        metric2 = poem_models.Metric.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            group=group,
            mtype=mtype2,
            tag=tag
        )

        self.id1 = metric1.id
        self.id2 = metric2.id

    def test_get_metric_list(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.id1,
                    'name': 'argo.AMS-Check',
                    'tag': 'Production',
                    'mtype': 'Active',
                    'probeversion': 'ams-probe (0.1.7)',
                    'probekey': self.probeversion1.id,
                    'group': 'EGI',
                    'parent': '',
                    'probeexecutable': 'ams-probe',
                    'config': [
                        {
                            'key': 'maxCheckAttempts',
                            'value': '3'
                        },
                        {
                            'key': 'timeout',
                            'value': '60'
                        },
                        {
                            'key': 'path',
                            'value': '/usr/libexec/argo-monitoring/probes/argo'
                        },
                        {
                            'key': 'interval',
                            'value': '5'
                        },
                        {
                            'key': 'retryInterval',
                            'value': '3'
                        }
                    ],
                    'attribute': [
                        {
                            'key': 'argo.ams_TOKEN',
                            'value': '--token'
                        }
                    ],
                    'dependancy': [],
                    'flags': [
                        {
                            'key': 'OBSESS',
                            'value': '1'
                        }
                    ],
                    'files': [],
                    'parameter': [
                        {
                            'key': '--project',
                            'value': 'EGI'
                        }
                    ],
                    'fileparameter': []
                },
                {
                    'id': self.id2,
                    'name': 'org.apel.APEL-Pub',
                    'tag': 'Production',
                    'mtype': 'Passive',
                    'probeversion': '',
                    'probekey': '',
                    'group': 'EGI',
                    'parent': '',
                    'probeexecutable': '',
                    'config': [],
                    'attribute': [],
                    'dependancy': [],
                    'flags': [
                        {
                            'key': 'OBSESS',
                            'value': '1'
                        },
                        {
                            'key': 'PASSIVE',
                            'value': '1'
                        }
                    ],
                    'files': [],
                    'parameter': [],
                    'fileparameter': []
                }
            ]
        )

    def test_get_metric_by_name(self):
        request = self.factory.get(self.url + 'argo.AMS-Check')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(
            response.data,
            {
                'id': self.id1,
                'name': 'argo.AMS-Check',
                'tag': 'Production',
                'mtype': 'Active',
                'probeversion': 'ams-probe (0.1.7)',
                'probekey': self.probeversion1.id,
                'group': 'EGI',
                'parent': '',
                'probeexecutable': 'ams-probe',
                'config': [
                    {
                        'key': 'maxCheckAttempts',
                        'value': '3'
                    },
                    {
                        'key': 'timeout',
                        'value': '60'
                    },
                    {
                        'key': 'path',
                        'value': '/usr/libexec/argo-monitoring/probes/argo'
                    },
                    {
                        'key': 'interval',
                        'value': '5'
                    },
                    {
                        'key': 'retryInterval',
                        'value': '3'
                    }
                ],
                'attribute': [
                    {
                        'key': 'argo.ams_TOKEN',
                        'value': '--token'
                    }
                ],
                'dependancy': [],
                'flags': [
                    {
                        'key': 'OBSESS',
                        'value': '1'
                    }
                ],
                'files': [],
                'parameter': [
                    {
                        'key': '--project',
                        'value': 'EGI'
                    }
                ],
                'fileparameter': []
            }
        )

    def test_get_metric_by_nonexisting_name(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Metric not found'})


    def test_inline_metric_for_db_function(self):
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]

        res = inline_metric_for_db(conf)
        self.assertEqual(
            res,
            ['maxCheckAttempts 4', 'timeout 70',
             'path /usr/libexec/argo-monitoring/probes/argo',
             'interval 6', 'retryInterval 4']
        )

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric(self, func):
        func.return_value = ['maxCheckAttempts 4', 'timeout 70',
                             'path /usr/libexec/argo-monitoring/probes/argo',
                             'interval 6', 'retryInterval 4']
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]

        data = {
            'name': 'argo.AMS-Check',
            'tag': 'TEST',
            'group': 'EUDAT',
            'config': conf
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(metric.group.name, 'EUDAT')
        self.assertEqual(metric.tag.name, 'TEST')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", ' 
            '"interval 6", "retryInterval 4"]')

    def test_delete_metric(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 2)
        request = self.factory.delete(self.url + 'org.apel.APEL-Pub')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'org.apel.APEL-Pub')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.Metric.objects.all().count(), 1)

    def test_delete_nonexisting_metric(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_metric_without_specifying_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ListTagsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListTags.as_view()
        self.url = '/api/v2/internal/tags/'
        self.user = CustUser.objects.create(username='testuser')

        poem_models.Tags.objects.create(name='Production')
        poem_models.Tags.objects.create(name='Devel')
        poem_models.Tags.objects.create(name='Test')

    def test_get_tags(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            [r for r in response.data],
            [
                'Production',
                'Devel',
                'Test'
            ]
        )


class ListMetricTypesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTypes.as_view()
        self.url = '/api/v2/internal/mtypes/'
        self.user = CustUser.objects.create(username='testuser')

        poem_models.MetricType.objects.create(name='Active')
        poem_models.MetricType.objects.create(name='Passive')

    def test_get_tags(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            [r for r in response.data],
            [
                'Active',
                'Passive',
            ]
        )


class ListGroupsForUserAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListGroupsForUser.as_view()
        self.url = '/api/v2/internal/groups/'
        self.user = CustUser.objects.create(username='testuser')
        self.superuser = CustUser.objects.create(username='superuser',
                                                 is_superuser=True)

        gm1 = poem_models.GroupOfMetrics.objects.create(name='metricgroup1')
        gm2 = poem_models.GroupOfMetrics.objects.create(name='metricgroup2')

        gmp1 = poem_models.GroupOfMetricProfiles.objects.create(
            name='metricprofilegroup1'
        )
        gmp2 = poem_models.GroupOfMetricProfiles.objects.create(
            name='metricprofilegroup2'
        )

        ga1 = poem_models.GroupOfAggregations.objects.create(name='aggrgroup1')
        ga2 = poem_models.GroupOfAggregations.objects.create(name='aggrgroup2')

        userprofile = poem_models.UserProfile.objects.create(user=self.user)
        userprofile.groupsofmetrics.add(gm2)
        userprofile.groupsofmetricprofiles.add(gmp2)
        userprofile.groupsofaggregations.add(ga2)

    def test_list_all_groups(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            [d for d in response.data['result']['aggregations']],
            ['aggrgroup1', 'aggrgroup2']
        )
        self.assertEqual(
            [d for d in response.data['result']['metrics']],
            ['metricgroup1', 'metricgroup2']
        )
        self.assertEqual(
            [d for d in response.data['result']['metricprofiles']],
            ['metricprofilegroup1', 'metricprofilegroup2']
        )

    def test_list_groups_for_user_that_is_not_superuser(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            [d for d in response.data['result']['aggregations']],
            ['aggrgroup2']
        )
        self.assertEqual(
            [d for d in response.data['result']['metrics']],
            ['metricgroup2']
        )
        self.assertEqual(
            [d for d in response.data['result']['metricprofiles']],
            ['metricprofilegroup2']
        )

    def test_get_aggregation_groups_for_superuser(self):
        request = self.factory.get(self.url + 'aggregations')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'aggregations')
        self.assertEqual(
            [d for d in response.data],
            ['aggrgroup1', 'aggrgroup2']
        )

    def test_get_metric_groups_for_superuser(self):
        request = self.factory.get(self.url + 'metrics')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'metrics')
        self.assertEqual(
            [d for d in response.data],
            ['metricgroup1', 'metricgroup2']
        )

    def test_get_metric_profile_groups_for_superuser(self):
        request = self.factory.get(self.url + 'metricprofiles')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'metricprofiles')
        self.assertEqual(
            [d for d in response.data],
            ['metricprofilegroup1', 'metricprofilegroup2']
        )

    def test_get_aggregation_groups_for_basic_user(self):
        request = self.factory.get(self.url + 'aggregations')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'aggregations')
        self.assertEqual(
            [d for d in response.data],
            ['aggrgroup2']
        )

    def test_get_metric_groups_for_basic_user(self):
        request = self.factory.get(self.url + 'metrics')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metrics')
        self.assertEqual(
            [d for d in response.data],
            ['metricgroup2']
        )

    def test_get_metric_profile_groups_for_basic_user(self):
        request = self.factory.get(self.url + 'metricprofiles')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metricprofiles')
        self.assertEqual(
            [d for d in response.data],
            ['metricprofilegroup2']
        )


class GetConfigOptionsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.GetConfigOptions.as_view()
        self.url = '/api/v2/internal/config_options/'
        self.user = CustUser.objects.create(username='testuser')

    @patch('Poem.api.internal_views.app.saml_login_string',
           return_value='Log in using B2ACCESS')
    @patch('Poem.api.internal_views.app.tenant_from_request',
           return_value='Tenant')
    def test_get_config_options(self, *args):
        with self.settings(WEBAPI_METRIC='https://metric.profile.com',
                           WEBAPI_AGGREGATION='https://aggregations.com'):
            request = self.factory.get(self.url)
            response = self.view(request)
            self.assertEqual(
                response.data,
                {
                    'result': {
                        'saml_login_string': 'Log in using B2ACCESS',
                        'webapimetric': 'https://metric.profile.com',
                        'webapiaggregation': 'https://aggregations.com',
                        'tenant_name': 'Tenant'
                    }
                }
            )


class ListVersionsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListVersions.as_view()
        self.url = '/api/v2/internal/version/'
        self.user = CustUser.objects.create(username='testuser')

        probe = admin_models.Probe.objects.create(
            name='poem-probe',
            version='0.1.11',
            description='Probe inspects POEM service.',
            comment='This version added: Check POEM metric configuration API',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        admin_models.Probe.objects.create(
            name='ams-probe',
            version='0.1.7',
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        self.rev1 = Revision.objects.create(
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user
        )

        self.rev2 = Revision.objects.create(
            date_created=datetime.datetime.now(),
            comment='[{"changed": {"fields": ["version", "comment"]}}]',
            user=self.user
        )

        ct = ContentType.objects.get_for_model(admin_models.Probe)

        self.ver1 = Version.objects.create(
            object_id=probe.id,
            serialized_data='[{"pk": 1, "model": "poem_super_admin.probe",'
                            ' "fields": {"name": "poem-probe", "version": '
                            '"0.1.7", "description": "Probe inspects POEM '
                            'service.", "comment": "Initial version.", '
                            '"repository": "https://github.com/ARGOeu/nagios-'
                            'plugins-argo", "docurl": "https://github.com/'
                            'ARGOeu/nagios-plugins-argo/blob/master/README.md",'
                            ' "user": "poem"}}]',
            object_repr='poem-probe (0.1.7)',
            content_type_id=ct.id,
            revision_id=self.rev1.id
        )

        self.ver2 = Version.objects.create(
            object_id=probe.id,
            serialized_data='[{"pk": 1, "model": "poem_super_admin.probe",'
                            ' "fields": {"name": "poem-probe", "version": '
                            '"0.1.11", "description": "Probe inspects POEM '
                            'service.", "comment": "This version added: Check '
                            'POEM metric configuration API", '
                            '"repository": "https://github.com/ARGOeu/nagios-'
                            'plugins-argo", "docurl": "https://github.com/'
                            'ARGOeu/nagios-plugins-argo/blob/master/README.md",'
                            ' "user": "poem"}}]',
            object_repr='poem-probe (0.1.11)',
            content_type_id=ct.id,
            revision_id=self.rev2.id
        )

    def test_get_versions_of_probes(self):
        request = self.factory.get(self.url + 'probe/poem-probe')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'probe', 'poem-probe')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver2.id,
                    'object_repr': 'poem-probe (0.1.11)',
                    'fields': {
                        'name': 'poem-probe',
                        'version': '0.1.11',
                        'description': 'Probe inspects POEM service.',
                        'comment': 'This version added: Check POEM metric '
                                   'configuration API',
                        'repository': 'https://github.com/ARGOeu/nagios-plugins'
                                      '-argo',
                        'docurl': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo/blob/master/README.md',
                        'user': 'poem'
                    },
                    'user': 'poem',
                    'date_created': datetime.datetime.strftime(
                        self.rev1.date_created, '%Y-%m-%d %H:%M:%S'),
                    'comment': 'Changed version and comment.',
                    'version': '0.1.11'
                },
                {
                    'id': self.ver1.id,
                    'object_repr': 'poem-probe (0.1.7)',
                    'fields': {
                        'name': 'poem-probe',
                        'version': '0.1.7',
                        'description': 'Probe inspects POEM service.',
                        'comment': 'Initial version.',
                        'repository': 'https://github.com/ARGOeu/nagios-plugins'
                                      '-argo',
                        'docurl': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo/blob/master/README.md',
                        'user': 'poem'
                    },
                    'user': 'poem',
                    'date_created': datetime.datetime.strftime(
                        self.rev1.date_created, '%Y-%m-%d %H:%M:%S'),
                    'comment': 'No fields changed.',
                    'version': '0.1.7'
                },
            ]
        )

    def test_get_nonexisting_probe_version(self):
        request = self.factory.get(self.url + 'probe/ams-probe')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'probe', 'ams-probe')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Version not found'})

    def test_get_nonexisting_probe(self):
        request = self.factory.get(self.url + 'probe/nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'probe', 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Probe not found'})
