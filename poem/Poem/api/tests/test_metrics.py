import datetime
import json
from unittest.mock import patch, call

import requests
from Poem.api import views_internal as views
from Poem.api.internal_views.utils import inline_metric_for_db
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from django_tenants.utils import get_public_schema_name, schema_context, \
    get_tenant_domain_model
from rest_framework import status
from rest_framework.test import force_authenticate

from .utils_test import mocked_func, encode_data, mocked_inline_metric_for_db, \
    MockResponse


class ListAllMetricsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAllMetrics.as_view()
        self.url = '/api/v2/internal/metricsall/'
        self.user = CustUser.objects.create_user(username='testuser')

        group = poem_models.GroupOfMetrics.objects.create(name='EGI')
        poem_models.GroupOfMetrics.objects.create(name='delete')

        mtype1 = poem_models.MetricType.objects.create(name='Active')
        mtype2 = poem_models.MetricType.objects.create(name='Passive')

        tag = admin_models.OSTag.objects.create(name='CentOS 6')
        repo = admin_models.YumRepo.objects.create(name='repo-1', tag=tag)
        package = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.7'
        )
        package.repos.add(repo)

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            package=package,
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probeversion1 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username,
        )

        poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probekey=probeversion1,
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


class ListMetricAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetric.as_view()
        self.url = '/api/v2/internal/metric/'
        self.superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )
        self.user = CustUser.objects.create_user(username='testuser')
        self.limited_user = CustUser.objects.create_user(username='limited')

        mtype1 = poem_models.MetricType.objects.create(name='Active')
        mtype2 = poem_models.MetricType.objects.create(name='Passive')

        self.mtag1 = admin_models.MetricTags.objects.create(name='test_tag1')
        self.mtag2 = admin_models.MetricTags.objects.create(name='test_tag2')

        group1 = poem_models.GroupOfMetrics.objects.create(name='EGI')
        group2 = poem_models.GroupOfMetrics.objects.create(name='ARGO')
        group3 = poem_models.GroupOfMetrics.objects.create(name='EUDAT')

        userprofile = poem_models.UserProfile.objects.create(user=self.user)
        userprofile.groupsofmetrics.add(group1)
        userprofile.groupsofmetrics.add(group2)

        poem_models.UserProfile.objects.create(user=self.superuser)
        poem_models.UserProfile.objects.create(user=self.limited_user)

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

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            package=package1,
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        self.probeversion1 = admin_models.ProbeHistory.objects.create(
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
        probe1.comment = 'Updated version.'
        probe1.save()

        self.probeversion2 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Updated version.',
            version_user=self.user.username
        )

        probe2 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            package=package1,
            description='Probe is inspecting AMS publisher running on Nagios '
                        'monitoring instances.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        self.probeversion3 = admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=probe2.package,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe2.package = package2
        probe2.comment = 'Updated version.'
        probe2.save()

        self.probeversion4 = admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=probe2.package,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Updated version.',
            version_user=self.user.username
        )

        self.metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probekey=self.probeversion1,
            description='Description of argo.AMS-Check',
            group=group1,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        self.metric1.tags.add(self.mtag1, self.mtag2)

        self.metric2 = poem_models.Metric.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            group=group1,
            mtype=mtype2
        )

        self.metric3 = poem_models.Metric.objects.create(
            name='argo.AMSPublisher-Check',
            mtype=mtype1,
            probekey=self.probeversion3,
            description='',
            group=group3,
            probeexecutable='["ams-publisher-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            parameter='["-s /var/run/argo-nagios-ams-publisher/sock"]',
            flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
        )
        self.metric3.tags.add(self.mtag1)

        self.ct = ContentType.objects.get_for_model(poem_models.Metric)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            object_repr=self.metric1.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            date_created=datetime.datetime.now(),
            user=self.user.username,
            comment='Initial version.',
            content_type=self.ct
        )

        poem_models.TenantHistory.objects.create(
            object_id=self.metric2.id,
            object_repr=self.metric2.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            date_created=datetime.datetime.now(),
            user=self.user.username,
            comment='Initial version.',
            content_type=self.ct
        )

        poem_models.TenantHistory.objects.create(
            object_id=self.metric3.id,
            object_repr=self.metric3.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric3],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            date_created=datetime.datetime.now(),
            user=self.user.username,
            comment='Initial version.',
            content_type=self.ct
        )

    def test_get_metric_list(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.metric1.id,
                    'name': 'argo.AMS-Check',
                    'mtype': 'Active',
                    'tags': ['test_tag1', 'test_tag2'],
                    'probeversion': 'ams-probe (0.1.7)',
                    'group': 'EGI',
                    'description': 'Description of argo.AMS-Check',
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
                    'id': self.metric3.id,
                    'name': 'argo.AMSPublisher-Check',
                    'mtype': 'Active',
                    'tags': ['test_tag1'],
                    'probeversion': 'ams-publisher-probe (0.1.7)',
                    'group': 'EUDAT',
                    'description': '',
                    'parent': '',
                    'probeexecutable': 'ams-publisher-probe',
                    'config': [
                        {
                            'key': 'interval',
                            'value': '180'
                        },
                        {
                            'key': 'maxCheckAttempts',
                            'value': '1'
                        },
                        {
                            'key': 'path',
                            'value': '/usr/libexec/argo-monitoring/probes/argo'
                        },
                        {
                            'key': 'retryInterval',
                            'value': '1'
                        },
                        {
                            'key': 'timeout',
                            'value': '120'
                        }
                    ],
                    'attribute': [],
                    'dependancy': [],
                    'flags': [
                        {'key': 'NOHOSTNAME', 'value': '1'},
                        {'key': 'NOTIMEOUT', 'value': '1'},
                        {'key': 'NOPUBLISH', 'value': '1'}
                    ],
                    'files': [],
                    'parameter': [
                        {
                            'key': '-s',
                            'value': '/var/run/argo-nagios-ams-publisher/sock'
                        }
                    ],
                    'fileparameter': []
                },
                {
                    'id': self.metric2.id,
                    'name': 'org.apel.APEL-Pub',
                    'mtype': 'Passive',
                    'tags': [],
                    'probeversion': '',
                    'group': 'EGI',
                    'description': '',
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
                'id': self.metric1.id,
                'name': 'argo.AMS-Check',
                'mtype': 'Active',
                'tags': ['test_tag1', 'test_tag2'],
                'probeversion': 'ams-probe (0.1.7)',
                'group': 'EGI',
                'description': 'Description of argo.AMS-Check',
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
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_superuser(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EUDAT',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        )
        self.assertEqual(versions.count(), 2)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.mtype.name, 'Active')
        self.assertEqual(len(metric.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag2 in metric.tags.all())
        self.assertEqual(metric.probekey, self.probeversion2)
        self.assertEqual(metric.group.name, 'EUDAT')
        self.assertEqual(
            metric.description, 'New description of argo.AMS-Check'
        )
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]')
        self.assertEqual(
            metric.attribute,
            '["argo.ams_TOKEN2 --token", "mock_attribute attr"]'
        )
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(
            serialized_data['probekey'],
            [metric.probekey.name, metric.probekey.package.version]
        )
        self.assertEqual(serialized_data['parent'], metric.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metric.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metric.attribute)
        self.assertEqual(serialized_data['dependancy'], metric.dependancy)
        self.assertEqual(serialized_data['flags'], metric.flags)
        self.assertEqual(serialized_data['files'], metric.files)
        self.assertEqual(serialized_data['parameter'], metric.parameter)
        self.assertEqual(serialized_data['fileparameter'], metric.fileparameter)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_regular_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'ARGO',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        )
        self.assertEqual(versions.count(), 2)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.mtype.name, 'Active')
        self.assertEqual(len(metric.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag2 in metric.tags.all())
        self.assertEqual(metric.probekey, self.probeversion2)
        self.assertEqual(metric.group.name, 'ARGO')
        self.assertEqual(
            metric.description, 'New description of argo.AMS-Check'
        )
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]')
        self.assertEqual(
            metric.attribute,
            '["argo.ams_TOKEN2 --token", "mock_attribute attr"]'
        )
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(
            serialized_data['probekey'],
            [metric.probekey.name, metric.probekey.package.version]
        )
        self.assertEqual(serialized_data['parent'], metric.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metric.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metric.attribute)
        self.assertEqual(serialized_data['dependancy'], metric.dependancy)
        self.assertEqual(serialized_data['flags'], metric.flags)
        self.assertEqual(serialized_data['files'], metric.files)
        self.assertEqual(serialized_data['parameter'], metric.parameter)
        self.assertEqual(serialized_data['fileparameter'], metric.fileparameter)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_regular_user_wrong_group(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EUDAT',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign metrics to the given group.'
        )
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        )
        self.assertEqual(versions.count(), 1)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.mtype.name, 'Active')
        self.assertEqual(len(metric.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag2 in metric.tags.all())
        self.assertEqual(metric.probekey, self.probeversion1)
        self.assertEqual(metric.group.name, 'EGI')
        self.assertEqual(
            metric.description, 'Description of argo.AMS-Check'
        )
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]')
        self.assertEqual(
            metric.attribute,
            '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(
            serialized_data['probekey'],
            [metric.probekey.name, metric.probekey.package.version]
        )
        self.assertEqual(serialized_data['parent'], metric.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metric.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metric.attribute)
        self.assertEqual(serialized_data['dependancy'], metric.dependancy)
        self.assertEqual(serialized_data['flags'], metric.flags)
        self.assertEqual(serialized_data['files'], metric.files)
        self.assertEqual(serialized_data['parameter'], metric.parameter)
        self.assertEqual(serialized_data['fileparameter'], metric.fileparameter)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_regular_user_wrong_init_group(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'argo.AMSPublisher-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EGI',
            'description': 'New description',
            'parent': '',
            'probeversion': 'ams-publisher-probe (0.1.11)',
            'probeexecutable': 'ams-publisher-probe',
            'config': json.dumps(conf),
            'attribute': '[{"key": "", "value": ""}]',
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metrics in this group.'
        )
        metric = poem_models.Metric.objects.get(name='argo.AMSPublisher-Check')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        )
        self.assertEqual(versions.count(), 1)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.mtype.name, 'Active')
        self.assertEqual(len(metric.tags.all()), 1)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertEqual(metric.probekey, self.probeversion3)
        self.assertEqual(metric.group.name, 'EUDAT')
        self.assertEqual(metric.description, '')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-publisher-probe"]')
        self.assertEqual(
            metric.config,
            '["interval 180", "maxCheckAttempts 1", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"retryInterval 1", "timeout 120"]',
        )
        self.assertEqual(metric.attribute, '')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(
            metric.flags, '["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
        )
        self.assertEqual(metric.files, '')
        self.assertEqual(
            metric.parameter, '["-s /var/run/argo-nagios-ams-publisher/sock"]'
        )
        self.assertEqual(metric.fileparameter, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(serialized_data['tags'], [['test_tag1']])
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(
            serialized_data['probekey'],
            [metric.probekey.name, metric.probekey.package.version]
        )
        self.assertEqual(serialized_data['parent'], metric.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metric.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metric.attribute)
        self.assertEqual(serialized_data['dependancy'], metric.dependancy)
        self.assertEqual(serialized_data['flags'], metric.flags)
        self.assertEqual(serialized_data['files'], metric.files)
        self.assertEqual(serialized_data['parameter'], metric.parameter)
        self.assertEqual(serialized_data['fileparameter'], metric.fileparameter)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_limited_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EUDAT',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metrics.'
        )
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        )
        self.assertEqual(versions.count(), 1)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.mtype.name, 'Active')
        self.assertEqual(len(metric.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag2 in metric.tags.all())
        self.assertEqual(metric.probekey, self.probeversion1)
        self.assertEqual(metric.group.name, 'EGI')
        self.assertEqual(
            metric.description, 'Description of argo.AMS-Check'
        )
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]')
        self.assertEqual(
            metric.attribute,
            '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(
            serialized_data['probekey'],
            [metric.probekey.name, metric.probekey.package.version]
        )
        self.assertEqual(serialized_data['parent'], metric.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metric.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metric.attribute)
        self.assertEqual(serialized_data['dependancy'], metric.dependancy)
        self.assertEqual(serialized_data['flags'], metric.flags)
        self.assertEqual(serialized_data['files'], metric.files)
        self.assertEqual(serialized_data['parameter'], metric.parameter)
        self.assertEqual(serialized_data['fileparameter'], metric.fileparameter)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_nonexisting_metric_superuser(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'nonexisting.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EUDAT',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Metric does not exist.')
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_nonexisting_metric_superuser(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'nonexisting.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EUDAT',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Metric does not exist.')
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_nonexisting_metric_regular_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'nonexisting.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EUDAT',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Metric does not exist.')
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_nonexisting_metric_limited_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'nonexisting.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EUDAT',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Metric does not exist.')
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_nonexisting_group_superuser(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'nonexisting',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of metrics does not exist.'
        )
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_nonexisting_group_regular_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'nonexisting',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of metrics does not exist.'
        )
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_nonexisting_group_limited_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'nonexisting',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metrics.'
        )
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_nonexisting_type_superuser(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'nonexisting',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EGI',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Metric type does not exist.')
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_nonexisting_type_regular_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'nonexisting',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EGI',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Metric type does not exist.')
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_nonexisting_type_limited_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'nonexisting',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EGI',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metrics.'
        )
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_missing_key_superuser(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EGI',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: flags')
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_missing_key_regular_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EGI',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: flags')
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_metric_missing_key_limited_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        attribute = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'},
            {'key': 'mock_attribute', 'value': 'attr'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'group': 'EGI',
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metrics.'
        )
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_passive_metric_superuser(self, func):
        func.side_effect = mocked_inline_metric_for_db
        data = {
            'name': 'org.apel.APEL-Pub',
            'mtype': 'Passive',
            'tags': [],
            'probeversion': '',
            'group': 'EUDAT',
            'description': 'Description of passive metric org.apel.APEL-Pub.',
            'parent': 'test-parent',
            'probeexecutable': 'ams-probe',
            'config': '[{"key": "", "value": ""}]',
            'attribute': '[{"key": "", "value": ""}]',
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "PASSIVE", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        metric = poem_models.Metric.objects.get(name='org.apel.APEL-Pub')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        )
        self.assertEqual(versions.count(), 2)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.mtype.name, 'Passive')
        self.assertEqual(len(metric.tags.all()), 0)
        self.assertEqual(metric.probekey, None)
        self.assertEqual(metric.group.name, 'EUDAT')
        self.assertEqual(
            metric.description,
            'Description of passive metric org.apel.APEL-Pub.'
        )
        self.assertEqual(metric.parent, '["test-parent"]')
        self.assertEqual(metric.probeexecutable, '')
        self.assertEqual(metric.config, '')
        self.assertEqual(metric.attribute, '')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["PASSIVE 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(serialized_data['tags'], [])
        self.assertEqual(serialized_data['probekey'], None)
        self.assertEqual(
            serialized_data['description'],
            'Description of passive metric org.apel.APEL-Pub.'
        )
        self.assertEqual(serialized_data['parent'], metric.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metric.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metric.attribute)
        self.assertEqual(serialized_data['dependancy'], metric.dependancy)
        self.assertEqual(serialized_data['flags'], metric.flags)
        self.assertEqual(serialized_data['files'], metric.files)
        self.assertEqual(serialized_data['parameter'], metric.parameter)
        self.assertEqual(serialized_data['fileparameter'], metric.fileparameter)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_passive_metric_regular_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        data = {
            'name': 'org.apel.APEL-Pub',
            'mtype': 'Passive',
            'tags': [],
            'probeversion': '',
            'group': 'ARGO',
            'description': 'Description of passive metric org.apel.APEL-Pub.',
            'parent': 'test-parent',
            'probeexecutable': 'ams-probe',
            'config': '[{"key": "", "value": ""}]',
            'attribute': '[{"key": "", "value": ""}]',
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "PASSIVE", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        metric = poem_models.Metric.objects.get(name='org.apel.APEL-Pub')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        )
        self.assertEqual(versions.count(), 2)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.mtype.name, 'Passive')
        self.assertEqual(len(metric.tags.all()), 0)
        self.assertEqual(metric.probekey, None)
        self.assertEqual(metric.group.name, 'ARGO')
        self.assertEqual(
            metric.description,
            'Description of passive metric org.apel.APEL-Pub.'
        )
        self.assertEqual(metric.parent, '["test-parent"]')
        self.assertEqual(metric.probeexecutable, '')
        self.assertEqual(metric.config, '')
        self.assertEqual(metric.attribute, '')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["PASSIVE 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(serialized_data['tags'], [])
        self.assertEqual(serialized_data['probekey'], None)
        self.assertEqual(
            serialized_data['description'],
            'Description of passive metric org.apel.APEL-Pub.'
        )
        self.assertEqual(serialized_data['parent'], metric.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metric.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metric.attribute)
        self.assertEqual(serialized_data['dependancy'], metric.dependancy)
        self.assertEqual(serialized_data['flags'], metric.flags)
        self.assertEqual(serialized_data['files'], metric.files)
        self.assertEqual(serialized_data['parameter'], metric.parameter)
        self.assertEqual(serialized_data['fileparameter'], metric.fileparameter)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_passive_metric_regular_user_wrong_group(self, func):
        func.side_effect = mocked_inline_metric_for_db
        data = {
            'name': 'org.apel.APEL-Pub',
            'mtype': 'Passive',
            'tags': [],
            'probeversion': '',
            'group': 'EUDAT',
            'description': 'Description of passive metric org.apel.APEL-Pub.',
            'parent': 'test-parent',
            'probeexecutable': 'ams-probe',
            'config': '[{"key": "", "value": ""}]',
            'attribute': '[{"key": "", "value": ""}]',
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "PASSIVE", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign metrics to the given group.'
        )
        metric = poem_models.Metric.objects.get(name='org.apel.APEL-Pub')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        )
        self.assertEqual(versions.count(), 1)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.mtype.name, 'Passive')
        self.assertEqual(len(metric.tags.all()), 0)
        self.assertEqual(metric.probekey, None)
        self.assertEqual(metric.group.name, 'EGI')
        self.assertEqual(metric.description, '')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '')
        self.assertEqual(metric.config, '')
        self.assertEqual(metric.attribute, '')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1", "PASSIVE 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(serialized_data['tags'], [])
        self.assertEqual(serialized_data['probekey'], None)
        self.assertEqual(serialized_data['description'], '')
        self.assertEqual(serialized_data['parent'], metric.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metric.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metric.attribute)
        self.assertEqual(serialized_data['dependancy'], metric.dependancy)
        self.assertEqual(serialized_data['flags'], metric.flags)
        self.assertEqual(serialized_data['files'], metric.files)
        self.assertEqual(serialized_data['parameter'], metric.parameter)
        self.assertEqual(serialized_data['fileparameter'], metric.fileparameter)

    @patch('Poem.api.internal_views.metrics.inline_metric_for_db')
    def test_put_passive_metric_limited_user(self, func):
        func.side_effect = mocked_inline_metric_for_db
        data = {
            'name': 'org.apel.APEL-Pub',
            'mtype': 'Passive',
            'tags': [],
            'probeversion': '',
            'group': 'EUDAT',
            'description': 'Description of passive metric org.apel.APEL-Pub.',
            'parent': 'test-parent',
            'probeexecutable': 'ams-probe',
            'config': '[{"key": "", "value": ""}]',
            'attribute': '[{"key": "", "value": ""}]',
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "PASSIVE", "value": "1"}]',
            'files': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]',
            'fileparameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metrics.'
        )
        metric = poem_models.Metric.objects.get(name='org.apel.APEL-Pub')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        )
        self.assertEqual(versions.count(), 1)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.mtype.name, 'Passive')
        self.assertEqual(len(metric.tags.all()), 0)
        self.assertEqual(metric.probekey, None)
        self.assertEqual(metric.group.name, 'EGI')
        self.assertEqual(metric.description, '')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '')
        self.assertEqual(metric.config, '')
        self.assertEqual(metric.attribute, '')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1", "PASSIVE 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(serialized_data['tags'], [])
        self.assertEqual(serialized_data['probekey'], None)
        self.assertEqual(serialized_data['description'], '')
        self.assertEqual(serialized_data['parent'], metric.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metric.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metric.attribute)
        self.assertEqual(serialized_data['dependancy'], metric.dependancy)
        self.assertEqual(serialized_data['flags'], metric.flags)
        self.assertEqual(serialized_data['files'], metric.files)
        self.assertEqual(serialized_data['parameter'], metric.parameter)
        self.assertEqual(serialized_data['fileparameter'], metric.fileparameter)

    def test_delete_metric_superuser(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'org.apel.APEL-Pub')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'org.apel.APEL-Pub')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.Metric.objects.all().count(), 2)

    def test_delete_metric_regular_user(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'org.apel.APEL-Pub')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'org.apel.APEL-Pub')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.Metric.objects.all().count(), 2)

    def test_delete_metric_regular_user_wrong_group(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'argo.AMSPublisher-Check')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo.AMSPublisher-Check')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metrics in this group.'
        )
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    def test_delete_metric_limited_user(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'argo.AMSPublisher-Check')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request, 'argo.AMSPublisher-Check')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metrics.'
        )
        self.assertEqual(poem_models.Metric.objects.all().count(), 3)

    def test_delete_nonexisting_metric_superuser(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_nonexisting_metric_regular_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_nonexisting_metric_limited_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metrics.'
        )

    def test_delete_metric_without_specifying_name_superuser(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_metric_without_specifying_name_regular_user(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_metric_without_specifying_name_limited_user(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.limited_user)
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


class ImportMetricsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ImportMetrics.as_view()
        self.url = '/api/v2/internal/importmetrics/'
        self.user = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )
        self.regular_user = CustUser.objects.create_user(username='test')

    @patch('Poem.api.internal_views.metrics.import_metrics')
    def test_importing_metrics_when_not_superuser(self, mock_import):
        data = {
            'metrictemplates': ['metric1', 'metric2', 'metric3']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to import metrics.'
        )
        self.assertFalse(mock_import.called)

    @patch('Poem.api.internal_views.metrics.import_metrics')
    def test_import_one_metric_successfully(self, mock_import):
        mock_import.return_value = ['metric1'], [], [], []
        data = {
            'metrictemplates': ['metric1']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_import.assert_called_once()
        mock_import.assert_has_calls([
            call(
                metrictemplates=['metric1'], tenant=self.tenant, user=self.user
            )
        ])
        self.assertEqual(
            response.data,
            {'imported': 'metric1 has been successfully imported.'}
        )

    @patch('Poem.api.internal_views.metrics.import_metrics')
    def test_import_multiple_metrics_successfully(self, mock_import):
        mock_import.return_value = ['metric1', 'metric2', 'metric3'], [], [], []
        data = {
            'metrictemplates': ['metric1', 'metric2', 'metric3']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_import.assert_called_once()
        mock_import.assert_has_calls([
            call(
                metrictemplates=['metric1', 'metric2', 'metric3'],
                tenant=self.tenant, user=self.user
            )
        ])
        self.assertEqual(
            response.data,
            {
                'imported':
                    'metric1, metric2, metric3 have been successfully '
                    'imported.'
            }
        )

    @patch('Poem.api.internal_views.metrics.import_metrics')
    def test_import_one_metric_warning(self, mock_import):
        mock_import.return_value = [], ['metric1'], [], []
        data = {
            'metrictemplates': ['metric1']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_import.assert_called_once()
        mock_import.assert_has_calls([
            call(
                metrictemplates=['metric1'], tenant=self.tenant, user=self.user
            )
        ])
        self.assertEqual(
            response.data,
            {'warn': 'metric1 has been imported with older probe version. '
                     'If you wish to use more recent probe version, you should '
                     'update package version you use.'}
        )

    @patch('Poem.api.internal_views.metrics.import_metrics')
    def test_import_multiple_metrics_warning(self, mock_import):
        mock_import.return_value = [], ['metric1', 'metric2', 'metric3'], [], []
        data = {
            'metrictemplates': ['metric1', 'metric2', 'metric3']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_import.assert_called_once()
        mock_import.assert_has_calls([
            call(
                metrictemplates=['metric1', 'metric2', 'metric3'],
                tenant=self.tenant, user=self.user
            )
        ])
        self.assertEqual(
            response.data,
            {"warn": "metric1, metric2, metric3 have been imported with older "
                     "probes' versions. If you wish to use more recent "
                     "versions of probes, you should update packages' versions "
                     "you use."}
        )

    @patch('Poem.api.internal_views.metrics.import_metrics')
    def test_import_one_metric_error(self, mock_import):
        mock_import.return_value = [], [], ['metric1'], []
        data = {
            'metrictemplates': ['metric1']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_import.assert_called_once()
        mock_import.assert_has_calls([
            call(
                metrictemplates=['metric1'], tenant=self.tenant, user=self.user
            )
        ])
        self.assertEqual(
            response.data,
            {'err': 'metric1 has not been imported since it already exists '
                    'in the database.'}
        )

    @patch('Poem.api.internal_views.metrics.import_metrics')
    def test_import_multiple_metrics_error(self, mock_import):
        mock_import.return_value = [], [], ['metric1', 'metric2', 'metric3'], []
        data = {
            'metrictemplates': ['metric1', 'metric2', 'metric3']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_import.assert_called_once()
        mock_import.assert_has_calls([
            call(
                metrictemplates=['metric1', 'metric2', 'metric3'],
                tenant=self.tenant, user=self.user
            )
        ])
        self.assertEqual(
            response.data,
            {"err": "metric1, metric2, metric3 have not been imported since "
                    "they already exist in the database."}
        )

    @patch('Poem.api.internal_views.metrics.import_metrics')
    def test_import_one_metric_unavailable(self, mock_import):
        mock_import.return_value = [], [], [], ['metric1']
        data = {'metrictemplates': ['metric1']}
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_import.assert_called_once()
        mock_import.assert_has_calls([
            call(metrictemplates=['metric1'],
                 tenant=self.tenant, user=self.user)
        ])
        self.assertEqual(
            response.data,
            {"unavailable": "metric1 has not been imported, since it is not "
                            "available for the package version you use. If you "
                            "wish to use the metric, you should change the "
                            "package version, and try to import again."}
        )

    @patch('Poem.api.internal_views.metrics.import_metrics')
    def test_import_multiple_metrics_unavailable(self, mock_import):
        mock_import.return_value = [], [], [], ['metric1', 'metric2']
        data = {'metrictemplates': ['metric1', 'metric2']}
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_import.assert_called_once()
        mock_import.assert_has_calls([
            call(metrictemplates=['metric1', 'metric2'],
                 tenant=self.tenant, user=self.user)
        ])
        self.assertEqual(
            response.data,
            {"unavailable": "metric1, metric2 have not been imported, since "
                            "they are not available for the packages' versions "
                            "you use. If you wish to use the metrics, you "
                            "should change the packages' versions, and try to "
                            "import again."}
        )

    @patch('Poem.api.internal_views.metrics.import_metrics')
    def test_import_multiple_metrics_mixed(self, mock_import):
        mock_import.return_value = ['metric1', 'metric2'], ['metric3'], \
                                   ['metric4', 'metric5', 'metric6'], \
                                   ['metric7']
        data = {
            'metrictemplates': ['metric1', 'metric2', 'metric3', 'metric4',
                                'metric5', 'metric6', 'metric7']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_import.assert_called_once()
        mock_import.assert_has_calls([
            call(
                metrictemplates=['metric1', 'metric2', 'metric3', 'metric4',
                                 'metric5', 'metric6', 'metric7'],
                tenant=self.tenant, user=self.user
            )
        ])
        self.assertEqual(
            response.data,
            {"imported": "metric1, metric2 have been successfully "
                         "imported.",
             "warn": "metric3 has been imported with older probe version. "
                     "If you wish to use more recent probe version, you should "
                     "update package version you use.",
             "err": "metric4, metric5, metric6 have not been imported since "
                    "they already exist in the database.",
             "unavailable": "metric7 has not been imported, since it is not "
                            "available for the package version you use. If you "
                            "wish to use the metric, you should change the "
                            "package version, and try to import again."}
        )


class UpdateMetricsVersionsTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.UpdateMetricsVersions.as_view()
        self.url = '/api/v2/internal/updatemetricsversions'
        self.user = CustUser.objects.create_user(
            username='testuser', is_superuser=True
        )
        self.regular_user = CustUser.objects.create_user(username='test')

        with schema_context(get_public_schema_name()):
            tenant = Tenant.objects.create(
                name='public', schema_name=get_public_schema_name()
            )
            get_tenant_domain_model().objects.create(
                domain='public', tenant=tenant, is_primary=True
            )


        self.mtype1 = poem_models.MetricType.objects.create(name='Active')
        self.mtype2 = poem_models.MetricType.objects.create(name='Passive')
        self.mttype1 = admin_models.MetricTemplateType.objects.create(
            name='Active'
        )
        self.mttype2 = admin_models.MetricTemplateType.objects.create(
            name='Passive'
        )

        ct = ContentType.objects.get_for_model(poem_models.Metric)

        tag = admin_models.OSTag.objects.create(name='CentOS 6')
        repo = admin_models.YumRepo.objects.create(name='repo-1', tag=tag)

        package1 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.7'
        )
        package1.repos.add(repo)

        self.package2 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.8'
        )
        self.package2.repos.add(repo)

        self.package3 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.9'
        )
        self.package3.repos.add(repo)

        self.package4 = admin_models.Package.objects.create(
            name='unicore-nagios-plugins',
            version='2.5.0'
        )
        self.package4.repos.add(repo)

        self.probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            package=self.package2,
            description='Probe is inspecting AMS service.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probe2 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            package=self.package2,
            description='Probe is inspecting AMS publisher running on Nagios '
                        'monitoring instances.',
            comment='New version',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probe3 = admin_models.Probe.objects.create(
            name='check_gateway',
            package=self.package4,
            description='Plugin checks UNICORE Gateway functionality.',
            comment='Initial version.',
            repository='https://sourceforge.net/p/unicore-life/code/HEAD/tree/'
                       'monitoring/UMI-Probes/trunk/umi2/check_gateway',
            docurl='https://sourceforge.net/p/unicore-life/code/HEAD/tree/'
                   'monitoring/UMI-Probes/trunk/umi2/check_gateway/'
                   'check_gateway.README'
        )

        self.probehistory1 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=package1,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        self.probehistory2 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.package2,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newer version.',
            version_user=self.user.username
        )

        self.probehistory3 = admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=package1,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            date_created=datetime.datetime.now(),
            version_comment='New version.',
            version_user=self.user.username
        )

        self.probehistory4 = admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=self.package2,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            date_created=datetime.datetime.now(),
            version_comment='New version.',
            version_user=self.user.username
        )

        self.probehistory5 = admin_models.ProbeHistory.objects.create(
            object_id=probe3,
            name=probe3.name,
            package=probe3.package,
            description=probe3.description,
            comment=probe3.comment,
            repository=probe3.repository,
            docurl=probe3.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        self.group = poem_models.GroupOfMetrics.objects.create(
            name='TEST'
        )

        self.mtag1 = admin_models.MetricTags.objects.create(name='test_tag1')
        self.mtag2 = admin_models.MetricTags.objects.create(name='test_tag2')
        self.mtag3 = admin_models.MetricTags.objects.create(name='test_tag3')

        self.mt1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            description='Description of argo.AMS-Check.',
            probeexecutable='["ams-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            attribute='["argo.ams_TOKEN --token"]',
            parameter='["--project EGI"]',
            flags='["OBSESS 1"]',
            mtype=self.mttype1,
            probekey=self.probehistory1
        )
        self.mt1.tags.add(self.mtag1, self.mtag2)

        mt1_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )
        mt1_history1.tags.add(self.mtag1, self.mtag2)

        self.mt1.probekey = self.probehistory2
        self.mt1.save()
        self.mt1.tags.add(self.mtag3)

        self.mt1_history2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newer version.'
        )
        self.mt1_history2.tags.add(self.mtag1, self.mtag2, self.mtag3)

        mt2 = admin_models.MetricTemplate.objects.create(
            name='argo.AMSPublisher-Check',
            description='Description of argo.AMSPublisher-Check.',
            probeexecutable='["ams-publisher-probe"]',
            config='["interval 180", "maxCheckAttempts 3", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 130"]',
            flags='["NOHOSTNAME 1"]',
            mtype=self.mttype1,
            probekey=self.probehistory3
        )
        mt2.tags.add(self.mtag2)

        mt2_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=mt2,
            name=mt2.name,
            mtype=mt2.mtype,
            probekey=mt2.probekey,
            description=mt2.description,
            probeexecutable=mt2.probeexecutable,
            config=mt2.config,
            attribute=mt2.attribute,
            dependency=mt2.dependency,
            flags=mt2.flags,
            files=mt2.files,
            parameter=mt2.parameter,
            fileparameter=mt2.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )
        mt2_history1.tags.add(self.mtag2)

        mt2.probekey = self.probehistory4
        mt2.save()
        mt2.tags.remove(self.mtag2)

        self.mt2_history2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=mt2,
            name=mt2.name,
            mtype=mt2.mtype,
            probekey=mt2.probekey,
            description=mt2.description,
            probeexecutable=mt2.probeexecutable,
            config=mt2.config,
            attribute=mt2.attribute,
            dependency=mt2.dependency,
            flags=mt2.flags,
            files=mt2.files,
            parameter=mt2.parameter,
            fileparameter=mt2.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newer version.'
        )

        mt3 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=self.mttype2
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=mt3,
            name=mt3.name,
            mtype=mt3.mtype,
            probekey=mt3.probekey,
            description=mt3.description,
            probeexecutable=mt3.probeexecutable,
            config=mt3.config,
            attribute=mt3.attribute,
            dependency=mt3.dependency,
            flags=mt3.flags,
            files=mt3.files,
            parameter=mt3.parameter,
            fileparameter=mt3.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )

        metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            description='Description of argo.AMS-Check.',
            probeexecutable='["ams-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            attribute='["argo.ams_TOKEN --token"]',
            parameter='["--project EGI"]',
            flags='["OBSESS 1"]',
            mtype=self.mtype1,
            probekey=self.probehistory1,
            group=self.group
        )
        metric1.tags.add(self.mtag1, self.mtag2)

        metric2 = poem_models.Metric.objects.create(
            name='argo.AMSPublisher-Check',
            description='Description of argo.AMSPublisher-Check.',
            probeexecutable='["ams-publisher-probe"]',
            config='["interval 180", "maxCheckAttempts 3", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 130"]',
            flags='["NOHOSTNAME 1"]',
            mtype=self.mtype1,
            probekey=self.probehistory3,
            group=self.group
        )
        metric2.tags.add(self.mtag2)

        metric3 = poem_models.Metric.objects.create(
            name='emi.unicore.Gateway',
            description='',
            probeexecutable='["pl.plgrid/UNICORE/umi2/check_gateway/'
                            'check_gateway.pl"]',
            config='["interval 20", "maxCheckAttempts 2", '
                   '"path /usr/libexec/grid-monitoring/probes", '
                   '"retryInterval 5", "timeout 60"]',
            attribute='["METRIC_CONFIG_FILE -f"]',
            flags='["OBSESS 1", "NOHOSTNAME 1", "NOLBNODE 1"]',
            mtype=self.mtype1,
            probekey=self.probehistory5,
            group=self.group
        )
        metric3.tags.add(self.mtag1)

        metric4 = poem_models.Metric.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=self.mtype2,
            group=self.group
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric1.id,
            serialized_data=serializers.serialize(
                'json', [metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=metric1.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric1.id,
            serialized_data=serializers.serialize(
                'json', [metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=metric1.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric2.id,
            serialized_data=serializers.serialize(
                'json', [metric2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=metric2.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric3.id,
            serialized_data=serializers.serialize(
                'json', [metric3],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=metric3.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric4.id,
            serialized_data=serializers.serialize(
                'json', [metric4],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=metric4.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

    def test_permission_denied_if_not_authenticated(self):
        data = {
            'name': self.package2.name,
            'version': self.package2.version
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('Poem.api.internal_views.metrics.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_update_metrics_versions_when_not_superuser(
            self, mock_update, mock_delete
    ):
        data = {
            'name': self.package2.name,
            'version': self.package2.version
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to update metrics' versions."
        )
        self.assertFalse(mock_update.called)
        self.assertFalse(mock_delete.called)

    @patch('Poem.api.internal_views.metrics.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_update_metrics_versions(self, mock_update, mock_delete):
        mock_update.side_effect = mocked_func
        mock_delete.side_effect = mocked_func
        data = {
            'name': self.package2.name,
            'version': self.package2.version
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(mock_delete.called)
        self.assertEqual(mock_update.call_count, 2)
        mock_update.assert_has_calls([
            call(
                mt_id=self.mt1_history2.id, name='argo.AMS-Check',
                pk_id=self.probehistory1.id, schema='test',
                update_from_history=True, user='testuser'
            ),
            call(
                mt_id=self.mt2_history2.id, name='argo.AMSPublisher-Check',
                pk_id=self.probehistory3.id, schema='test',
                update_from_history=True, user='testuser'
            )
        ], any_order=True)
        self.assertEqual(
            response.data,
            {
                'updated': 'Metrics argo.AMS-Check, argo.AMSPublisher-Check '
                           'have been successfully updated.'
            }
        )

    @patch('Poem.api.internal_views.metrics.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_update_metrics_version_if_metric_template_was_renamed(
            self, mock_update, mock_get, mock_delete
    ):
        mock_update.side_effect = mocked_func
        mock_get.return_value = {'argo.AMS-Check ': ['PROFILE1']}
        mock_delete.side_effect = mocked_func
        probe1 = admin_models.Probe.objects.create(
            name='ams-probe-new',
            package=self.package3,
            description='Probe is inspecting AMS service in a newer way.',
            comment='Not initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )
        probehistory1 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newest version.',
            version_user=self.user.username
        )
        self.mt1.name = 'argo.AMS-Check-new'
        self.mt1.description = 'Description of argo.AMS-Check-new.'
        self.mt1.probekey = probehistory1
        self.mt1.save()
        mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        data = {
            'name': self.package3.name,
            'version': self.package3.version
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(mock_delete.called)
        self.assertEqual(mock_update.call_count, 1)
        mock_update.assert_has_calls([
            call(
                mt_id=mt1_history3.id, name='argo.AMS-Check',
                pk_id=self.probehistory1.id, schema='test',
                update_from_history=True, user='testuser'
            )
        ])
        self.assertEqual(
            response.data,
            {
                'deleted': 'Metric argo.AMSPublisher-Check has been deleted, '
                           'since its probe is not part of the chosen package.',
                'updated': 'Metric argo.AMS-Check has been successfully '
                           'updated.'
            }
        )

    @patch('Poem.api.internal_views.metrics.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_metrics_deleted_if_their_probes_do_not_exist_in_new_package(
            self, mock_update, mock_get, mock_delete
    ):
        mock_update.side_effect = mocked_func
        mock_get.return_value = {
            'argo.AMSPublisher-Check': ['PROFILE1'],
            'argo.AMS-Check': ['PROFILE1', 'PROFILE2']
        }
        mock_delete.side_effect = mocked_func
        self.probe1.package = self.package3
        self.probe1.save()
        probehistory1 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newest version.',
            version_user=self.user.username
        )
        self.mt1.probekey = probehistory1
        self.mt1.save()
        mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        data = {
            'name': self.package3.name,
            'version': self.package3.version
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data,
            {
                'deleted': 'Metric argo.AMSPublisher-Check has been deleted, '
                           'since its probe is not part of the chosen package.',
                'updated': 'Metric argo.AMS-Check has been successfully '
                           'updated.'
            }
        )
        mock_delete.assert_called_once_with(
            'PROFILE1', ['argo.AMSPublisher-Check']
        )
        self.assertEqual(mock_update.call_count, 1)
        mock_update.assert_has_calls([
            call(
                mt_id=mt1_history3.id, name='argo.AMS-Check',
                pk_id=self.probehistory1.id, schema='test',
                update_from_history=True, user='testuser'
            )
        ])

    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_metrics_warning_if_metric_template_history_do_not_exist(
            self, mock_update
    ):
        mock_update.side_effect = mocked_func
        data = {
            'name': self.package4.name,
            'version': self.package4.version
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(mock_update.called)
        self.assertEqual(
            response.data,
            {
                'warning': 'Metric template history instance of '
                           'emi.unicore.Gateway has not been found. '
                           'Please contact Administrator.'
            }
        )

    @patch('Poem.api.internal_views.metrics.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_metrics_with_update_warning_and_deletion(
            self,  mock_update, mock_get, mock_delete
    ):
        mock_update.side_effect = mocked_func
        mock_get.return_value = {
            'argo.AMSPublisher-Check': ['PROFILE1', 'PROFILE2'],
            'argo.AMS-Check': ['PROFILE1']
        }
        mock_delete.side_effect = mocked_func
        self.probe1.package = self.package3
        self.probe1.save()
        probehistory1 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newest version.',
            version_user=self.user.username
        )
        self.mt1.probekey = probehistory1
        self.mt1.save()
        mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        metric = poem_models.Metric.objects.create(
            name='test.AMS-Check',
            description='Description of test.AMS-Check.',
            probeexecutable='["ams-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            attribute='["argo.ams_TOKEN --token"]',
            parameter='["--project EGI"]',
            flags='["OBSESS 1"]',
            mtype=self.mtype1,
            probekey=self.probehistory1,
            group=self.group
        )
        metric.tags.add(self.mtag1)
        data = {
            'name': self.package3.name,
            'version': self.package3.version
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='argo.AMSPublisher-Check'
        )
        self.assertEqual(
            response.data,
            {
                'updated': 'Metric argo.AMS-Check has been successfully '
                           'updated.',
                'deleted': 'Metric argo.AMSPublisher-Check has been deleted, '
                           'since its probe is not part of the chosen package.',
                'warning': 'Metric template history instance of '
                           'test.AMS-Check has not been found. '
                           'Please contact Administrator.'
            }
        )
        self.assertEqual(mock_update.call_count, 1)
        mock_update.assert_has_calls([
            call(
                mt_id=mt1_history3.id, name='argo.AMS-Check',
                pk_id=self.probehistory1.id, schema='test',
                update_from_history=True, user='testuser'
            )
        ])
        self.assertEqual(mock_delete.call_count, 2)
        mock_delete.assert_has_calls([
            call('PROFILE1', ['argo.AMSPublisher-Check']),
            call('PROFILE2', ['argo.AMSPublisher-Check'])
        ])

    @patch('Poem.api.internal_views.metrics.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_metrics_with_update_warning_and_deletion_if_api_get_exception(
            self,  mock_update, mock_get, mock_delete
    ):
        mock_update.side_effect = mocked_func
        mock_get.side_effect = Exception('Exception')
        mock_delete.side_effect = mocked_func
        self.probe1.package = self.package3
        self.probe1.save()
        probehistory1 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newest version.',
            version_user=self.user.username
        )
        self.mt1.probekey = probehistory1
        self.mt1.save()
        mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        metric = poem_models.Metric.objects.create(
            name='test.AMS-Check',
            description='Description of test.AMS-Check.',
            probeexecutable='["ams-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            attribute='["argo.ams_TOKEN --token"]',
            parameter='["--project EGI"]',
            flags='["OBSESS 1"]',
            mtype=self.mtype1,
            probekey=self.probehistory1,
            group=self.group
        )
        metric.tags.add(self.mtag1)
        data = {
            'name': self.package3.name,
            'version': self.package3.version
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='argo.AMSPublisher-Check'
        )
        self.assertEqual(
            response.data,
            {
                'updated': 'Metric argo.AMS-Check has been successfully '
                           'updated.',
                'deleted': 'Metric argo.AMSPublisher-Check has been deleted, '
                           'since its probe is not part of the chosen package. '
                           'WARNING: Unable to get data on metrics and metric '
                           'profiles. Please remove deleted metrics from '
                           'metric profiles manually.',
                'warning': 'Metric template history instance of '
                           'test.AMS-Check has not been found. '
                           'Please contact Administrator.'
            }
        )
        self.assertEqual(mock_update.call_count, 1)
        mock_update.assert_has_calls([
            call(
                mt_id=mt1_history3.id, name='argo.AMS-Check',
                pk_id=self.probehistory1.id, schema='test',
                update_from_history=True, user='testuser'
            )
        ])
        mock_get.assert_called_once_with(self.tenant.schema_name)
        self.assertFalse(mock_delete.called)

    @patch('Poem.api.internal_views.metrics.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_metrics_with_update_warning_and_deletion_if_api_put_exception(
            self,  mock_update, mock_get, mock_delete
    ):
        mock_update.side_effect = mocked_func
        mock_get.return_value = {
            'argo.AMSPublisher-Check': ['PROFILE1'],
            'argo.AMS-Check': ['PROFILE1']
        }
        mock_delete.side_effect = Exception('Exception')
        self.probe1.package = self.package3
        self.probe1.save()
        probehistory1 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newest version.',
            version_user=self.user.username
        )
        self.mt1.probekey = probehistory1
        self.mt1.save()
        mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        metric = poem_models.Metric.objects.create(
            name='test.AMS-Check',
            description='Description of test.AMS-Check.',
            probeexecutable='["ams-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            attribute='["argo.ams_TOKEN --token"]',
            parameter='["--project EGI"]',
            flags='["OBSESS 1"]',
            mtype=self.mtype1,
            probekey=self.probehistory1,
            group=self.group
        )
        metric.tags.add(self.mtag1)
        data = {
            'name': self.package3.name,
            'version': self.package3.version
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='argo.AMSPublisher-Check'
        )
        self.assertEqual(
            response.data,
            {
                'updated': 'Metric argo.AMS-Check has been successfully '
                           'updated.',
                'deleted': 'Metric argo.AMSPublisher-Check has been deleted, '
                           'since its probe is not part of the chosen package. '
                           'WARNING: Error trying to remove metric '
                           'argo.AMSPublisher-Check from profile PROFILE1. '
                           'Please remove it manually.',
                'warning': 'Metric template history instance of '
                           'test.AMS-Check has not been found. '
                           'Please contact Administrator.'
            }
        )
        self.assertEqual(mock_update.call_count, 1)
        mock_update.assert_has_calls([
            call(
                mt_id=mt1_history3.id, name='argo.AMS-Check',
                pk_id=self.probehistory1.id, schema='test',
                update_from_history=True, user='testuser'
            )
        ])
        mock_get.assert_called_once_with(self.tenant.schema_name)
        mock_delete.assert_called_once_with(
            'PROFILE1', ['argo.AMSPublisher-Check']
        )

    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_update_metrics_if_package_not_found(self, mock_update):
        mock_update.side_effect = mocked_func
        data = {
            'name': 'nonexisting-package',
            'version': '1.0.0'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Package not found.')
        self.assertFalse(mock_update.called)

    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_update_metrics_versions_dry_run(self, mock_update, mock_get):
        mock_update.side_effect = mocked_func
        mock_get.return_value = {
            'argo.AMS-Check': ['PROFILE1', 'PROFILE2'],
            'argo.AMSPublisher-Check': ['PROFILE3']
        }
        request = self.factory.get(self.url + 'nagios-plugins-argo-0.1.8')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-argo-0.1.8')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(mock_update.called)
        mock_get.assert_called_once()
        self.assertEqual(
            response.data,
            {
                'updated': 'Metrics argo.AMS-Check, argo.AMSPublisher-Check '
                           'will be updated.'
            }
        )

    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_update_metrics_version_if_metric_template_was_renamed_dry_run(
            self, mock_update, mock_get
    ):
        mock_update.side_effect = mocked_func
        mock_get.return_value = {
            'argo.AMS-Check': ['PROFILE1', 'PROFILE2'],
            'argo.AMSPublisher-Check': ['PROFILE1']
        }
        probe1 = admin_models.Probe.objects.create(
            name='ams-probe-new',
            package=self.package3,
            description='Probe is inspecting AMS service in a newer way.',
            comment='Not initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )
        probehistory1 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newest version.',
            version_user=self.user.username
        )
        self.mt1.name = 'argo.AMS-Check-new'
        self.mt1.description = 'Description of argo.AMS-Check-new.'
        self.mt1.probekey = probehistory1
        self.mt1.save()
        mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        request = self.factory.get(self.url + 'nagios-plugins-argo-0.1.9')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-argo-0.1.9')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        metric = poem_models.Metric.objects.get(name='argo.AMSPublisher-Check')
        assert metric
        self.assertFalse(mock_update.called)
        mock_get.assert_called_once()
        self.assertEqual(
            response.data,
            {
                'deleted': 'Metric argo.AMSPublisher-Check will be deleted, '
                           'since its probe is not part of the chosen package. '
                           'WARNING: Metric argo.AMSPublisher-Check is part of '
                           'PROFILE1 metric profile. ARE YOU SURE YOU WANT TO '
                           'DELETE IT?',
                'updated': 'Metric argo.AMS-Check will be updated.'
            }
        )

    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_metrics_deleted_if_their_probes_do_not_exist_in_new_package_dry(
            self, mock_update, mock_get
    ):
        mock_update.side_effect = mocked_func
        mock_get.return_value = {
            'argo.AMS-Check': ['PROFILE1', 'PROFILE2']
        }
        self.probe1.package = self.package3
        self.probe1.save()
        probehistory1 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newest version.',
            version_user=self.user.username
        )
        self.mt1.probekey = probehistory1
        self.mt1.save()
        mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        request = self.factory.get(self.url + 'nagios-plugins-argo-0.1.9')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-argo-0.1.9')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        metric = poem_models.Metric.objects.get(name='argo.AMSPublisher-Check')
        assert metric
        self.assertEqual(
            response.data,
            {
                'deleted': 'Metric argo.AMSPublisher-Check will be deleted, '
                           'since its probe is not part of the chosen package.',
                'updated': 'Metric argo.AMS-Check will be updated.'
            }
        )
        self.assertFalse(mock_update.called)
        mock_get.assert_called_once()

    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_metrics_warning_if_metric_template_history_do_not_exist_dry_run(
            self, mock_update, mock_get
    ):
        mock_update.side_effect = mocked_func
        mock_get.return_value = {
            'argo.AMS-Check': ['PROFILE1', 'PROFILE2'],
            'argo.AMSProfile-Check': ['PROFILE3']
        }
        request = self.factory.get(self.url + 'unicore-nagios-plugins-2.5.0')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'unicore-nagios-plugins-2.5.0')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(mock_update.called)
        mock_get.assert_called_once()
        self.assertEqual(
            response.data,
            {
                'warning': 'Metric template history instance of '
                           'emi.unicore.Gateway has not been found. '
                           'Please contact Administrator.'
            }
        )

    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_metrics_with_update_warning_and_deletion_dry(
            self,  mock_update, mock_get
    ):
        mock_update.side_effect = mocked_func
        mock_get.return_value = {
            'argo.AMS-Check': ['PROFILE1', 'PROFILE2'],
            'argo.AMSPublisher-Check': ['PROFILE3', 'PROFILE4']
        }
        self.probe1.package = self.package3
        self.probe1.save()
        probehistory1 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newest version.',
            version_user=self.user.username
        )
        self.mt1.probekey = probehistory1
        self.mt1.save()
        mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        metric1 = poem_models.Metric.objects.create(
            name='test.AMS-Check',
            description='Description of test.AMS-Check.',
            probeexecutable='["ams-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            attribute='["argo.ams_TOKEN --token"]',
            parameter='["--project EGI"]',
            flags='["OBSESS 1"]',
            mtype=self.mtype1,
            probekey=self.probehistory1,
            group=self.group
        )
        metric1.tags.add(self.mtag1)
        request = self.factory.get(self.url + 'nagios-plugins-argo-0.1.9')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-argo-0.1.9')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        metric2 = poem_models.Metric.objects.get(name='argo.AMSPublisher-Check')
        assert metric2
        self.assertEqual(
            response.data,
            {
                'updated': 'Metric argo.AMS-Check will be updated.',
                'deleted': 'Metric argo.AMSPublisher-Check will be deleted, '
                           'since its probe is not part of the chosen package. '
                           'WARNING: Metric argo.AMSPublisher-Check is part of '
                           'PROFILE3, PROFILE4 metric profiles. ARE YOU SURE '
                           'YOU WANT TO DELETE IT?',
                'warning': 'Metric template history instance of '
                           'test.AMS-Check has not been found. '
                           'Please contact Administrator.'
            }
        )
        self.assertFalse(mock_update.called)
        mock_get.assert_called_once()

    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_update_metrics_if_metrics_in_profiles_wrong_token_dry_run(
            self, mock_update, mock_get
    ):
        exception = requests.exceptions.HTTPError(
            response=MockResponse(
                {
                    "status": {
                        "message": "Unauthorized",
                        "code": "401",
                        "details": "You need to provide a correct "
                                   "authentication token "
                                   "using the header 'x-api-key'"
                    }
                }, 401
            )
        )
        mock_update.side_effect = mocked_func
        mock_get.side_effect = exception
        request = self.factory.get(self.url + 'nagios-plugins-argo-0.1.8')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-argo-0.1.8')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            "Error fetching WEB API data: 401 Unauthorized: You need to provide"
            " a correct authentication token using the header 'x-api-key'"
        )
        mock_get.assert_called_once()
        self.assertFalse(mock_update.called)

    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_update_metrics_if_metrics_in_profiles_page_not_found_dry_run(
            self, mock_update, mock_get
    ):
        exception = requests.exceptions.HTTPError(
            response=MockResponse('404 page not found', 404)
        )
        mock_update.side_effect = mocked_func
        mock_get.side_effect = exception
        request = self.factory.get(self.url + 'nagios-plugins-argo-0.1.8')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-argo-0.1.8')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'],
            'Error fetching WEB API data: 404 Not Found'
        )
        mock_get.assert_called_once()
        self.assertFalse(mock_update.called)

    @patch('Poem.api.internal_views.metrics.get_metrics_in_profiles')
    @patch('Poem.api.internal_views.metrics.update_metric_in_schema')
    def test_update_metrics_if_metrics_in_profiles_api_key_not_found_dry_run(
            self, mock_update, mock_get
    ):
        mock_update.side_effect = mocked_func
        mock_get.side_effect = Exception(
            'Error fetching WEB API data: API key not found.'
        )
        request = self.factory.get(self.url + 'nagios-plugins-argo-0.1.8')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-argo-0.1.8')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'],
            'Error fetching WEB API data: API key not found.'
        )
        mock_get.assert_called_once()
        self.assertFalse(mock_update.called)
