from collections import OrderedDict
import datetime

from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django.test.client import encode_multipart

import json

from Poem.api import views_internal as views
from Poem.api.internal_views.metrics import inline_metric_for_db
from Poem.api.models import MyAPIKey
from Poem.helpers.history_helpers import create_comment
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser

from rest_framework.test import force_authenticate
from rest_framework import status

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


class ListAPIKeysAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAPIKeys.as_view()
        self.url = '/api/v2/internal/apikeys/'
        self.user = CustUser.objects.create_user(username='testuser')

        key1, k1 = MyAPIKey.objects.create_key(name='EGI')
        self.id1 = key1.id
        self.token1 = key1.token
        self.created1 = datetime.datetime.strftime(key1.created,
                                                   '%Y-%m-%d %H:%M:%S')
        key2, k2 = MyAPIKey.objects.create_key(name='EUDAT')
        self.id2 = key2.id
        self.token2 = key2.token
        self.created2 = datetime.datetime.strftime(key2.created,
                                                   '%Y-%m-%d %H:%M:%S')
        key3, k3 = MyAPIKey.objects.create_key(name='DELETABLE')
        self.id3 = key3.id
        self.token3 = key3.token
        self.created3 = datetime.datetime.strftime(key3.created,
                                                   '%Y-%m-%d %H:%M:%S')

    def test_permission_denied_in_case_no_authorization(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_list_of_apikeys(self):
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

    def test_put_apikey(self):
        data = {'id': self.id1, 'name': 'EGI2', 'revoked': False}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        changed_entry = MyAPIKey.objects.get(id=self.id1)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual('EGI2', changed_entry.name)

    def test_put_apikey_with_name_that_already_exists(self):
        data = {'id': self.id1, 'name': 'EUDAT', 'revoked': False}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_post_apikey(self):
        data = {'name': 'test', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_post_apikey_name_already_exists(self):
        data = {'name': 'EUDAT', 'revoked': False}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_apikey(self):
        request = self.factory.delete(self.url + 'DELETABLE')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'DELETABLE')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_nonexisting_apikey(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_no_apikey_name(self):
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

        self.user2 = CustUser.objects.create_user(
            username='another_user',
            first_name='Another',
            last_name='User',
            email='otheruser@example.com',
            date_joined=datetime.datetime(2015, 1, 2, 0, 0, 0)
        )

        poem_models.UserProfile.objects.create(user=self.user2)

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
                OrderedDict([('first_name', 'Another'),
                             ('last_name', 'User'),
                             ('username', 'another_user'),
                             ('is_active', True),
                             ('is_superuser', False),
                             ('is_staff', False),
                             ('email', 'otheruser@example.com'),
                             ('date_joined', '2015-01-02T00:00:00'),
                             ('pk', self.user2.pk)]),
                OrderedDict([('first_name', 'Test'),
                             ('last_name', 'User'),
                             ('username', 'testuser'),
                             ('is_active', True),
                             ('is_superuser', False),
                             ('is_staff', False),
                             ('email', 'testuser@example.com'),
                             ('date_joined', '2015-01-01T00:00:00'),
                             ('pk', self.user.pk)])
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
                         ('date_joined', '2015-01-01T00:00:00'),
                         ('pk', self.user.pk)])
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

    def test_put_user_with_already_existing_name(self):
        data = {
            'pk': self.user.pk,
            'username': 'another_user',
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
            'is_staff': True,
            'is_active': True,
            'password': 'blablabla',
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        user = CustUser.objects.get(username='newuser')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(user.username, 'newuser')
        self.assertEqual(user.first_name, 'New')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_active)

    def test_post_user_with_already_existing_username(self):
        data = {
            'username': 'testuser',
            'first_name': 'New',
            'last_name': 'User',
            'email': 'newuser@example.com',
            'is_superuser': True,
            'is_staff': True,
            'is_active': True,
            'password': 'blablabla',
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'User with this username already exists.'}
        )

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

        with schema_context(get_public_schema_name()):
            Tenant.objects.create(name='public', domain_url='public',
                                  schema_name=get_public_schema_name())

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            version='0.1.7',
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user='testuser',
            datetime=datetime.datetime.now()
        )

        probe2 = admin_models.Probe.objects.create(
            name='argo-web-api',
            version='0.1.7',
            description='This is a probe for checking AR and status reports are'
                        ' properly working.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user='testuser',
            datetime=datetime.datetime.now()
        )

        self.datetime1 = probe1.datetime
        self.id1 = probe1.id

        self.ct = ContentType.objects.get_for_model(admin_models.Probe)

        admin_models.History.objects.create(
            object_id=probe1.id,
            serialized_data=serializers.serialize(
                'json', [probe1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True,
            ),
            object_repr='ams-probe (0.1.7)',
            content_type=self.ct,
            comment='Initial version.',
            date_created=datetime.datetime.now(),
            user='poem'
        )

        pv = admin_models.History.objects.create(
            object_id=probe2.id,
            serialized_data=serializers.serialize(
                'json', [probe2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True,
            ),
            object_repr='argo-web-api (0.1.7)',
            content_type=self.ct,
            comment='Initial version.',
            date_created=datetime.datetime.now(),
            user='poem'
        )

        type = admin_models.MetricTemplateType.objects.create(name='Active')

        admin_models.MetricTemplate.objects.create(
            name='argo.API-Check',
            probeversion='argo-web-api (0.1.7)',
            mtype=type,
            probekey=pv,
            probeexecutable='["web-api"]',
            config='["maxCheckAttempts 3", "timeout 120", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]',
            attribute='["argo.api_TOKEN --token"]',
            flags='["OBSESS 1"]'
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
                'id': self.id1,
                'name': 'ams-probe',
                'version': '0.1.7',
                'docurl':
                    'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                    'README.md',
                'description': 'Probe is inspecting AMS service by trying to '
                               'publish and consume randomly generated '
                               'messages.',
                'comment': 'Initial version.',
                'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
                'user': 'testuser',
                'datetime': datetime.datetime.strftime(
                    self.datetime1,
                    '%Y-%m-%dT%H:%M:%S.%f'
                ),
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

    def test_put_probe_with_new_version(self):
        data = {
            'id': self.id1,
            'name': 'argo-web-api',
            'version': '0.1.7',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'new_version': True,
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url_base,
                                   content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'Probe with this name already exists.'}
        )

    def test_put_probe_without_new_version(self):
        data = {
            'id': self.id1,
            'name': 'ams-probe',
            'version': '0.1.7',
            'comment': 'Initial version',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish randomly generated messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'new_version': False,
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url_base, content,
                                   content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        probe = admin_models.Probe.objects.get(name='ams-probe')
        version = admin_models.History.objects.filter(object_id=probe.id,
                                                      content_type=self.ct)
        ser_data = json.loads(version[0].serialized_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(probe.version, '0.1.7')
        self.assertEqual(probe.comment, 'Initial version')
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish randomly'
            ' generated messages.'
        )
        self.assertEqual(ser_data[0]['fields']['description'], probe.description)

    def test_put_probe_with_already_existing_name(self):
        data = {
            'id': self.id1,
            'name': 'ams-probe',
            'version': '0.1.7',
            'comment': 'Initial version',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish randomly generated messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'new_version': False,
            'update_metrics': False
        }
        content, content_type = encode_data(data)

    def test_post_probe(self):
        data = {
            'name': 'poem-probe',
            'version': '0.1.11',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url_base, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        probe = admin_models.Probe.objects.get(name='poem-probe')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(probe.version, '0.1.11')
        self.assertEqual(probe.description, 'Probe inspects POEM service.')
        self.assertEqual(probe.comment, 'Initial version.')
        self.assertEqual(probe.repository,
                         'https://github.com/ARGOeu/nagios-plugins-argo')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
            'master/README.md'
        )

    def test_post_probe_with_name_which_already_exists(self):
        data = {
            'name': 'ams-probe',
            'version': '0.1.11',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url_base, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                'detail': 'Probe with this name already exists.'
            }
        )

    def test_delete_probe(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 2)
        request = self.factory.delete(self.url_base + 'ams-probe')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ams-probe')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(admin_models.Probe.objects.all().count(), 1)

    def test_delete_probe_associated_to_metric_template(self):
        request = self.factory.delete(self.url_base + 'argo-web-api')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo-web-api')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                'detail': 'You cannot delete Probe that is associated to metric'
                          ' templates!'
            }
        )

    def test_delete_probe_without_name(self):
        request = self.factory.delete(self.url_base)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_trying_to_delete_nonexisting_probe(self):
        request = self.factory.delete(self.url_base + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Probe not found'})


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

        mtype = poem_models.MetricType.objects.create(
            name='Active'
        )

        poem_models.Metric.objects.create(
            name='org.onedata.Oneprovider-Health',
            probeversion='check_oneprovider (3.2.0)',
            mtype=mtype
        )

        poem_models.Metric.objects.create(
            name='eu.egi.CertValidity',
            probeversion='check_ssl_cert (1.84.0)',
            mtype=mtype
        )

        poem_models.Metric.objects.create(
            name='hr.srce.SRM2-CertLifetime',
            probeversion='CertLifetime-probe (1.0.0)',
            mtype=mtype
        )

        poem_models.Metric.objects.create(
            name='org.sam.SRM-All',
            probeversion='SRM-probe (1.0.1)',
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

        group = poem_models.GroupOfMetrics.objects.create(name='EGI')
        poem_models.GroupOfMetrics.objects.create(name='delete')

        mtype1 = poem_models.MetricType.objects.create(name='Active')
        mtype2 = poem_models.MetricType.objects.create(name='Passive')

        poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probeversion='ams-probe (0.1.7)',
            group=group,
        )

        poem_models.Metric.objects.create(
            name='org.apel.APEL-Pub',
            group=group,
            mtype=mtype2,
        )

    def test_get_all_metrics(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {'name': 'argo.AMS-Check'},
                {'name': 'org.apel.APEL-Pub'}
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
        self.user = CustUser.objects.create_user(username='testuser')

        self.group = poem_models.GroupOfMetrics.objects.create(name='EGI')
        group2 = poem_models.GroupOfMetrics.objects.create(name='delete')

        mtype1 = poem_models.MetricType.objects.create(name='Active')
        mtype2 = poem_models.MetricType.objects.create(name='Passive')

        self.metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probeversion='ams-probe (0.1.7)',
            group=self.group,
        )

        self.metric2 = poem_models.Metric.objects.create(
            name='org.apel.APEL-Pub',
            group=self.group,
            mtype=mtype2,
        )

        self.metric3 = poem_models.Metric.objects.create(
            name='eu.egi.CertValidity',
            probeversion='check_ssl_cert (1.84.0)',
            mtype=mtype1
        )

        self.metric4 = poem_models.Metric.objects.create(
            name='delete.metric',
            group=group2,
            mtype=mtype2
        )

        self.ct = ContentType.objects.get_for_model(poem_models.Metric)

        self.ver1 = poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric1.__str__(),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.ver2 = poem_models.TenantHistory.objects.create(
            object_id=self.metric2.id,
            serialized_data=serializers.serialize(
                'json', [self.metric2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric2.__str__(),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.ver3 = poem_models.TenantHistory.objects.create(
            object_id=self.metric3.id,
            serialized_data=serializers.serialize(
                'json', [self.metric3],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric3.__str__(),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.ver4 = poem_models.TenantHistory.objects.create(
            object_id=self.metric4.id,
            serialized_data=serializers.serialize(
                'json', [self.metric4],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric4.__str__(),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

    def test_get_metrics_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.metric1.id, 'name': 'argo.AMS-Check'},
                    {'id': self.metric2.id, 'name': 'org.apel.APEL-Pub'}
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
                    {'id': self.metric3.id, 'name': 'eu.egi.CertValidity'}
                ]
            }
        )

    def test_get_metric_group_with_no_autorization(self):
        request = self.factory.get(self.url + 'EGI')
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_metrics_with_nonexisting_group(self):
        request = self.factory.get(self.url + 'bla')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'bla')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_metrics_in_group(self):
        data = {'name': 'EGI',
                'items': ['argo.AMS-Check', 'eu.egi.CertValidity']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        metric2 = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ver1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id,
            content_type=self.ct
        )
        ver2 = poem_models.TenantHistory.objects.filter(
            object_id=metric2.id,
            content_type=self.ct
        )
        self.assertEqual(ver1.count(), 1)
        self.assertEqual(ver2.count(), 2)
        self.assertEqual(metric1.group.name, 'EGI')
        self.assertEqual(metric2.group.name, 'EGI')
        self.assertEqual(
            json.loads(ver2[0].serialized_data)[0]['fields']['group'][0],
            'EGI'
        )
        self.assertEqual(ver2[0].comment,
                         '[{"added": {"fields": ["group"]}}]')
        self.assertEqual(
            json.loads(ver1[0].serialized_data)[0]['fields']['group'][0],
            'EGI'
        )

    def test_remove_metric_from_group(self):
        self.metric3.group = self.group
        self.metric3.save()
        data = {'name': 'EGI',
                'items': ['eu.egi.CertValidity']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        metric2 = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(metric1.group, None)
        self.assertEqual(metric2.group.name, 'EGI')

    def test_post_metric_group_without_metrics(self):
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        data = {'name': 'new_name',
                'items': []}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 3)

    def test_post_metric_group_with_metrics(self):
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        data = {'name': 'new_name',
                'items': ['eu.egi.CertValidity']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 3)
        metric = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(metric.group.name, 'new_name')

    def test_post_metrics_group_with_name_that_already_exists(self):
        data = {'name': 'EGI',
                'items': [self.metric1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'Group of metrics with this name already exists.'}
        )

    def test_delete_metric_group(self):
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 1)
        self.assertRaises(
            poem_models.GroupOfMetrics.DoesNotExist,
            poem_models.GroupOfMetrics.objects.get,
            name='delete'
        )
        metric = poem_models.Metric.objects.get(name='delete.metric')
        self.assertEqual(metric.group, None)

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
        self.user = CustUser.objects.create_user(username='testuser')

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
            name='DELETE_PROFILE',
            apiid='12341234-hhhh-kkkk-aaaa-aaeekkccnnee',
            groupname='delete'
        )

        self.group = poem_models.GroupOfAggregations.objects.create(name='EGI')
        group2 = poem_models.GroupOfAggregations.objects.create(name='delete')
        self.group.aggregations.add(self.aggr1)
        group2.aggregations.add(self.aggr3)

    def test_get_aggregations_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.aggr1.id, 'name': 'TEST_PROFILE'}
                ]
            }
        )

    def test_get_aggregations_in_case_no_authorization(self):
        request = self.factory.get(self.url + 'EGI')
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_aggregation_without_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.aggr2.id, 'name': 'ANOTHER-PROFILE'}
                ]
            }
        )

    def test_add_aggregation_profile_in_group(self):
        self.assertEqual(self.group.aggregations.count(), 1)
        data = {'name': 'EGI',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, 'EGI')
        self.assertEqual(aggr2.groupname, 'EGI')
        self.assertEqual(self.group.aggregations.count(), 2)

    def test_remove_aggregation_profile_from_group(self):
        self.group.aggregations.add(self.aggr2)
        self.assertEqual(self.group.aggregations.count(), 2)
        data = {
            'name': 'EGI',
            'items': ['ANOTHER-PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, '')
        self.assertEqual(aggr2.groupname, 'EGI')
        self.assertEqual(self.group.aggregations.count(), 1)

    def test_post_aggregation_group_without_aggregation(self):
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': []}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 3
        )
        group = poem_models.GroupOfAggregations.objects.get(name='new_name')
        self.assertEqual(group.aggregations.count(), 0)

    def test_post_aggregation_group_with_aggregation(self):
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': ['ANOTHER-PROFILE']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 3
        )
        group = poem_models.GroupOfAggregations.objects.get(name='new_name')
        self.assertEqual(group.aggregations.count(), 1)
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, 'EGI')
        self.assertEqual(aggr2.groupname, 'new_name')

    def test_post_aggregation_group_with_name_that_already_exists(self):
        data = {'name': 'EGI',
                'items': [self.aggr1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'Group of aggregations with this name already exists.'}
        )

    def test_delete_aggregation_group(self):
        self.assertEqual(poem_models.GroupOfAggregations.objects.all().count(),
                         2)
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.GroupOfAggregations.objects.all().count(),
                         1)
        self.assertRaises(
            poem_models.GroupOfAggregations.DoesNotExist,
            poem_models.GroupOfAggregations.objects.get,
            name='delete'
        )
        aggr = poem_models.Aggregation.objects.get(name='DELETE_PROFILE')
        self.assertEqual(aggr.groupname, '')

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

        self.mp2 = poem_models.MetricProfiles.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        self.mp3 = poem_models.MetricProfiles.objects.create(
            name='DELETE_PROFILE',
            apiid='12341234-hhhh-kkkk-aaaa-aaeekkccnnee',
            groupname='delete'
        )

        self.group = poem_models.GroupOfMetricProfiles.objects.create(
            name='EGI'
        )
        group2 = poem_models.GroupOfMetricProfiles.objects.create(name='delete')

        self.group.metricprofiles.add(self.mp1)
        group2.metricprofiles.add(self.mp3)

    def test_get_metric_profiles_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.mp1.id, 'name': 'TEST_PROFILE'}
                ]
            }
        )

    def test_get_metric_profiles_in_group_in_case_no_authorization(self):
        request = self.factory.get(self.url + 'EGI')
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_metric_profiles_without_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.mp2.id, 'name': 'ANOTHER-PROFILE'}
                ]
            }
        )

    def test_add_metric_profile_in_group(self):
        self.assertEqual(self.group.metricprofiles.count(), 1)
        data = {'name': 'EGI',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, 'EGI')
        self.assertEqual(mp2.groupname, 'EGI')
        self.assertEqual(self.group.metricprofiles.count(), 2)

    def test_remove_metric_profile_from_group(self):
        self.group.metricprofiles.add(self.mp2)
        self.assertEqual(self.group.metricprofiles.all().count(), 2)
        data = {
            'name': 'EGI',
            'items': ['ANOTHER-PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, '')
        self.assertEqual(mp2.groupname, 'EGI')
        self.assertEqual(self.group.metricprofiles.count(), 1)

    def test_post_metric_profile_group_without_metric_profile(self):
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': []}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 3
        )
        group = poem_models.GroupOfMetricProfiles.objects.get(name='new_name')
        self.assertEqual(group.metricprofiles.count(), 0)

    def test_post_metric_profile_group_with_metric_profile(self):
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': ['ANOTHER-PROFILE']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 3
        )
        group = poem_models.GroupOfMetricProfiles.objects.get(name='new_name')
        self.assertEqual(group.metricprofiles.count(), 1)
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, 'EGI')
        self.assertEqual(mp2.groupname, 'new_name')

    def test_post_metric_profile_group_with_name_that_already_exists(self):
        data = {'name': 'EGI',
                'items': [self.mp1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'Metric profiles group with this name already exists.'}
        )

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
        self.assertRaises(
            poem_models.GroupOfMetrics.DoesNotExist,
            poem_models.GroupOfMetrics.objects.get,
            name='delete'
        )
        mp = poem_models.MetricProfiles.objects.get(name='DELETE_PROFILE')
        self.assertEqual(mp.groupname, '')

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

        ct = ContentType.objects.get_for_model(admin_models.Probe)

        self.probeversion1 = admin_models.History.objects.create(
            object_id=probe1.id,
            serialized_data=serializers.serialize(
                'json', [probe1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True,
            ),
            object_repr='ams-probe (0.1.7)',
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
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

        ct = ContentType.objects.get_for_model(admin_models.Probe)
        ct_mt = ContentType.objects.get_for_model(admin_models.MetricTemplate)

        self.probe1 = admin_models.Probe.objects.create(
            name='poem-probe',
            version='0.1.7',
            description='Probe inspects POEM service.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user=self.user.username,
            datetime=datetime.datetime.now()
        )

        self.ver1 = admin_models.History.objects.create(
            object_id=self.probe1.id,
            serialized_data=serializers.serialize(
                'json', [self.probe1], use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr='poem-probe (0.1.7)',
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.probe1.version = '0.1.11'
        self.probe1.comment = 'This version added: Check POEM metric ' \
                              'configuration API'
        self.probe1.save()

        self.ver2 = admin_models.History.objects.create(
            object_id=self.probe1.id,
            serialized_data=serializers.serialize(
                'json', [self.probe1], use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr='poem-probe (0.1.11)',
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='[{"changed": {"fields": ["version", "comment"]}}]',
            user=self.user.username
        )

        admin_models.Probe.objects.create(
            name='ams-probe',
            version='0.1.7',
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user=self.user.username,
            datetime=datetime.datetime.now()
        )

        probe2 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            version='0.1.11',
            description='Probe is inspecting AMS publisher',
            comment='Initial version',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user=self.user.username,
            datetime=datetime.datetime.now()
        )

        self.ver3 = admin_models.History.objects.create(
            object_id=probe2.id,
            serialized_data=serializers.serialize(
                'json', [probe2], use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr='ams-publisher-probe (0.1.11)',
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.mtype1 = admin_models.MetricTemplateType.objects.create(
            name='Active'
        )

        metrictemplate1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=self.mtype1,
            probeversion='ams-probe (0.1.7)',
            probekey=self.ver3,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        self.ver4 = admin_models.History.objects.create(
            object_id=metrictemplate1.id,
            serialized_data=serializers.serialize(
                'json', [metrictemplate1], use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr='argo.AMS-Check',
            content_type=ct_mt,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
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
                        'nameversion': 'poem-probe (0.1.11)',
                        'description': 'Probe inspects POEM service.',
                        'comment': 'This version added: Check POEM metric '
                                   'configuration API',
                        'repository': 'https://github.com/ARGOeu/nagios-'
                                      'plugins-argo',
                        'docurl': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo/blob/master/README.md',
                        'user': 'testuser',
                        'datetime': datetime.datetime.strftime(
                            self.probe1.datetime, '%Y-%m-%dT%H:%M:%S.%f'
                        )[:-3]
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                            self.ver2.date_created, '%Y-%m-%d %H:%M:%S'
                        ),
                    'comment': 'Changed version and comment.',
                    'version': '0.1.11'
                },
                {
                    'id': self.ver1.id,
                    'object_repr': 'poem-probe (0.1.7)',
                    'fields': {
                        'name': 'poem-probe',
                        'version': '0.1.7',
                        'nameversion': 'poem-probe (0.1.7)',
                        'description': 'Probe inspects POEM service.',
                        'comment': 'Initial version.',
                        'repository': 'https://github.com/ARGOeu/nagios-'
                                      'plugins-argo',
                        'docurl': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo/blob/master/README.md',
                        'user': 'testuser',
                        'datetime': datetime.datetime.strftime(
                            self.probe1.datetime, '%Y-%m-%dT%H:%M:%S.%f'
                        )[:-3]
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver1.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': '0.1.7'
                }
            ]

        )

    def test_get_versions_of_metric_template(self):
        request = self.factory.get(self.url + 'metrictemplate/argo.AMS-Check')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metrictemplate', 'argo.AMS-Check')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver4.id,
                    'object_repr': 'argo.AMS-Check',
                    'fields': {
                        'name': 'argo.AMS-Check',
                        'mtype': self.mtype1.name,
                        'probeversion': 'ams-probe (0.1.7)',
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
                        'dependency': [],
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
                        self.ver4.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': datetime.datetime.strftime(
                        self.ver4.date_created, '%Y%m%d-%H%M%S'
                    )
                }
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

    def test_get_all_probe_versions(self):
        request = self.factory.get(self.url + 'probe/')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'probe')
        self.assertEqual(
            [r for r in response.data],
            [
                'ams-publisher-probe (0.1.11)',
                'poem-probe (0.1.11)',
                'poem-probe (0.1.7)'
            ]
        )


class GetPoemVersionAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.GetPoemVersion.as_view()
        self.url = '/api/v2/internal/schema/'

    def test_get_tenant_schema(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {'schema': 'tenant'}
        )

    @patch('Poem.api.internal_views.app.connection')
    def test_get_schema_name_if_public_schema(self, args):
        args.schema_name = get_public_schema_name()
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {'schema': 'superadmin'}
        )


class ListMetricTemplatesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplates.as_view()
        self.url = '/api/v2/internal/metrictemplates/'
        self.user = CustUser.objects.create_user(username='testuser')

        mtype1 = admin_models.MetricTemplateType.objects.create(name='Active')
        mtype2 = admin_models.MetricTemplateType.objects.create(name='Passive')

        self.mtype = mtype1

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

        ct = ContentType.objects.get_for_model(admin_models.Probe)

        probeversion1 = admin_models.History.objects.create(
            object_id=probe1.id,
            serialized_data=serializers.serialize(
                'json', [probe1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True,
            ),
            object_repr='ams-probe (0.1.7)',
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username,
        )

        self.probekey = probeversion1.id
        self.probekey_instance = probeversion1

        for schema in [self.tenant.schema_name, get_public_schema_name()]:
            with schema_context(schema):
                if schema == get_public_schema_name():
                    Tenant.objects.create(name='public',
                                          domain_url='public',
                                          schema_name=get_public_schema_name())

        metrictemplate1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probeversion='ams-probe (0.1.7)',
            probekey=probeversion1,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        metrictemplate2 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=mtype2,
        )

        self.id1 = metrictemplate1.id
        self.id2 = metrictemplate2.id

    def test_get_metric_template_list(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.id1,
                    'name': 'argo.AMS-Check',
                    'mtype': 'Active',
                    'probeversion': 'ams-probe (0.1.7)',
                    'probekey': self.probekey,
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
                    'dependency': [],
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
                    'mtype': 'Passive',
                    'probeversion': '',
                    'probekey': '',
                    'parent': '',
                    'probeexecutable': '',
                    'config': [],
                    'attribute': [],
                    'dependency': [],
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

    def test_get_metrictemplate_by_name(self):
        request = self.factory.get(self.url + 'argo.AMS-Check')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(
            response.data,
            {
                'id': self.id1,
                'name': 'argo.AMS-Check',
                'mtype': 'Active',
                'probeversion': 'ams-probe (0.1.7)',
                'probekey': self.probekey,
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
                'dependency': [],
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

    def test_get_metric_template_by_nonexisting_name(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Metric template not found'})

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template(self, func):
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
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': conf,
            'attribute': [{'key': '', 'value': ''}],
            'dependency': [{'key': '', 'value': ''}],
            'parameter': [{'key': '', 'value': ''}],
            'flags': [{'key': '', 'value': ''}],
            'files': [{'key': '', 'value': ''}],
            'fileparameter': [{'key': '', 'value': ''}]
        }

        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        mt = admin_models.MetricTemplate.objects.get(name='new-template')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(mt.mtype, self.mtype)
        self.assertEqual(mt.probeversion, 'ams-probe (0.1.7)')
        self.assertEqual(mt.probekey, self.probekey_instance)
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            "['maxCheckAttempts 4', 'timeout 70', "
            "'path /usr/libexec/argo-monitoring/probes/argo', "
            "'interval 6', 'retryInterval 4']"
        )

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_existing_name(self, func):
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
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': conf,
            'attribute': [{'key': '', 'value': ''}],
            'dependency': [{'key': '', 'value': ''}],
            'parameter': [{'key': '', 'value': ''}],
            'flags': [{'key': '', 'value': ''}],
            'files': [{'key': '', 'value': ''}],
            'fileparameter': [{'key': '', 'value': ''}]
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                'detail': 'Metric template with this name already exists.'
            }
        )

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate(self, func):
        func.return_value = ["argo.ams_TOKEN --token"]
        attr = [{'key': 'dependency-key', 'value': 'dependency-value'}]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'key': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]

        data = {
            'id': self.id1,
            'name': 'argo.AMS-Check',
            'mtype': self.mtype,
            'probeversion': 'ams-probe (0.1.7)',
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': conf,
            'attribute': attr,
            'dependency': [{'key': '', 'value': ''}],
            'parameter': [{'key': '', 'value': ''}],
            'flags': [{'key': '', 'value': ''}],
            'files': [{'key': '', 'value': ''}],
            'fileparameter': [{'key': '', 'value': ''}]
        }

        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(mt.attribute, "['argo.ams_TOKEN --token']")

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_existing_name(self, func):
        func.return_value = ["argo.ams_TOKEN --token"]
        attr = [{'key': 'dependency-key', 'value': 'dependency-value'}]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'key': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]

        data = {
            'id': self.id1,
            'name': 'org.apel.APEL-Pub',
            'mtype': self.mtype,
            'probeversion': 'ams-probe (0.1.7)',
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': conf,
            'attribute': attr,
            'dependency': [{'key': '', 'value': ''}],
            'parameter': [{'key': '', 'value': ''}],
            'flags': [{'key': '', 'value': ''}],
            'files': [{'key': '', 'value': ''}],
            'fileparameter': [{'key': '', 'value': ''}]
        }

        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'Metric template with this name already exists.'}
        )

    def test_delete_metric_template(self):
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 2)
        request = self.factory.delete(self.url + 'argo.AMS-Check')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 1)

    def test_delete_nonexisting_metric_template(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_metric_template_without_specifying_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ListMetricTemplateTypesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplateTypes.as_view()
        self.url = '/api/v2/internal/mttypes/'
        self.user = CustUser.objects.create_user(username='testuser')

        admin_models.MetricTemplateType.objects.create(name='Active')
        admin_models.MetricTemplateType.objects.create(name='Passive')

    def test_get_metric_template_types(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            [r for r in response.data],
            [
                'Active',
                'Passive'
            ]
        )


class ImportMetricsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ImportMetrics.as_view()
        self.url = '/api/v2/internal/importmetrics/'
        self.user = CustUser.objects.create_user(username='testuser')

        mt = admin_models.MetricTemplateType.objects.create(name='Active')
        poem_models.MetricType.objects.create(name='Active')

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            version='0.1.7',
            description='Probe is inspecting AMS service.',
            comment='Initial version',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probe2 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            version='0.1.11',
            description='Probe is inspecting AMS publisher running on Nagios '
                        'monitoring instances.',
            comment='New version',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        ct = ContentType.objects.get_for_model(admin_models.Probe)

        pk1 = admin_models.History.objects.create(
            object_id=probe1.id,
            serialized_data=serializers.serialize(
                'json', [probe1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True,
            ),
            object_repr='ams-probe (0.1.7)',
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        pk2 = admin_models.History.objects.create(
            object_id=probe2.id,
            serialized_data=serializers.serialize(
                'json', [probe2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True,
            ),
            object_repr='ams-publisher-probe (0.1.11)',
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.defaultGroup = poem_models.GroupOfMetrics.objects.create(
            name='TENANT'
        )

        self.template1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            probeversion='ams-probe (0.1.7)',
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]',
            mtype=mt,
            probekey=pk1
        )

        self.template2 = admin_models.MetricTemplate.objects.create(
            name='argo.AMSPublisher-Check',
            probeversion='ams-publisher-probe (0.1.11)',
            probeexecutable='["ams-publisher-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            flags='["NOHOSTNAME 1", "NOTIMEOUT 1"]',
            parameter='["-s /var/run/argo-nagios-ams-publisher/sock", '
                      '"-c 4000"]',
            mtype=mt,
            probekey=pk2
        )

    @patch('Poem.poem.dbmodels.metricstags.GroupOfMetrics.objects.get')
    def test_import_metrics(self, gm):
        gm.return_value = self.defaultGroup
        self.assertEqual(poem_models.Metric.objects.all().count(), 0)
        data = {
            'metrictemplates': ['argo.AMS-Check', 'argo.AMSPublisher-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(poem_models.Metric.objects.all().count(), 2)
        mt1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        mt2 = poem_models.Metric.objects.get(name='argo.AMSPublisher-Check')
        self.assertEqual(mt1.probeversion, self.template1.probeversion)
        self.assertEqual(mt1.parent, self.template1.parent)
        self.assertEqual(mt1.probeexecutable, self.template1.probeexecutable)
        self.assertEqual(mt1.config, self.template1.config)
        self.assertEqual(mt1.attribute, self.template1.attribute)
        self.assertEqual(mt1.dependancy, self.template1.dependency)
        self.assertEqual(mt1.flags, self.template1.flags)
        self.assertEqual(mt1.files, self.template1.files)
        self.assertEqual(mt1.parameter, self.template1.parameter)
        self.assertEqual(mt1.fileparameter, self.template1.fileparameter)
        self.assertEqual(mt1.probekey, self.template1.probekey)
        self.assertEqual(mt2.probeversion, self.template2.probeversion)
        self.assertEqual(mt2.parent, self.template2.parent)
        self.assertEqual(mt2.probeexecutable, self.template2.probeexecutable)
        self.assertEqual(mt2.config, self.template2.config)
        self.assertEqual(mt2.attribute, self.template2.attribute)
        self.assertEqual(mt2.dependancy, self.template2.dependency)
        self.assertEqual(mt2.flags, self.template2.flags)
        self.assertEqual(mt2.files, self.template2.files)
        self.assertEqual(mt2.parameter, self.template2.parameter)
        self.assertEqual(mt2.fileparameter, self.template2.fileparameter)
        self.assertEqual(mt2.probekey, self.template2.probekey)


class ListMetricTemplatesForProbeVersionAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplatesForProbeVersion.as_view()
        self.url = '/api/v2/internal/metricsforprobes/'
        self.user = CustUser.objects.create(username='testuser')

        mtype1 = admin_models.MetricTemplateType.objects.create(name='Active')
        mtype2 = admin_models.MetricTemplateType.objects.create(name='Passive')

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

        ct = ContentType.objects.get_for_model(admin_models.Probe)

        self.probeversion1 = admin_models.History.objects.create(
            object_id=probe1.id,
            serialized_data=serializers.serialize(
                'json', [probe1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True,
            ),
            object_repr='ams-probe (0.1.7)',
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        metrictemplate1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probeversion='ams-probe (0.1.7)',
            probekey=self.probeversion1,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        metrictemplate2 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=mtype2,
        )

        metrictemplate3 = admin_models.MetricTemplate.objects.create(
            name='test-metric',
            mtype=mtype1,
            probeversion='ams-probe (0.1.7)',
            probekey=self.probeversion1,
            probeexecutable='["test-metric"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        self.id1 = metrictemplate1.id
        self.id2 = metrictemplate2.id
        self.id3 = metrictemplate3.id

    def test_get_metric_templates_for_probe_version(self):
        request = self.factory.get(self.url + 'ams-probe(0.1.7)')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ams-probe(0.1.7)')
        self.assertEqual(
            [r for r in response.data],
            ['argo.AMS-Check', 'test-metric']
        )


class ListTenantVersionsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListTenantVersions.as_view()
        self.url = '/api/v2/internal/tenantversion/'
        self.user = CustUser.objects.create_user(username='testuser')

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            version='0.1.7',
            description='Probe is inspecting AMS service.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        ct_p = ContentType.objects.get_for_model(admin_models.Probe)
        ct_m = ContentType.objects.get_for_model(poem_models.Metric)

        self.ver1 = admin_models.History.objects.create(
            object_id=probe1.id,
            serialized_data=serializers.serialize(
                'json', [probe1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True,
            ),
            object_repr='ams-probe (0.1.7)',
            content_type=ct_p,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.mtype1 = poem_models.MetricType.objects.create(name='Active')
        group1 = poem_models.GroupOfMetrics.objects.create(name='EGI')

        metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            mtype=self.mtype1,
            group=group1,
            probeversion='ams-probe (0.1.7)',
            probekey=self.ver1,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        poem_models.Metric.objects.create(
            name='test.AMS-Check',
            mtype=self.mtype1,
            group=group1,
            probeversion='ams-probe (0.1.7)',
            probekey=self.ver1,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        self.ver1 = poem_models.TenantHistory.objects.create(
            object_id=metric1.id,
            serialized_data=serializers.serialize(
                'json', [metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr='argo.AMS-Check',
            content_type=ct_m,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

    def test_get_versions_of_metrics(self):
        request = self.factory.get(self.url + 'metric/argo.AMS-Check')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metric', 'argo.AMS-Check')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver1.id,
                    'object_repr': 'argo.AMS-Check',
                    'fields': {
                        'name': 'argo.AMS-Check',
                        'mtype': self.mtype1.name,
                        'group': 'EGI',
                        'probeversion': 'ams-probe (0.1.7)',
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


class ListYumReposAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListYumRepos.as_view()
        self.url = '/api/v2/internal/yumrepos/'
        self.user = CustUser.objects.create_user(username='testuser')

        self.repo1 = admin_models.YumRepo.objects.create(
            name='repo-1',
            content='content1=content1\ncontent2=content2',
            description='Lorem ipsum dolor sit amet, consectetur adipiscing '
                        'elit, sed do eiusmod tempor incididunt ut labore et '
                        'dolore magna aliqua. Condimentum mattis pellentesque '
                        'id nibh tortor. Ut eu sem integer vitae justo eget '
                        'magna fermentum. Neque convallis a cras semper auctor '
                        'neque vitae tempus quam. In metus vulputate eu '
                        'scelerisque felis imperdiet proin fermentum. Semper '
                        'quis lectus nulla at. Hac habitasse platea dictumst '
                        'quisque sagittis purus.'
        )

        self.repo2 = admin_models.YumRepo.objects.create(
            name='repo-2',
            content='content1=content1\ncontent2=content2',
            description='Quam viverra orci sagittis eu volutpat odio facilisis '
                        'mauris. Justo eget magna fermentum iaculis eu non '
                        'diam. Porta non pulvinar neque laoreet suspendisse. '
                        'Suspendisse sed nisi lacus sed viverra tellus. Mattis '
                        'ullamcorper velit sed ullamcorper morbi tincidunt '
                        'ornare massa. Quis vel eros donec ac odio tempor orci '
                        'dapibus ultrices. Duis ut diam quam nulla porttitor '
                        'massa id neque aliquam. Augue interdum velit euismod '
                        'in pellentesque. Elementum integer enim neque volutpat'
                        ' ac tincidunt vitae semper. A diam maecenas sed enim '
                        'ut sem viverra aliquet eget. Eget velit aliquet '
                        'sagittis id consectetur purus ut faucibus pulvinar.'
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
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Lorem ipsum dolor sit amet, consectetur '
                                   'adipiscing elit, sed do eiusmod tempor '
                                   'incididunt ut labore et '
                                   'dolore magna aliqua. Condimentum mattis '
                                   'pellentesque id nibh tortor. Ut eu sem '
                                   'integer vitae justo eget '
                                   'magna fermentum. Neque convallis a cras '
                                   'semper auctor neque vitae tempus quam. In '
                                   'metus vulputate eu scelerisque felis '
                                   'imperdiet proin fermentum. Semper '
                                   'quis lectus nulla at. Hac habitasse platea '
                                   'dictumst quisque sagittis purus.'
                },
                {
                    'id': self.repo2.id,
                    'name': 'repo-2',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Quam viverra orci sagittis eu volutpat '
                                   'odio facilisis mauris. Justo eget magna '
                                   'fermentum iaculis eu non diam. Porta non '
                                   'pulvinar neque laoreet suspendisse. '
                                   'Suspendisse sed nisi lacus sed viverra '
                                   'tellus. Mattis ullamcorper velit sed '
                                   'ullamcorper morbi tincidunt ornare massa. '
                                   'Quis vel eros donec ac odio tempor orci '
                                   'dapibus ultrices. Duis ut diam quam nulla '
                                   'porttitor massa id neque aliquam. Augue '
                                   'interdum velit euismod in pellentesque. '
                                   'Elementum integer enim neque volutpat'
                                   ' ac tincidunt vitae semper. A diam '
                                   'maecenas sed enim ut sem viverra aliquet '
                                   'eget. Eget velit aliquet sagittis id '
                                   'consectetur purus ut faucibus pulvinar.'
                }
            ]
        )

    def test_get_yum_repo_by_name(self):
        request = self.factory.get(self.url + 'repo-1')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'repo-1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'id': self.repo1.id,
                'name': 'repo-1',
                'content': 'content1=content1\ncontent2=content2',
                'description': 'Lorem ipsum dolor sit amet, consectetur '
                               'adipiscing elit, sed do eiusmod tempor '
                               'incididunt ut labore et '
                               'dolore magna aliqua. Condimentum mattis '
                               'pellentesque id nibh tortor. Ut eu sem '
                               'integer vitae justo eget '
                               'magna fermentum. Neque convallis a cras '
                               'semper auctor neque vitae tempus quam. In '
                               'metus vulputate eu scelerisque felis '
                               'imperdiet proin fermentum. Semper '
                               'quis lectus nulla at. Hac habitasse platea '
                               'dictumst quisque sagittis purus.'
            }
        )

    def test_get_yum_repo_in_case_of_nonexisting_name(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_yum_repo(self):
        data = {
            'name': 'repo-3',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Lorem ipsum dolor sit amet, consectetur adipiscing '
                           'elit, sed do eiusmod tempor incididunt ut labore '
                           'et dolore magna aliqua. Morbi non arcu risus quis '
                           'varius quam quisque id. Phasellus faucibus '
                           'scelerisque eleifend donec pretium vulputate '
                           'sapien nec.'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_post_yum_repo_with_name_that_already_exists(self):
        data = {
            'name': 'repo-1',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Lorem ipsum dolor sit amet, consectetur adipiscing '
                           'elit, sed do eiusmod tempor incididunt ut labore '
                           'et dolore magna aliqua. Morbi non arcu risus quis '
                           'varius quam quisque id. Phasellus faucibus '
                           'scelerisque eleifend donec pretium vulputate '
                           'sapien nec.'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'YUM repo with this name already exists.'}
        )

    def test_put_yum_repo(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-1',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Lorem ipsum dolor sit amet, consectetur adipiscing '
                           'elit, sed do eiusmod tempor incididunt ut labore '
                           'et dolore magna aliqua.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_put_yum_repo_with_existing_name(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Lorem ipsum dolor sit amet, consectetur adipiscing '
                           'elit, sed do eiusmod tempor incididunt ut labore '
                           'et dolore magna aliqua.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'YUM repo with this name already exists.'}
        )

    def test_delete_yum_repo(self):
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        request = self.factory.delete(self.url + 'repo-1')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'repo-1')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 1)

    def test_delete_yum_repo_without_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_yum_repo_nonexisting_name(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'YUM repo not found.'})


class HistoryHelpersTests(TenantTestCase):
    def setUp(self):
        self.probe1 = admin_models.Probe.objects.create(
            name='probe-1',
            version='1.0.0',
            description='Some description.',
            comment='Some comment.',
            repository='https://repository.url',
            docurl='https://doc.url',
            user='testuser',
            datetime=datetime.datetime.now()
        )

        self.ct_probe = ContentType.objects.get_for_model(admin_models.Probe)
        self.ct_mt = ContentType.objects.get_for_model(
            admin_models.MetricTemplate
        )
        self.ct_metric = ContentType.objects.get_for_model(poem_models.Metric)

        self.active = admin_models.MetricTemplateType.objects.create(
            name='Active'
        )
        self.metric_active = poem_models.MetricType.objects.create(
            name='Active'
        )

        probe_history1 = admin_models.History.objects.create(
            object_id=self.probe1.id,
            serialized_data=serializers.serialize(
                'json', [self.probe1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.probe1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct_probe
        )

        self.probe1.version = '1.0.1'
        self.probe1.comment = 'New version.'
        self.probe1.save()

        self.probe_history2 = admin_models.History.objects.create(
            object_id=self.probe1.id,
            serialized_data=serializers.serialize(
                'json', [self.probe1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.probe1.__str__(),
            comment='New version.',
            user='testuser',
            content_type=self.ct_probe
        )

        self.mt1 = admin_models.MetricTemplate.objects.create(
            name='metric-template-1',
            probeversion='probe-1 (1.0.0)',
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

        admin_models.History.objects.create(
            object_id=self.mt1.id,
            serialized_data=serializers.serialize(
                'json', [self.mt1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.mt1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct_mt
        )

        self.metric1 = poem_models.Metric.objects.create(
            name='metric-1',
            probeversion='probe-1 (1.0.0)',
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


    def test_create_comment_for_metric_template(self):
        mt = admin_models.MetricTemplate(
            name='metric-template-2',
            probeversion='probe-1 (1.0.1)',
            probekey=self.probe_history2,
            probeexecutable='["new-probeexecutable"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependency='["dependency-key1 dependency-value1"]',
            flags='["flags-key flags-value", "flags-key1 flags-value2"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.active
        )

        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )

        comment = create_comment(self.mt1.id, self.ct_mt, serialized_data)

        self.assertEqual(
            json.loads(comment),
            [
                {
                    'deleted': {
                        'fields': ['dependency'],
                        'object': ['dependency-key2']
                    }
                },
                {
                    'added': {
                        'fields': ['flags'],
                        'object': ['flags-key1']
                    }
                },
                {
                    'added': {
                        'fields': ['probeexecutable']
                    }
                },
                {
                    'changed': {
                        'fields': [
                            'name', 'probeversion'
                        ]
                    }
                },
                {
                    'deleted': {
                        'fields': ['parent']
                    }
                }
            ]
        )

    def test_create_comment_for_metric_template_if_field_deleted_from_model(self):
        mt = admin_models.MetricTemplate(
            name='metric-template-2',
            probeversion='probe-1 (1.0.1)',
            probekey=self.probe_history2,
            probeexecutable='["new-probeexecutable"]',
            config='["maxCheckAttempts 4", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependency='["dependency-key1 dependency-value1"]',
            flags='["flags-key flags-value", "flags-key1 flags-value2"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            mtype=self.active
        )

        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )

        # let's say fileparameter and probeversion fields no longer exists in
        # the model
        dict_serialized = json.loads(serialized_data)
        del dict_serialized[0]['fields']['fileparameter']
        del dict_serialized[0]['fields']['probeversion']
        new_serialized_data = json.dumps(dict_serialized)

        comment = create_comment(self.mt1.id, self.ct_mt, new_serialized_data)

        self.assertEqual(
            json.loads(comment),
            [
                {
                    'changed': {
                        'fields': ['config'],
                        'object': ['maxCheckAttempts']
                    }
                },
                {
                    'deleted': {
                        'fields': ['dependency'],
                        'object': ['dependency-key2']
                    }
                },
                {
                    'added': {
                        'fields': ['flags'],
                        'object': ['flags-key1']
                    }
                },
                {
                    'added': {
                        'fields': ['probeexecutable']
                    }
                },
                {
                    'changed': {
                        'fields': [
                            'name'
                        ]
                    }
                },
                {
                    'deleted': {
                        'fields': ['parent']
                    }
                }
            ]
        )

    def test_create_comment_for_metric_template_if_field_added_to_model(self):
        mt = admin_models.MetricTemplate(
            name='metric-template-2',
            probeversion='probe-1 (1.0.1)',
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

        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )

        # let's say mock_field was added to model
        dict_serialized = json.loads(serialized_data)
        dict_serialized[0]['fields']['mock_field'] = 'mock_value'
        new_serialized_data = json.dumps(dict_serialized)

        comment = create_comment(self.mt1.id, self.ct_mt, new_serialized_data)

        self.assertEqual(
            json.loads(comment),
            [
                {
                    'changed': {
                        'fields': ['config'],
                        'object': ['maxCheckAttempts', 'retryInterval']
                    }
                },
                {
                    'deleted': {
                        'fields': ['dependency'],
                        'object': ['dependency-key2']
                    }
                },
                {
                    'added': {
                        'fields': ['flags'],
                        'object': ['flags-key1']
                    }
                },
                {
                    'added': {
                        'fields': ['probeexecutable', 'mock_field']
                    }
                },
                {
                    'changed': {
                        'fields': [
                            'name', 'probeversion'
                        ]
                    }
                },
                {
                    'deleted': {
                        'fields': ['parent']
                    }
                }
            ]
        )

    def test_create_comment_for_metric_template_if_initial(self):
        mt = admin_models.MetricTemplate.objects.create(
            name='metric-template-2',
            probeversion='probe-1 (1.0.1)',
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

        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )

        comment = create_comment(mt.id, self.ct_mt, serialized_data)

        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_probe(self):
        probe1 = admin_models.Probe(
            name='probe-2',
            version='1.0.2',
            description='Some new description.',
            comment='Newer version.',
            repository='https://repository2.url',
            docurl='https://doc2.url',
            user='testuser',
            datetime=self.probe1.datetime
        )

        serialized_data = serializers.serialize(
            'json', [probe1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )

        comment = create_comment(self.probe1.id, self.ct_probe, serialized_data)

        self.assertEqual(
            json.loads(comment),
            [
                {'changed': {
                    'fields': [
                        'name', 'version', 'description', 'comment',
                        'repository', 'docurl'
                    ]
                }}
            ]
        )

    def test_create_comment_for_probe_if_field_deleted_from_model(self):
        probe1 = admin_models.Probe(
            name='probe-2',
            version='1.0.2',
            description='Some new description.',
            comment='Newer version.',
            repository='https://repository2.url',
            docurl='https://doc2.url',
            user='testuser',
            datetime=self.probe1.datetime
        )

        serialized_data = serializers.serialize(
            'json', [probe1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )

        # let's say docurl field no longer exists in Probe model
        dict_serialized = json.loads(serialized_data)
        del dict_serialized[0]['fields']['docurl']
        new_serialized_data = json.dumps(dict_serialized)

        comment = create_comment(self.probe1.id, self.ct_probe,
                                 new_serialized_data)

        self.assertEqual(
            json.loads(comment),
            [
                {
                    'changed': {
                        'fields': [
                            'name', 'version', 'description', 'comment',
                            'repository'
                        ]
                    }
                }
            ]
        )

    def test_create_comment_for_probe_if_field_added_to_model(self):
        probe1 = admin_models.Probe(
            name='probe-2',
            version='1.0.2',
            description='Some new description.',
            comment='Newer version.',
            repository='https://repository2.url',
            docurl='https://doc2.url',
            user='testuser',
            datetime=self.probe1.datetime
        )

        serialized_data = serializers.serialize(
            'json', [probe1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )

        # let's say mock_field field was added in Probe model
        dict_serialized = json.loads(serialized_data)
        dict_serialized[0]['fields']['mock_field'] = 'mock_value'
        new_serialized_data = json.dumps(dict_serialized)

        comment = create_comment(self.probe1.id, self.ct_probe,
                                 new_serialized_data)

        self.assertEqual(
            json.loads(comment),
            [
                {
                    'added': {
                        'fields': ['mock_field']
                    }
                },
                {
                    'changed': {
                        'fields': [
                            'name', 'version', 'description', 'comment',
                            'repository', 'docurl'
                        ]
                    }
                }
            ]
        )

    def test_create_comment_for_probe_if_initial(self):
        probe2 = admin_models.Probe.objects.create(
            name='probe-2',
            version='1.0.2',
            description='Some new description.',
            comment='Newer version.',
            repository='https://repository2.url',
            docurl='https://doc2.url',
            user='testuser',
            datetime=datetime.datetime.now()
        )

        serialized_data = serializers.serialize(
            'json', [probe2],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        comment = create_comment(probe2.id, self.ct_probe, serialized_data)

        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_metric(self):
        metric = poem_models.Metric(
            name='metric-2',
            probeversion='probe-1 (1.0.1)',
            probekey=self.probe_history2,
            probeexecutable='["new-probeexecutable"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependancy='["dependency-key1 dependency-value1"]',
            flags='["flags-key flags-value", "flags-key1 flags-value2"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.metric_active
        )

        serialized_data = serializers.serialize(
            'json', [metric],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )

        comment = create_comment(self.metric1.id, self.ct_metric,
                                 serialized_data)

        self.assertEqual(
            json.loads(comment),
            [
                {
                    'deleted': {
                        'fields': ['dependancy'],
                        'object': ['dependency-key2']
                    }
                },
                {
                    'added': {
                        'fields': ['flags'],
                        'object': ['flags-key1']
                    }
                },
                {
                    'added': {
                        'fields': ['probeexecutable']
                    }
                },
                {
                    'changed': {
                        'fields': [
                            'name', 'probeversion'
                        ]
                    }
                },
                {
                    'deleted': {
                        'fields': ['parent']
                    }
                }
            ]
        )

    def test_create_comment_for_metric_if_field_deleted_from_model(self):
        mt = poem_models.Metric(
            name='metric-2',
            probeversion='probe-1 (1.0.1)',
            probekey=self.probe_history2,
            probeexecutable='["new-probeexecutable"]',
            config='["maxCheckAttempts 4", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependancy='["dependency-key1 dependency-value1"]',
            flags='["flags-key flags-value", "flags-key1 flags-value2"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            mtype=self.metric_active
        )

        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )

        # let's say fileparameter and probeversion fields no longer exists in
        # the model
        dict_serialized = json.loads(serialized_data)
        del dict_serialized[0]['fields']['fileparameter']
        del dict_serialized[0]['fields']['probeversion']
        new_serialized_data = json.dumps(dict_serialized)

        comment = create_comment(self.metric1.id, self.ct_metric,
                                 new_serialized_data)

        self.assertEqual(
            json.loads(comment),
            [
                {
                    'changed': {
                        'fields': ['config'],
                        'object': ['maxCheckAttempts']
                    }
                },
                {
                    'deleted': {
                        'fields': ['dependancy'],
                        'object': ['dependency-key2']
                    }
                },
                {
                    'added': {
                        'fields': ['flags'],
                        'object': ['flags-key1']
                    }
                },
                {
                    'added': {
                        'fields': ['probeexecutable']
                    }
                },
                {
                    'changed': {
                        'fields': [
                            'name'
                        ]
                    }
                },
                {
                    'deleted': {
                        'fields': ['parent']
                    }
                }
            ]
        )

    def test_create_comment_for_metric_if_field_added_to_model(self):
        mt = poem_models.Metric(
            name='metric-2',
            probeversion='probe-1 (1.0.1)',
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

        # let's say mock_field was added to model
        dict_serialized = json.loads(serialized_data)
        dict_serialized[0]['fields']['mock_field'] = 'mock_value'
        new_serialized_data = json.dumps(dict_serialized)

        comment = create_comment(self.metric1.id, self.ct_metric,
                                 new_serialized_data)

        self.assertEqual(
            json.loads(comment),
            [
                {
                    'changed': {
                        'fields': ['config'],
                        'object': ['maxCheckAttempts', 'retryInterval']
                    }
                },
                {
                    'deleted': {
                        'fields': ['dependancy'],
                        'object': ['dependency-key2']
                    }
                },
                {
                    'added': {
                        'fields': ['flags'],
                        'object': ['flags-key1']
                    }
                },
                {
                    'added': {
                        'fields': ['probeexecutable', 'mock_field']
                    }
                },
                {
                    'changed': {
                        'fields': [
                            'name', 'probeversion'
                        ]
                    }
                },
                {
                    'deleted': {
                        'fields': ['parent']
                    }
                }
            ]
        )

    def test_create_comment_for_metric_if_initial(self):
        mt = poem_models.Metric.objects.create(
            name='metric-template-2',
            probeversion='probe-1 (1.0.1)',
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

        comment = create_comment(mt.id, self.ct_metric, serialized_data)

        self.assertEqual(comment, 'Initial version.')


class ListThresholdsProfilesInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListThresholdsProfilesInGroup.as_view()
        self.url = '/api/v2/internal/thresholdsprofilesgroup/'
        self.user = CustUser.objects.create_user(username='testuser')

        self.tp1 = poem_models.ThresholdsProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.tp2 = poem_models.ThresholdsProfiles.objects.create(
            name='ANOTHER_PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        self.tp3 = poem_models.ThresholdsProfiles.objects.create(
            name='DELETE_PROFILE',
            apiid='12341234-hhhh-kkkk-aaaa-aaeekkccnnee',
            groupname='delete'
        )

        self.group = poem_models.GroupOfThresholdsProfiles.objects.create(
            name='EGI'
        )
        group2 = poem_models.GroupOfThresholdsProfiles.objects.create(
            name='delete'
        )
        self.group.thresholdsprofiles.add(self.tp1)
        group2.thresholdsprofiles.add(self.tp3)

    def test_get_thresholds_profiles_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.tp1.id, 'name': 'TEST_PROFILE'}
                ]
            }
        )

    def test_get_thresholds_profiles_in_group_in_case_no_authorization(self):
        request = self.factory.get(self.url + 'EGI')
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_thresholds_profiles_without_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                'result': [
                    {'id': self.tp2.id, 'name': 'ANOTHER_PROFILE'}
                ]
            }
        )

    def test_add_thresholds_profile_in_group(self):
        self.assertEqual(self.group.thresholdsprofiles.count(), 1)
        data = {
            'name': 'EGI',
            'items': ['TEST_PROFILE', 'ANOTHER_PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tp1 = poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE')
        tp2 = poem_models.ThresholdsProfiles.objects.get(name='ANOTHER_PROFILE')
        self.assertEqual(tp1.groupname, 'EGI')
        self.assertEqual(tp2.groupname, 'EGI')
        self.assertEqual(self.group.thresholdsprofiles.count(), 2)

    def test_remove_thresholds_profile_from_group(self):
        self.group.thresholdsprofiles.add(self.tp2)
        self.assertEqual(self.group.thresholdsprofiles.all().count(), 2)
        data = {
            'name': 'EGI',
            'items': ['ANOTHER_PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tp1 = poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE')
        tp2 = poem_models.ThresholdsProfiles.objects.get(name='ANOTHER_PROFILE')
        self.assertEqual(tp1.groupname, '')
        self.assertEqual(tp2.groupname, 'EGI')
        self.assertEqual(self.group.thresholdsprofiles.count(), 1)

    def test_post_thresholds_profile_group_without_tp(self):
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        data = {
            'name': 'new_group',
            'items': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 3
        )
        group = poem_models.GroupOfThresholdsProfiles.objects.get(
            name='new_group'
        )
        self.assertEqual(group.name, 'new_group')
        self.assertEqual(group.thresholdsprofiles.count(), 0)

    def test_post_thresholds_profile_group_with_tp(self):
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        data = {
            'name': 'new_group',
            'items': ['ANOTHER_PROFILE']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 3
        )
        group = poem_models.GroupOfThresholdsProfiles.objects.get(
            name='new_group'
        )
        self.assertEqual(group.name, 'new_group')
        self.assertEqual(group.thresholdsprofiles.count(), 1)
        tp1 = poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE')
        tp2 = poem_models.ThresholdsProfiles.objects.get(name='ANOTHER_PROFILE')
        self.assertEqual(tp1.groupname, 'EGI')
        self.assertEqual(tp2.groupname, 'new_group')

    def test_post_thresholds_profile_group_with_name_that_already_exists(self):
        data = {
            'name': 'EGI',
            'items': ['TEST_PROFILE']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                'detail':
                    'Thresholds profiles group with this name already exists.'
            }
        )

    def test_delete_thresholds_profile_group(self):
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 1
        )
        self.assertRaises(
            poem_models.GroupOfThresholdsProfiles.DoesNotExist,
            poem_models.GroupOfThresholdsProfiles.objects.get,
            name='delete'
        )
        tp = poem_models.ThresholdsProfiles.objects.get(name='DELETE_PROFILE')
        self.assertEqual(tp.groupname, '')

    def test_delete_nonexisting_thresholds_profile_group(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_thresholds_profile_group_without_specifying_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
