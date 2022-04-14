import datetime
import json

from Poem.api import views_internal as views
from Poem.helpers.history_helpers import create_comment, serialize_metric
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from rest_framework import status
from rest_framework.test import force_authenticate


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
            serialized_data=serialize_metric(
                self.metric1, tags=[self.mtag1, self.mtag2]
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

        comment = create_comment(
            self.metric1, ct=ct_m,
            new_serialized_data=serialize_metric(
                self.metric1, tags=[self.mtag1, self.mtag2, self.mtag3]
            )
        )
        self.ver2 = poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            serialized_data=serialize_metric(
                self.metric1, tags=[self.mtag1, self.mtag2, self.mtag3]
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
            serialized_data=serialize_metric(self.metric2),
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
