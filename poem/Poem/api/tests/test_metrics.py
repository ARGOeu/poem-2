import datetime
import json
from unittest.mock import patch, call

import factory
import requests
from Poem.api import views_internal as views
from Poem.api.internal_views.utils import inline_metric_for_db
from Poem.helpers.history_helpers import serialize_metric
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django.db.models.signals import pre_save
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from django_tenants.utils import get_public_schema_name, schema_context, \
    get_tenant_domain_model
from rest_framework import status
from rest_framework.test import force_authenticate

from .utils_test import mocked_func, encode_data, mocked_inline_metric_for_db, \
    MockResponse


@factory.django.mute_signals(pre_save)
def mock_db():
    superuser = CustUser.objects.create_user(
        username='poem', is_superuser=True
    )
    user = CustUser.objects.create_user(username='testuser')
    limited_user = CustUser.objects.create_user(username='limited')

    mttype1 = admin_models.MetricTemplateType.objects.create(name="Active")
    mttype2 = admin_models.MetricTemplateType.objects.create(name="Passive")

    mtag1 = admin_models.MetricTags.objects.create(name='test_tag1')
    mtag2 = admin_models.MetricTags.objects.create(name='test_tag2')

    group1 = poem_models.GroupOfMetrics.objects.create(name='EGI')
    group2 = poem_models.GroupOfMetrics.objects.create(name='ARGO')
    group3 = poem_models.GroupOfMetrics.objects.create(name='EUDAT')

    userprofile = poem_models.UserProfile.objects.create(user=user)
    userprofile.groupsofmetrics.add(group1)
    userprofile.groupsofmetrics.add(group2)

    poem_models.UserProfile.objects.create(user=superuser)
    poem_models.UserProfile.objects.create(user=limited_user)

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

    probe1_version1 = admin_models.ProbeHistory.objects.create(
        object_id=probe1,
        name=probe1.name,
        package=probe1.package,
        description=probe1.description,
        comment=probe1.comment,
        repository=probe1.repository,
        docurl=probe1.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user=user.username
    )

    probe1.package = package2
    probe1.comment = 'Updated version.'
    probe1.save()

    probe1_version2 = admin_models.ProbeHistory.objects.create(
        object_id=probe1,
        name=probe1.name,
        package=probe1.package,
        description=probe1.description,
        comment=probe1.comment,
        repository=probe1.repository,
        docurl=probe1.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Updated version.',
        version_user=user.username
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

    probeversion3 = admin_models.ProbeHistory.objects.create(
        object_id=probe2,
        name=probe2.name,
        package=probe2.package,
        description=probe2.description,
        comment=probe2.comment,
        repository=probe2.repository,
        docurl=probe2.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user=user.username
    )

    probe2.package = package2
    probe2.comment = 'Updated version.'
    probe2.save()

    admin_models.ProbeHistory.objects.create(
        object_id=probe2,
        name=probe2.name,
        package=probe2.package,
        description=probe2.description,
        comment=probe2.comment,
        repository=probe2.repository,
        docurl=probe2.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Updated version.',
        version_user=user.username
    )

    mt1 = admin_models.MetricTemplate.objects.create(
        name='argo.AMS-Check',
        mtype=mttype1,
        probekey=probe1_version1,
        description='Description of argo.AMS-Check',
        probeexecutable='["ams-probe"]',
        config='["maxCheckAttempts 3", "timeout 60",'
               ' "path /usr/libexec/argo-monitoring/probes/argo",'
               ' "interval 5", "retryInterval 3"]',
        attribute='["argo.ams_TOKEN --token"]',
        flags='["OBSESS 1"]',
        parameter='["--project EGI"]'
    )
    mt1.tags.add(mtag1, mtag2)

    mt1_version1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=mt1,
        name=mt1.name,
        mtype=mt1.mtype,
        probekey=mt1.probekey,
        description=mt1.description,
        probeexecutable=mt1.probeexecutable,
        config=mt1.config,
        attribute=mt1.attribute,
        dependency=mt1.dependency,
        flags=mt1.flags,
        parameter=mt1.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.'
    )
    mt1_version1.tags.add(mtag1, mtag2)

    mt1.probekey = probe1_version2
    mt1.save()

    mt1_version2 = admin_models.MetricTemplateHistory.objects.create(
        object_id=mt1,
        name=mt1.name,
        mtype=mt1.mtype,
        probekey=mt1.probekey,
        description=mt1.description,
        probeexecutable=mt1.probeexecutable,
        config=mt1.config,
        attribute=mt1.attribute,
        dependency=mt1.dependency,
        flags=mt1.flags,
        parameter=mt1.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Updated version.'
    )
    mt1_version2.tags.add(mtag1, mtag2)

    mt2 = admin_models.MetricTemplate.objects.create(
        name='org.apel.APEL-Pub',
        flags='["OBSESS 1", "PASSIVE 1"]',
        mtype=mttype2
    )

    admin_models.MetricTemplateHistory.objects.create(
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
        parameter=mt2.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.'
    )

    mt3 = admin_models.MetricTemplate.objects.create(
        name='argo.AMSPublisher-Check',
        mtype=mttype1,
        probekey=probeversion3,
        description='',
        probeexecutable='["ams-publisher-probe"]',
        config='["interval 180", "maxCheckAttempts 1", '
               '"path /usr/libexec/argo-monitoring/probes/argo", '
               '"retryInterval 1", "timeout 120"]',
        parameter='["-s /var/run/argo-nagios-ams-publisher/sock"]',
        flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
    )
    mt3.tags.add(mtag1)

    mt3_version1 = admin_models.MetricTemplateHistory.objects.create(
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
        parameter=mt3.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.'
    )
    mt3_version1.tags.add(mtag1)

    metric1 = poem_models.Metric.objects.create(
        name=mt1_version1.name,
        probeversion=mt1_version1.probekey.__str__(),
        group=group1,
        config=mt1_version1.config
    )

    ct = ContentType.objects.get_for_model(poem_models.Metric)

    poem_models.TenantHistory.objects.create(
        object_id=metric1.id,
        object_repr=metric1.__str__(),
        serialized_data=serialize_metric(metric1, tags=[mtag1, mtag2]),
        date_created=datetime.datetime.now(),
        user=user.username,
        comment='Initial version.',
        content_type=ct
    )

    metric2 = poem_models.Metric.objects.create(
        name=mt2.name,
        group=group1
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric2.id,
        object_repr=metric2.__str__(),
        serialized_data=serialize_metric(metric2),
        date_created=datetime.datetime.now(),
        user=user.username,
        comment='Initial version.',
        content_type=ct
    )

    metric3 = poem_models.Metric.objects.create(
        name=mt3.name,
        probeversion=mt3.probekey.__str__(),
        group=group3,
        config=mt3.config
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric3.id,
        object_repr=metric3.__str__(),
        serialized_data=serialize_metric(metric3, tags=[mtag1]),
        date_created=datetime.datetime.now(),
        user=user.username,
        comment='Initial version.',
        content_type=ct
    )


profiles4metrics = {
    "argo.AMS-Check": ["ARGO_MON", "ARGO_MON_CRITICAL"],
    "argo.AMSPublisher-Check": ["ARGO_MON_INTERNAL"]
}


class ListAllMetricsAPIViewTests(TenantTestCase):
    @factory.django.mute_signals(pre_save)
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAllMetrics.as_view()
        self.url = '/api/v2/internal/metricsall/'
        self.user = CustUser.objects.create_user(username='testuser')

        group = poem_models.GroupOfMetrics.objects.create(name='EGI')
        poem_models.GroupOfMetrics.objects.create(name='delete')

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
            probeversion=probeversion1.__str__(),
            group=group
        )

        poem_models.Metric.objects.create(
            name='org.apel.APEL-Pub',
            group=group
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

        mock_db()

        self.user = CustUser.objects.get(username="testuser")
        self.superuser = CustUser.objects.get(username="poem")
        self.limited_user = CustUser.objects.get(username="limited")

        self.ct = ContentType.objects.get_for_model(poem_models.Metric)

        self.metric1 = poem_models.Metric.objects.get(name="argo.AMS-Check")
        self.metric2 = poem_models.Metric.objects.get(name="org.apel.APEL-Pub")
        self.metric3 = poem_models.Metric.objects.get(
            name="argo.AMSPublisher-Check"
        )

        self.probeversion1 = admin_models.ProbeHistory.objects.get(
            name="ams-probe", comment="Initial version."
        )
        self.probeversion2 = admin_models.ProbeHistory.objects.get(
            name="ams-probe", comment="Updated version."
        )
        self.probeversion3 = admin_models.ProbeHistory.objects.get(
            name="ams-publisher-probe", comment="Initial version."
        )

        self.mt1_version1 = admin_models.MetricTemplateHistory.objects.get(
            name="argo.AMS-Check", version_comment="Initial version."
        )
        self.mt1_version2 = admin_models.MetricTemplateHistory.objects.get(
            name="argo.AMS-Check", version_comment="Updated version."
        )
        self.mt2_version1 = admin_models.MetricTemplateHistory.objects.get(
            name="argo.AMSPublisher-Check", version_comment="Initial version."
        )
        self.mt3 = admin_models.MetricTemplateHistory.objects.get(
            name="org.apel.APEL-Pub"
        )

    @patch("Poem.api.internal_views.metrics.get_metrics_in_profiles")
    def test_get_metric_list(self, mock_profiles4metrics):
        mock_profiles4metrics.return_value = profiles4metrics
        request = self.factory.get(self.url)
        request.tenant = self.tenant
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
                    "profiles": ["ARGO_MON", "ARGO_MON_CRITICAL"],
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
                    'parameter': [
                        {
                            'key': '--project',
                            'value': 'EGI'
                        }
                    ]
                },
                {
                    'id': self.metric3.id,
                    'name': 'argo.AMSPublisher-Check',
                    'mtype': 'Active',
                    'tags': ['test_tag1'],
                    "profiles": ["ARGO_MON_INTERNAL"],
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
                    'parameter': [
                        {
                            'key': '-s',
                            'value': '/var/run/argo-nagios-ams-publisher/sock'
                        }
                    ]
                },
                {
                    'id': self.metric2.id,
                    'name': 'org.apel.APEL-Pub',
                    'mtype': 'Passive',
                    'tags': [],
                    "profiles": [],
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
                    'parameter': []
                }
            ]
        )

    @patch("Poem.api.internal_views.metrics.get_metrics_in_profiles")
    def test_get_metric_by_name(self, mock_profiles4metrics):
        mock_profiles4metrics.return_value = profiles4metrics
        request = self.factory.get(self.url + 'argo.AMS-Check')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(
            response.data,
            {
                'id': self.metric1.id,
                'name': 'argo.AMS-Check',
                'mtype': 'Active',
                'tags': ['test_tag1', 'test_tag2'],
                "profiles": ["ARGO_MON", "ARGO_MON_CRITICAL"],
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
                'parameter': [
                    {
                        'key': '--project',
                        'value': 'EGI'
                    }
                ]
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
            'parameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by("-date_created")
        self.assertEqual(versions.count(), 2)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.probeversion, self.probeversion2.__str__())
        self.assertEqual(metric.group.name, 'EUDAT')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(
            serialized_data['mtype'], [self.mt1_version2.mtype.name]
        )
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(
            serialized_data['description'], self.mt1_version2.description
        )
        self.assertEqual(
            serialized_data['probekey'],
            [
                self.mt1_version2.probekey.name,
                self.mt1_version2.probekey.package.version
            ]
        )
        self.assertEqual(serialized_data['parent'], self.mt1_version2.parent)
        self.assertEqual(
            serialized_data['probeexecutable'],
            self.mt1_version2.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], self.mt1_version2.attribute
        )
        self.assertEqual(
            serialized_data['dependancy'],
            self.mt1_version2.dependency
        )
        self.assertEqual(serialized_data['flags'], self.mt1_version2.flags)
        self.assertEqual(
            serialized_data['parameter'], self.mt1_version2.parameter
        )

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
            'parameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by("-date_created")
        self.assertEqual(versions.count(), 2)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.probeversion, self.probeversion2.__str__())
        self.assertEqual(metric.group.name, 'ARGO')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(
            serialized_data['mtype'], [self.mt1_version2.mtype.name]
        )
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(
            serialized_data['description'], self.mt1_version2.description
        )
        self.assertEqual(
            serialized_data['probekey'],
            [
                self.mt1_version2.probekey.name,
                self.mt1_version2.probekey.package.version
            ]
        )
        self.assertEqual(serialized_data['parent'], self.mt1_version2.parent)
        self.assertEqual(
            serialized_data['probeexecutable'],
            self.mt1_version2.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], self.mt1_version2.attribute
        )
        self.assertEqual(
            serialized_data['dependancy'], self.mt1_version2.dependency
        )
        self.assertEqual(serialized_data['flags'], self.mt1_version2.flags)
        self.assertEqual(
            serialized_data['parameter'], self.mt1_version2.parameter
        )

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
            'parameter': '[{"key": "", "value": ""}]'
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
        self.assertEqual(metric.probeversion, self.probeversion1.__str__())
        self.assertEqual(metric.group.name, 'EGI')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(
            serialized_data['mtype'], [self.mt1_version1.mtype.name]
        )
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(
            serialized_data['description'], self.mt1_version1.description
        )
        self.assertEqual(
            serialized_data['probekey'],
            [
                self.mt1_version1.probekey.name,
                self.mt1_version1.probekey.package.version
            ]
        )
        self.assertEqual(serialized_data['parent'], self.mt1_version1.parent)
        self.assertEqual(
            serialized_data['probeexecutable'],
            self.mt1_version1.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], self.mt1_version1.attribute
        )
        self.assertEqual(
            serialized_data['dependancy'], self.mt1_version1.dependency
        )
        self.assertEqual(serialized_data['flags'], self.mt1_version1.flags)
        self.assertEqual(
            serialized_data['parameter'], self.mt1_version1.parameter
        )

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
            'parameter': '[{"key": "", "value": ""}]'
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
        self.assertEqual(metric.probeversion, self.probeversion3.__str__())
        self.assertEqual(metric.group.name, 'EUDAT')
        self.assertEqual(
            metric.config,
            '["interval 180", "maxCheckAttempts 1", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"retryInterval 1", "timeout 120"]',
        )
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(
            serialized_data['mtype'], [self.mt2_version1.mtype.name]
        )
        self.assertEqual(serialized_data['tags'], [['test_tag1']])
        self.assertEqual(
            serialized_data['description'], self.mt2_version1.description
        )
        self.assertEqual(
            serialized_data['probekey'],
            [
                self.mt2_version1.probekey.name,
                self.mt2_version1.probekey.package.version
            ]
        )
        self.assertEqual(serialized_data['parent'], self.mt2_version1.parent)
        self.assertEqual(
            serialized_data['probeexecutable'],
            self.mt2_version1.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], self.mt2_version1.attribute
        )
        self.assertEqual(
            serialized_data['dependancy'], self.mt2_version1.dependency
        )
        self.assertEqual(serialized_data['flags'], self.mt2_version1.flags)
        self.assertEqual(
            serialized_data['parameter'], self.mt2_version1.parameter
        )

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
            'parameter': '[{"key": "", "value": ""}]'
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
        self.assertEqual(metric.probeversion, self.probeversion1.__str__())
        self.assertEqual(metric.group.name, 'EGI')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(
            serialized_data['mtype'], [self.mt1_version1.mtype.name]
        )
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(
            serialized_data['description'], self.mt1_version2.description
        )
        self.assertEqual(
            serialized_data['probekey'],
            [
                self.mt1_version1.probekey.name,
                self.mt1_version1.probekey.package.version
            ]
        )
        self.assertEqual(serialized_data['parent'], self.mt1_version1.parent)
        self.assertEqual(
            serialized_data['probeexecutable'],
            self.mt1_version1.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], self.mt1_version1.attribute
        )
        self.assertEqual(
            serialized_data['dependancy'], self.mt1_version1.dependency
        )
        self.assertEqual(serialized_data['flags'], self.mt1_version1.flags)
        self.assertEqual(
            serialized_data['parameter'], self.mt1_version1.parameter
        )

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
            'parameter': '[{"key": "", "value": ""}]'
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
            'parameter': '[{"key": "", "value": ""}]'
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
            'parameter': '[{"key": "", "value": ""}]'
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
            'parameter': '[{"key": "", "value": ""}]'
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
            'parameter': '[{"key": "", "value": ""}]'
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
            'parameter': '[{"key": "", "value": ""}]'
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
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: group')
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
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'parameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: group')
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
            'description': 'New description of argo.AMS-Check',
            'parent': '',
            'probeversion': 'ams-probe (0.1.11)',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attribute),
            'dependancy': '[{"key": "", "value": ""}]',
            'flags': '[{"key": "OBSESS", "value": "1"}]',
            'parameter': '[{"key": "", "value": ""}]'
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
            'parameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        metric = poem_models.Metric.objects.get(name='org.apel.APEL-Pub')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by("-date_created")
        self.assertEqual(versions.count(), 2)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.probeversion, None)
        self.assertEqual(metric.group.name, 'EUDAT')
        self.assertEqual(metric.config, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [self.mt3.mtype.name])
        self.assertEqual(serialized_data['tags'], [])
        self.assertEqual(serialized_data['probekey'], None)
        self.assertEqual(
            serialized_data['description'], self.mt3.description
        )
        self.assertEqual(serialized_data['parent'], self.mt3.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], self.mt3.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], self.mt3.attribute)
        self.assertEqual(serialized_data['dependancy'], self.mt3.dependency)
        self.assertEqual(serialized_data['flags'], self.mt3.flags)
        self.assertEqual(serialized_data['parameter'], self.mt3.parameter)

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
            'parameter': '[{"key": "", "value": ""}]'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        metric = poem_models.Metric.objects.get(name='org.apel.APEL-Pub')
        versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by("-date_created")
        self.assertEqual(versions.count(), 2)
        serialized_data = json.loads(
            versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.probeversion, None)
        self.assertEqual(metric.group.name, 'ARGO')
        self.assertEqual(metric.config, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [self.mt3.mtype.name])
        self.assertEqual(serialized_data['tags'], [])
        self.assertEqual(serialized_data['probekey'], None)
        self.assertEqual(
            serialized_data['description'], self.mt3.description
        )
        self.assertEqual(serialized_data['parent'], self.mt3.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], self.mt3.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], self.mt3.attribute)
        self.assertEqual(serialized_data['dependancy'], self.mt3.dependency)
        self.assertEqual(serialized_data['flags'], self.mt3.flags)
        self.assertEqual(serialized_data['parameter'], self.mt3.parameter)

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
            'parameter': '[{"key": "", "value": ""}]'
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
        self.assertEqual(metric.probeversion, None)
        self.assertEqual(metric.group.name, 'EGI')
        self.assertEqual(metric.config, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [self.mt3.mtype.name])
        self.assertEqual(serialized_data['tags'], [])
        self.assertEqual(serialized_data['probekey'], None)
        self.assertEqual(serialized_data['description'], '')
        self.assertEqual(serialized_data['parent'], self.mt3.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], self.mt3.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], self.mt3.attribute)
        self.assertEqual(serialized_data['dependancy'], self.mt3.dependency)
        self.assertEqual(serialized_data['flags'], self.mt3.flags)
        self.assertEqual(serialized_data['parameter'], self.mt3.parameter)

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
            'parameter': '[{"key": "", "value": ""}]'
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
        self.assertEqual(metric.probeversion, None)
        self.assertEqual(metric.group.name, 'EGI')
        self.assertEqual(metric.config, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [self.mt3.mtype.name])
        self.assertEqual(serialized_data['tags'], [])
        self.assertEqual(serialized_data['probekey'], None)
        self.assertEqual(serialized_data['description'], '')
        self.assertEqual(serialized_data['parent'], self.mt3.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], self.mt3.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], self.mt3.attribute)
        self.assertEqual(serialized_data['dependancy'], self.mt3.dependency)
        self.assertEqual(serialized_data['flags'], self.mt3.flags)
        self.assertEqual(serialized_data['parameter'], self.mt3.parameter)

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
        self.tenant.name = "TENANT"
        self.tenant.save()
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

        self.mtype1 = admin_models.MetricTemplateType.objects.create(
            name='Active'
        )
        self.mtype2 = admin_models.MetricTemplateType.objects.create(
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
            mtype=self.mtype1,
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
            parameter=self.mt1.parameter,
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
            parameter=self.mt1.parameter,
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
            mtype=self.mtype1,
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
            parameter=mt2.parameter,
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
            parameter=mt2.parameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newer version.'
        )

        mt3 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=self.mtype2
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
            parameter=mt3.parameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )

        metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            probeversion=self.probehistory1.__str__(),
            group=self.group
        )

        metric2 = poem_models.Metric.objects.create(
            name='argo.AMSPublisher-Check',
            config='["interval 180", "maxCheckAttempts 3", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 130"]',
            probeversion=self.probehistory3.__str__(),
            group=self.group
        )

        metric3 = poem_models.Metric.objects.create(
            name='emi.unicore.Gateway',
            config='["interval 20", "maxCheckAttempts 2", '
                   '"path /usr/libexec/grid-monitoring/probes", '
                   '"retryInterval 5", "timeout 60"]',
            probeversion=self.probehistory5.__str__(),
            group=self.group
        )

        metric4 = poem_models.Metric.objects.create(
            name='org.apel.APEL-Pub',
            group=self.group
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric1.id,
            serialized_data=serialize_metric(
                metric1, tags=[self.mtag1, self.mtag2]
            ),
            object_repr=metric1.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric2.id,
            serialized_data=serialize_metric(metric2, tags=[self.mtag2]),
            object_repr=metric2.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        metric3_serialized = serializers.serialize(
            "json", [metric3],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        metric3_unserialized = json.loads(metric3_serialized)[0]
        metric3_unserialized["fields"].update({
            "tags": [self.mtag1.name],
            "mtype": ["Active"],
            "description": "",
            "parent": "",
            "probeexecutable": '["pl.plgrid/UNICORE/umi2/check_gateway/'
                               'check_gateway.pl"]',
            "attribute": '["METRIC_CONFIG_FILE -f"]',
            "dependancy": "",
            "flags": '["OBSESS 1", "NOHOSTNAME 1", "NOLBNODE 1"]',
            "parameter": ""
        })

        poem_models.TenantHistory.objects.create(
            object_id=metric3.id,
            serialized_data=json.dumps([metric3_unserialized]),
            object_repr=metric3.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric4.id,
            serialized_data=serialize_metric(metric4),
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
            parameter=self.mt1.parameter,
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
            parameter=self.mt1.parameter,
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
            'PROFILE1', ['argo.AMSPublisher-Check'], "TENANT"
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
            parameter=self.mt1.parameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        poem_models.Metric.objects.create(
            name='test.AMS-Check',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            probeversion=self.probehistory1.__str__(),
            group=self.group
        )
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
            call('PROFILE1', ['argo.AMSPublisher-Check'], "TENANT"),
            call('PROFILE2', ['argo.AMSPublisher-Check'], "TENANT")
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
            parameter=self.mt1.parameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        poem_models.Metric.objects.create(
            name='test.AMS-Check',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            probeversion=self.probehistory1.__str__(),
            group=self.group
        )
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
        mock_get.assert_called_once_with(self.tenant)
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
            parameter=self.mt1.parameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        poem_models.Metric.objects.create(
            name='test.AMS-Check',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            probeversion=self.probehistory1.__str__(),
            group=self.group
        )
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
        mock_get.assert_called_once_with(self.tenant)
        mock_delete.assert_called_once_with(
            'PROFILE1', ['argo.AMSPublisher-Check'], "TENANT"
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
            parameter=self.mt1.parameter,
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
            parameter=self.mt1.parameter,
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
            parameter=self.mt1.parameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.'
        )
        mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)
        poem_models.Metric.objects.create(
            name='test.AMS-Check',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            probeversion=self.probehistory1.__str__(),
            group=self.group
        )
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


class ListMetricConfigurationAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricConfiguration.as_view()
        self.url = '/api/v2/internal/metricconfiguration'
        self.user = CustUser.objects.create_user(
            username='testuser', is_superuser=True
        )
        self.regular_user = CustUser.objects.create_user(username='test')

        self.configuration1 = poem_models.MetricConfiguration.objects.create(
            name="local",
            globalattribute=json.dumps(
                [
                    "NAGIOS_ACTUAL_HOST_CERT /etc/nagios/globus/hostcert.pem",
                    "NAGIOS_ACTUAL_HOST_KEY /etc/nagios/globus/hostkey.pem"
                ]
            ),
            hostattribute=json.dumps(["mock.host.name attr1 some-new-value"]),
            metricparameter=json.dumps(
                [
                    "eosccore.ui.argo.grnet.gr org.nagios.ARGOWeb-AR "
                    "-r EOSC_Monitoring",
                    "argo.eosc-portal.eu org.nagios.ARGOWeb-Status -u "
                    "/eosc/report-status/Default/SERVICEGROUPS?accept=csv",
                    "sensu.cro-ngi argo.AMSPublisher-Check -q "
                    "w:metrics+g:published180 -c 10"
                ]
            )
        )
        self.configuration2 = poem_models.MetricConfiguration.objects.create(
            name="consumer",
            globalattribute="",
            hostattribute="",
            metricparameter=json.dumps([
                "eosccore.mon.devel.argo.grnet.gr argo.AMSPublisher-Check "
                "-q w:metrics+g:published180"
            ])
        )

    def test_get_configurations_super_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.configuration2.id,
                    "name": "consumer",
                    "global_attributes": [],
                    "host_attributes": [],
                    "metric_parameters": [
                        {
                            "hostname": "eosccore.mon.devel.argo.grnet.gr",
                            "metric": "argo.AMSPublisher-Check",
                            "parameter": "-q",
                            "value": "w:metrics+g:published180"
                        }
                    ]
                },
                {
                    "id": self.configuration1.id,
                    "name": "local",
                    "global_attributes": [
                        {
                            "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                            "value": "/etc/nagios/globus/hostcert.pem"
                        },
                        {
                            "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                            "value": "/etc/nagios/globus/hostkey.pem"
                        }
                    ],
                    "host_attributes": [
                        {
                            "hostname": "mock.host.name",
                            "attribute": "attr1",
                            "value": "some-new-value"
                        }
                    ],
                    "metric_parameters": [
                        {
                            "hostname": "eosccore.ui.argo.grnet.gr",
                            "metric": "org.nagios.ARGOWeb-AR",
                            "parameter": "-r",
                            "value": "EOSC_Monitoring"
                        },
                        {
                            "hostname": "argo.eosc-portal.eu",
                            "metric": "org.nagios.ARGOWeb-Status",
                            "parameter": "-u",
                            "value": "/eosc/report-status/Default/SERVICEGROUPS"
                                     "?accept=csv"
                        },
                        {
                            "hostname": "sensu.cro-ngi",
                            "metric": "argo.AMSPublisher-Check",
                            "parameter": "-q",
                            "value": "w:metrics+g:published180 -c 10"
                        }
                    ]
                }
            ]
        )

    def test_get_configurations_regular_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view metric configuration "
            "overrides."
        )

    def test_get_configuration_super_user(self):
        request = self.factory.get(self.url + "local")
        force_authenticate(request, user=self.user)
        response = self.view(request, "local")
        self.assertEqual(
            response.data,
            {
                "id": self.configuration1.id,
                "name": "local",
                "global_attributes": [
                    {
                        "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                        "value": "/etc/nagios/globus/hostcert.pem"
                    },
                    {
                        "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                        "value": "/etc/nagios/globus/hostkey.pem"
                    }
                ],
                "host_attributes": [
                    {
                        "hostname": "mock.host.name",
                        "attribute": "attr1",
                        "value": "some-new-value"
                    }
                ],
                "metric_parameters": [
                    {
                        "hostname": "eosccore.ui.argo.grnet.gr",
                        "metric": "org.nagios.ARGOWeb-AR",
                        "parameter": "-r",
                        "value": "EOSC_Monitoring"
                    },
                    {
                        "hostname": "argo.eosc-portal.eu",
                        "metric": "org.nagios.ARGOWeb-Status",
                        "parameter": "-u",
                        "value": "/eosc/report-status/Default/SERVICEGROUPS"
                                 "?accept=csv"
                    },
                    {
                        "hostname": "sensu.cro-ngi",
                        "metric": "argo.AMSPublisher-Check",
                        "parameter": "-q",
                        "value": "w:metrics+g:published180 -c 10"
                    }
                ]
            }
        )

    def test_get_configuration_regular_user(self):
        request = self.factory.get(self.url + "local")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request, "local")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view metric configuration "
            "overrides."
        )

    def test_get_configuration_nonexisting_name_super_user(self):
        request = self.factory.get(self.url + "nonexisting")
        force_authenticate(request, user=self.user)
        response = self.view(request, "nonexisting")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data["detail"], "Metric configuration not found."
        )

    def test_get_configuration_nonexisting_name_regular_user(self):
        request = self.factory.get(self.url + "nonexisting")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request, "nonexisting")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view metric configuration "
            "overrides."
        )

    def test_put_configuration_super_user(self):
        data = {
            "id": self.configuration1.id,
            "name": "local_updated",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                },
                {
                    "hostname": "sensu.cro-ngi",
                    "metric": "argo.AMSPublisher-Check",
                    "parameter": "-q",
                    "value": "w:metrics+g:published180 -c 10"
                }
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        conf = poem_models.MetricConfiguration.objects.get(
            id=self.configuration1.id
        )
        self.assertEqual(conf.name, "local_updated")
        self.assertEqual(
            conf.globalattribute,
            json.dumps([
                "NAGIOS_ACTUAL_HOST_CERT /etc/nagios/globus/hostcert.pem",
                "NAGIOS_ACTUAL_HOST_KEY /etc/nagios/globus/hostcert.key"
            ])
        )
        self.assertEqual(
            conf.hostattribute, json.dumps(["mock2.host.name attr3 value"])
        )
        self.assertEqual(
            conf.metricparameter,
            json.dumps([
                "eosccore.ui.argo.grnet.gr generic.http.ar-argoui -r EOSC",
                "sensu.cro-ngi argo.AMSPublisher-Check -q "
                "w:metrics+g:published180 -c 10"
            ])
        )

    def test_put_configuration_regular_user(self):
        self.maxDiff = None
        data = {
            "id": self.configuration1.id,
            "name": "local_updated",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric configuration "
            "overrides."
        )
        conf = poem_models.MetricConfiguration.objects.get(
            id=self.configuration1.id
        )
        self.assertEqual(conf.name, "local")
        self.assertEqual(
            conf.globalattribute,
            json.dumps([
                "NAGIOS_ACTUAL_HOST_CERT /etc/nagios/globus/hostcert.pem",
                "NAGIOS_ACTUAL_HOST_KEY /etc/nagios/globus/hostkey.pem"
            ])
        )
        self.assertEqual(
            conf.hostattribute,
            json.dumps(["mock.host.name attr1 some-new-value"])
        )
        self.assertEqual(
            conf.metricparameter,
            json.dumps([
                "eosccore.ui.argo.grnet.gr org.nagios.ARGOWeb-AR "
                "-r EOSC_Monitoring",
                "argo.eosc-portal.eu org.nagios.ARGOWeb-Status -u "
                "/eosc/report-status/Default/SERVICEGROUPS?accept=csv",
                "sensu.cro-ngi argo.AMSPublisher-Check -q "
                "w:metrics+g:published180 -c 10"
            ])
        )

    def test_put_configuration_with_only_name(self):
        data = {
            "id": self.configuration1.id,
            "name": "local_updated",
            "global_attributes": [
                {
                    "attribute": "",
                    "value": ""
                }
            ],
            "host_attributes": [
                {
                    "hostname": "",
                    "attribute": "",
                    "value": ""
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "",
                    "metric": "",
                    "parameter": "",
                    "value": ""
                }
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        conf = poem_models.MetricConfiguration.objects.get(
            id=self.configuration1.id
        )
        self.assertEqual(conf.name, "local_updated")
        self.assertEqual(conf.globalattribute, "")
        self.assertEqual(conf.hostattribute, "")
        self.assertEqual(conf.metricparameter, "")

    def test_put_configuration_with_existing_name_super_user(self):
        data = {
            "id": self.configuration1.id,
            "name": "consumer",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Metric configuration override with this name already exists."
        )

    def test_put_configuration_with_existing_name_regular_user(self):
        data = {
            "id": self.configuration1.id,
            "name": "consumer",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric configuration "
            "overrides."
        )
        conf = poem_models.MetricConfiguration.objects.get(
            id=self.configuration1.id
        )
        self.assertEqual(conf.name, "local")
        self.assertEqual(
            conf.globalattribute,
            json.dumps([
                "NAGIOS_ACTUAL_HOST_CERT /etc/nagios/globus/hostcert.pem",
                "NAGIOS_ACTUAL_HOST_KEY /etc/nagios/globus/hostkey.pem"
            ])
        )
        self.assertEqual(
            conf.hostattribute,
            json.dumps(["mock.host.name attr1 some-new-value"])
        )
        self.assertEqual(
            conf.metricparameter,
            json.dumps([
                "eosccore.ui.argo.grnet.gr org.nagios.ARGOWeb-AR "
                "-r EOSC_Monitoring",
                "argo.eosc-portal.eu org.nagios.ARGOWeb-Status -u "
                "/eosc/report-status/Default/SERVICEGROUPS?accept=csv",
                "sensu.cro-ngi argo.AMSPublisher-Check -q "
                "w:metrics+g:published180 -c 10"
            ])
        )

    def test_put_configuration_with_wrong_id_super_user(self):
        data = {
            "id": 100,
            "name": "consumer",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data["detail"],
            "Metric configuration override with requested id does not exist."
        )

    def test_put_configuration_with_wrong_id_regular_user(self):
        data = {
            "id": 100,
            "name": "consumer",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric configuration "
            "overrides."
        )

    def test_put_configuration_with_missing_keys_super_user(self):
        data = {
            "id": self.configuration1.id,
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Missing data key: name")

    def test_put_configuration_with_missing_keys_regular_user(self):
        data = {
            "id": self.configuration1.id,
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric configuration "
            "overrides."
        )

    def test_post_configuration_super_user(self):
        data = {
            "name": "new",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.post(self.url, data, format="json")
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 3
        )
        conf = poem_models.MetricConfiguration.objects.get(name="new")
        self.assertEqual(
            conf.globalattribute,
            json.dumps([
                "NAGIOS_ACTUAL_HOST_CERT /etc/nagios/globus/hostcert.pem",
                "NAGIOS_ACTUAL_HOST_KEY /etc/nagios/globus/hostcert.key"
            ])
        )
        self.assertEqual(
            conf.hostattribute, json.dumps(["mock2.host.name attr3 value"])
        )
        self.assertEqual(
            conf.metricparameter,
            json.dumps([
                "eosccore.ui.argo.grnet.gr generic.http.ar-argoui -r EOSC"
            ])
        )

    def test_post_configuration_regular_user(self):
        data = {
            "name": "new",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.post(self.url, data, format="json")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric configuration "
            "overrides."
        )
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        self.assertRaises(
            poem_models.MetricConfiguration.DoesNotExist,
            poem_models.MetricConfiguration.objects.get,
            name="new"
        )

    def test_post_configuration_with_existing_name_super_user(self):
        data = {
            "name": "local",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.post(self.url, data, format="json")
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Local metric configuration with this name already exists."
        )

    def test_post_configuration_with_existing_name_regular_user(self):
        data = {
            "name": "local",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "host_attributes": [
                {
                    "hostname": "mock2.host.name",
                    "attribute": "attr3",
                    "value": "value"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.post(self.url, data, format="json")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric configuration "
            "overrides."
        )
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )

    def test_post_configuration_with_missing_key_super_user(self):
        data = {
            "name": "new",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.post(self.url, data, format="json")
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        self.assertEqual(
            response.data["detail"], "Missing data key: host_attributes"
        )
        self.assertRaises(
            poem_models.MetricConfiguration.DoesNotExist,
            poem_models.MetricConfiguration.objects.get,
            name="new"
        )

    def test_post_configuration_with_missing_key_regular_user(self):
        data = {
            "name": "new",
            "global_attributes": [
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                    "value": "/etc/nagios/globus/hostcert.pem"
                },
                {
                    "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                    "value": "/etc/nagios/globus/hostcert.key"
                }
            ],
            "metric_parameters": [
                {
                    "hostname": "eosccore.ui.argo.grnet.gr",
                    "metric": "generic.http.ar-argoui",
                    "parameter": "-r",
                    "value": "EOSC"
                }
            ]
        }
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.post(self.url, data, format="json")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric configuration "
            "overrides."
        )
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        self.assertRaises(
            poem_models.MetricConfiguration.DoesNotExist,
            poem_models.MetricConfiguration.objects.get,
            name="new"
        )

    def test_delete_configuration_superuser(self):
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + "consumer")
        force_authenticate(request, user=self.user)
        response = self.view(request, "consumer")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 1
        )
        self.assertRaises(
            poem_models.MetricConfiguration.DoesNotExist,
            poem_models.MetricConfiguration.objects.get,
            name="consumer"
        )

    def test_delete_configuration_regular_user(self):
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + "consumer")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request, "consumer")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete local metric configurations."
        )
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )

    def test_delete_configuration_if_nonexisting_name_superuser(self):
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + "nonexisting")
        force_authenticate(request, user=self.user)
        response = self.view(request, "nonexisting")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data["detail"], "Metric configuration not found."
        )
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )

    def test_delete_configuration_if_nonexisting_name_regular_user(self):
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + "nonexisting")
        force_authenticate(request, user=self.regular_user)
        response = self.view(request, "nonexisting")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete local metric configurations."
        )
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )

    def test_delete_configuration_name_not_defined_superuser(self):
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Metric configuration name must be defined."
        )
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )

    def test_delete_configuration_name_not_defined_regular_user(self):
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.regular_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete local metric configurations."
        )
        self.assertEqual(
            poem_models.MetricConfiguration.objects.all().count(), 2
        )
