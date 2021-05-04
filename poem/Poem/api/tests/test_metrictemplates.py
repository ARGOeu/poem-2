import datetime
import json
from unittest.mock import patch, call

import requests
from Poem.api import views_internal as views
from Poem.helpers.history_helpers import create_comment
from Poem.helpers.versioned_comments import new_comment
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from rest_framework import status
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory
from tenant_schemas.utils import get_public_schema_name, schema_context

from .utils_test import mocked_inline_metric_for_db, mocked_func, encode_data


class ListMetricTemplatesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplates.as_view()
        self.url = '/api/v2/internal/metrictemplates/'
        self.tenant_superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )
        self.tenant_user = CustUser.objects.create_user(username='testuser')
        with schema_context(get_public_schema_name()):
            self.public_tenant = Tenant.objects.create(
                name='public', domain_url='public',
                schema_name=get_public_schema_name()
            )
            self.superuser = CustUser.objects.create_user(
                username='poem', is_superuser=True
            )
            self.user = CustUser.objects.create_user(username='testuser')

        self.template_active = admin_models.MetricTemplateType.objects.create(
            name='Active'
        )
        template_passive = admin_models.MetricTemplateType.objects.create(
            name='Passive'
        )

        self.metric_active = poem_models.MetricType.objects.create(
            name='Active'
        )
        metric_passive = poem_models.MetricType.objects.create(name='Passive')

        self.tag1 = admin_models.MetricTags.objects.create(name='internal')
        self.tag2 = admin_models.MetricTags.objects.create(name='deprecated')
        self.tag3 = admin_models.MetricTags.objects.create(name='test_tag1')
        self.tag4 = admin_models.MetricTags.objects.create(name='test_tag2')

        self.ct = ContentType.objects.get_for_model(poem_models.Metric)

        tag1 = admin_models.OSTag.objects.create(name='CentOS 6')
        tag2 = admin_models.OSTag.objects.create(name='CentOS 7')

        repo1 = admin_models.YumRepo.objects.create(name='repo-1', tag=tag1)
        repo2 = admin_models.YumRepo.objects.create(name='repo-2', tag=tag2)

        package1 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.7'
        )
        package1.repos.add(repo1)

        package2 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.8'
        )
        package2.repos.add(repo1, repo2)

        package3 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.11'
        )
        package3.repos.add(repo2)

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
            version_user=self.superuser.username,
        )

        probe1.package = package2
        probe1.comment = 'Newer version.'
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
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=self.superuser.username
        )

        probe1.package = package3
        probe1.comment = 'Newest version.'
        probe1.save()

        self.probeversion3 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=self.superuser.username
        )

        probe2 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            package=package3,
            description='Probe is inspecting AMS publisher running on Nagios '
                        'monitoring instances.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        self.probeversion4 = admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=probe2.package,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.superuser.username
        )

        self.metrictemplate1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=self.template_active,
            probekey=self.probeversion1,
            description='Some description of argo.AMS-Check metric template.',
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        self.metrictemplate1.tags.add(self.tag3, self.tag4)

        self.metrictemplate2 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=template_passive
        )
        self.metrictemplate2.tags.add(self.tag2)

        self.metrictemplate3 = admin_models.MetricTemplate.objects.create(
            name='argo.AMSPublisher-Check',
            mtype=self.template_active,
            probekey=self.probeversion4,
            description='',
            probeexecutable='["ams-publisher-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            parameter='["-s /var/run/argo-nagios-ams-publisher/sock"]',
            flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
        )

        mt1_history = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate1,
            name=self.metrictemplate1.name,
            mtype=self.metrictemplate1.mtype,
            probekey=self.metrictemplate1.probekey,
            description=self.metrictemplate1.description,
            probeexecutable=self.metrictemplate1.probeexecutable,
            config=self.metrictemplate1.config,
            attribute=self.metrictemplate1.attribute,
            dependency=self.metrictemplate1.dependency,
            flags=self.metrictemplate1.flags,
            files=self.metrictemplate1.files,
            parameter=self.metrictemplate1.parameter,
            fileparameter=self.metrictemplate1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.superuser.username,
            version_comment='Initial version.',
        )
        mt1_history.tags.add(self.tag3, self.tag4)

        mt2_history = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate2,
            name=self.metrictemplate2.name,
            mtype=self.metrictemplate2.mtype,
            description=self.metrictemplate2.description,
            probekey=self.metrictemplate2.probekey,
            probeexecutable=self.metrictemplate2.probeexecutable,
            config=self.metrictemplate2.config,
            attribute=self.metrictemplate2.attribute,
            dependency=self.metrictemplate2.dependency,
            flags=self.metrictemplate2.flags,
            files=self.metrictemplate2.files,
            parameter=self.metrictemplate2.parameter,
            fileparameter=self.metrictemplate2.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.superuser.username,
            version_comment='Initial version.',
        )
        mt2_history.tags.add(self.tag2)

        self.metrictemplate1.probekey = self.probeversion2
        self.metrictemplate1.config = '["maxCheckAttempts 4", "timeout 70", ' \
                                      '"path /usr/libexec/argo-monitoring/", ' \
                                      '"interval 5", "retryInterval 3"]'
        self.metrictemplate1.save()

        mt1_history2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate1,
            name=self.metrictemplate1.name,
            mtype=self.metrictemplate1.mtype,
            description=self.metrictemplate1.description,
            probekey=self.metrictemplate1.probekey,
            probeexecutable=self.metrictemplate1.probeexecutable,
            config=self.metrictemplate1.config,
            attribute=self.metrictemplate1.attribute,
            dependency=self.metrictemplate1.dependency,
            flags=self.metrictemplate1.flags,
            files=self.metrictemplate1.files,
            parameter=self.metrictemplate1.parameter,
            fileparameter=self.metrictemplate1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.superuser.username,
            version_comment=create_comment(self.metrictemplate1)
        )
        mt1_history2.tags.add(self.tag3, self.tag4)

        admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate3,
            name=self.metrictemplate3.name,
            mtype=self.metrictemplate3.mtype,
            description=self.metrictemplate3.description,
            probekey=self.metrictemplate3.probekey,
            probeexecutable=self.metrictemplate3.probeexecutable,
            config=self.metrictemplate3.config,
            attribute=self.metrictemplate3.attribute,
            dependency=self.metrictemplate3.dependency,
            flags=self.metrictemplate3.flags,
            files=self.metrictemplate3.files,
            parameter=self.metrictemplate3.parameter,
            fileparameter=self.metrictemplate3.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.superuser.username,
            version_comment=create_comment(self.metrictemplate3)
        )

        group = poem_models.GroupOfMetrics.objects.create(name='TEST')

        self.metric1 = poem_models.Metric.objects.create(
            name=self.metrictemplate1.name,
            group=group,
            mtype=self.metric_active,
            description=self.metrictemplate1.description,
            probekey=self.metrictemplate1.probekey,
            probeexecutable=self.metrictemplate1.probeexecutable,
            config=self.metrictemplate1.config,
            attribute=self.metrictemplate1.attribute,
            dependancy=self.metrictemplate1.dependency,
            flags=self.metrictemplate1.flags,
            files=self.metrictemplate1.files,
            parameter=self.metrictemplate1.parameter,
            fileparameter=self.metrictemplate1.fileparameter,
        )

        poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            object_repr=self.metric1.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.tenant_superuser.username
        )

        self.metric2 = poem_models.Metric.objects.create(
            name=self.metrictemplate2.name,
            group=group,
            mtype=metric_passive,
            description=self.metrictemplate2.description,
            probekey=self.metrictemplate2.probekey,
            probeexecutable=self.metrictemplate2.probeexecutable,
            config=self.metrictemplate2.config,
            attribute=self.metrictemplate2.attribute,
            dependancy=self.metrictemplate2.dependency,
            flags=self.metrictemplate2.flags,
            files=self.metrictemplate2.files,
            parameter=self.metrictemplate2.parameter,
            fileparameter=self.metrictemplate2.fileparameter,
        )

        poem_models.TenantHistory.objects.create(
            object_id=self.metric2.id,
            object_repr=self.metric2.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.tenant_superuser.username
        )

    def test_get_metric_template_list_public_tenant(self):
        request = self.factory.get(self.url)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.metrictemplate1.id,
                    'name': 'argo.AMS-Check',
                    'mtype': 'Active',
                    'description': 'Some description of argo.AMS-Check metric '
                                   'template.',
                    'ostag': ['CentOS 6', 'CentOS 7'],
                    'tags': ['test_tag1', 'test_tag2'],
                    'probeversion': 'ams-probe (0.1.8)',
                    'parent': '',
                    'probeexecutable': 'ams-probe',
                    'config': [
                        {
                            'key': 'maxCheckAttempts',
                            'value': '4'
                        },
                        {
                            'key': 'timeout',
                            'value': '70'
                        },
                        {
                            'key': 'path',
                            'value': '/usr/libexec/argo-monitoring/'
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
                    'id': self.metrictemplate3.id,
                    'name': 'argo.AMSPublisher-Check',
                    'mtype': 'Active',
                    'description': '',
                    'ostag': ['CentOS 7'],
                    'tags': [],
                    'probeversion': 'ams-publisher-probe (0.1.11)',
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
                    'dependency': [],
                    'flags': [
                        {
                            'key': 'NOHOSTNAME',
                            'value': '1'
                        },
                        {
                            'key': 'NOTIMEOUT',
                            'value': '1'
                        },
                        {
                            'key': 'NOPUBLISH',
                            'value': '1'
                        }
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
                    'id': self.metrictemplate2.id,
                    'name': 'org.apel.APEL-Pub',
                    'mtype': 'Passive',
                    'description': '',
                    'ostag': [],
                    'tags': ['deprecated'],
                    'probeversion': '',
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

    def test_get_metric_template_list_regular_tenant(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.metrictemplate1.id,
                    'importable': False,
                    'name': 'argo.AMS-Check',
                    'mtype': 'Active',
                    'description': 'Some description of argo.AMS-Check metric '
                                   'template.',
                    'ostag': ['CentOS 6', 'CentOS 7'],
                    'tags': ['test_tag1', 'test_tag2'],
                    'probeversion': 'ams-probe (0.1.8)',
                    'parent': '',
                    'probeexecutable': 'ams-probe',
                    'config': [
                        {
                            'key': 'maxCheckAttempts',
                            'value': '4'
                        },
                        {
                            'key': 'timeout',
                            'value': '70'
                        },
                        {
                            'key': 'path',
                            'value': '/usr/libexec/argo-monitoring/'
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
                    'id': self.metrictemplate3.id,
                    'name': 'argo.AMSPublisher-Check',
                    'importable': True,
                    'mtype': 'Active',
                    'description': '',
                    'ostag': ['CentOS 7'],
                    'tags': [],
                    'probeversion': 'ams-publisher-probe (0.1.11)',
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
                    'dependency': [],
                    'flags': [
                        {
                            'key': 'NOHOSTNAME',
                            'value': '1'
                        },
                        {
                            'key': 'NOTIMEOUT',
                            'value': '1'
                        },
                        {
                            'key': 'NOPUBLISH',
                            'value': '1'
                        }
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
                    'id': self.metrictemplate2.id,
                    'name': 'org.apel.APEL-Pub',
                    'importable': False,
                    'mtype': 'Passive',
                    'description': '',
                    'ostag': [],
                    'tags': ['deprecated'],
                    'probeversion': '',
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

    def test_get_metrictemplate_by_name_public_tenant(self):
        request = self.factory.get(self.url + 'argo.AMS-Check')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(
            response.data,
            {
                'id': self.metrictemplate1.id,
                'name': 'argo.AMS-Check',
                'mtype': 'Active',
                'tags': ['test_tag1', 'test_tag2'],
                'description': 'Some description of argo.AMS-Check metric '
                               'template.',
                'probeversion': 'ams-probe (0.1.8)',
                'parent': '',
                'probeexecutable': 'ams-probe',
                'config': [
                    {
                        'key': 'maxCheckAttempts',
                        'value': '4'
                    },
                    {
                        'key': 'timeout',
                        'value': '70'
                    },
                    {
                        'key': 'path',
                        'value': '/usr/libexec/argo-monitoring/'
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

    def test_get_metrictemplate_by_name_regular_tenant(self):
        request = self.factory.get(self.url + 'argo.AMS-Check')
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(
            response.data,
            {
                'id': self.metrictemplate1.id,
                'name': 'argo.AMS-Check',
                'mtype': 'Active',
                'tags': ['test_tag1', 'test_tag2'],
                'description': 'Some description of argo.AMS-Check metric '
                               'template.',
                'probeversion': 'ams-probe (0.1.8)',
                'parent': '',
                'probeexecutable': 'ams-probe',
                'config': [
                    {
                        'key': 'maxCheckAttempts',
                        'value': '4'
                    },
                    {
                        'key': 'timeout',
                        'value': '70'
                    },
                    {
                        'key': 'path',
                        'value': '/usr/libexec/argo-monitoring/'
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

    def test_get_metric_template_by_nonexisting_name_public_tenant(self):
        request = self.factory.get(self.url + 'nonexisting')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Metric template not found'})

    def test_get_metric_template_by_nonexisting_name_regular_tenant(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Metric template not found'})

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_public_superuser(self, mocked_inline):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mt = admin_models.MetricTemplate.objects.get(name='new-template')
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.mtype, self.template_active)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertEqual(mt.probekey, self.probeversion1)
        self.assertEqual(mt.description, 'New description for new-template.')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["attr-key attr-val"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.files, '["file-key file-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(mt.fileparameter, '["fp-key fp-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertTrue(self.tag1 in versions[0].tags.all())
        self.assertTrue(self.tag3 in versions[0].tags.all())
        self.assertEqual(
            versions[0].probekey, mt.probekey
        )
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)
        self.assertEqual(versions[0].version_user, 'poem')
        self.assertEqual(versions[0].version_comment, 'Initial version.')

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_public_regular_user(self, mocked_inline):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_regular_tenant_superusr(self, mocked_inline):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_regular_tenant_rglr_usr(self, mocked_inline):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_tag_public_superusr(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['internal', 'new_tag'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_tag = admin_models.MetricTags.objects.get(name='new_tag')
        mt = admin_models.MetricTemplate.objects.get(name='new-template')
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.mtype, self.template_active)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(new_tag in mt.tags.all())
        self.assertEqual(mt.probekey, self.probeversion1)
        self.assertEqual(mt.description, 'New description for new-template.')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["attr-key attr-val"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.files, '["file-key file-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(mt.fileparameter, '["fp-key fp-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertTrue(self.tag1 in versions[0].tags.all())
        self.assertTrue(new_tag in versions[0].tags.all())
        self.assertEqual(
            versions[0].probekey, mt.probekey
        )
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)
        self.assertEqual(versions[0].version_user, 'poem')
        self.assertEqual(versions[0].version_comment, 'Initial version.')

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_tag_public_regular_usr(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['internal', 'new_tag'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_tag_regular_tenant_superusr(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['internal', 'new_tag'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_tag_regular_tenant_reg_usr(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['internal', 'new_tag'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_tag_public_superuser(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': [],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mt = admin_models.MetricTemplate.objects.get(name='new-template')
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.mtype, self.template_active)
        self.assertFalse(mt.tags.all())
        self.assertEqual(mt.probekey, self.probeversion1)
        self.assertEqual(mt.description, 'New description for new-template.')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["attr-key attr-val"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.files, '["file-key file-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(mt.fileparameter, '["fp-key fp-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertFalse(versions[0].tags.all())
        self.assertEqual(
            versions[0].probekey, mt.probekey
        )
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)
        self.assertEqual(versions[0].version_user, 'poem')
        self.assertEqual(versions[0].version_comment, 'Initial version.')

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_tag_public_regular_user(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': [],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_tag_regular_tenant_superuser(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': [],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_tag_regular_tenant_regular_user(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': [],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_existing_name_public_superuser(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'Metric template with this name already exists.'
        )

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_existing_name_public_regular_user(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_existing_name_regular_tenant_superuser(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_existing_name_regular_tenant_reg_usr(
            self, mocked_inline
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
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
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_probeversion_public_sprusr(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting (0.1.1)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Probe version does not exist.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_probeversion_public_regular(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting (0.1.1)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_probeversion_regular_su(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting (0.1.1)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_probeversion_regular_user(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting (0.1.1)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_specifying_probes_version_public_su(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Probe version not specified.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_specifying_probes_version_public_usr(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_specifying_probes_version_regular_su(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_specifying_probes_version_reglr_usr(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_missing_data_key_public_superuser(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Missing data key: flags'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_missing_data_key_public_regular_usr(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_missing_data_key_regular_tenant_su(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_missing_data_key_regular_tenant_usr(
            self, mock_inline
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey(self, inline, update):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        update.assert_called_once()
        update.assert_called_with(mt, 'argo.AMS-Check', self.probeversion2)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "maxCheckAttempts", "retryInterval", '
                '"timeout"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"added": {"fields": ["files"], "object": ["file-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["fileparameter"], '
                '"object": ["fp-key"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag1"]}}',
                '{"added": {"fields": ["parent"]}}',
                '{"changed": {"fields": ["description", "name", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(
            mt.description, 'New description for the metric template.'
        )
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.files, '["file-key file-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(mt.fileparameter, '["fp-key fp-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey_with_nonexisting_tag(
            self, inline, update
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'new_tag'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        content, content_type = encode_data(data)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        new_tag = admin_models.MetricTags.objects.get(name='new_tag')
        update.assert_called_once()
        update.assert_called_with(mt, 'argo.AMS-Check', self.probeversion2)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "maxCheckAttempts", "retryInterval", '
                '"timeout"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"added": {"fields": ["files"], "object": ["file-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["fileparameter"], '
                '"object": ["fp-key"]}}',
                '{"added": {"fields": ["tags"], "object": ["new_tag"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag2"]}}',
                '{"added": {"fields": ["parent"]}}',
                '{"changed": {"fields": ["description", "name", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(new_tag in mt.tags.all())
        self.assertEqual(
            mt.description, 'New description for the metric template.'
        )
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.files, '["file-key file-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(mt.fileparameter, '["fp-key fp-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey_with_no_tag(
            self, inline, update
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        update.assert_called_once()
        update.assert_called_with(mt, 'argo.AMS-Check', self.probeversion2)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "maxCheckAttempts", "retryInterval", '
                '"timeout"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"added": {"fields": ["files"], "object": ["file-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["fileparameter"], '
                '"object": ["fp-key"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag1"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag2"]}}',
                '{"added": {"fields": ["parent"]}}',
                '{"changed": {"fields": ["description", "name", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 0)
        self.assertEqual(
            mt.description, 'New description for the metric template.'
        )
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.files, '["file-key file-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(mt.fileparameter, '["fp-key fp-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey(self, inline, update):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(update.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 3)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "path", "retryInterval"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"added": {"fields": ["files"], "object": ["file-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["fileparameter"], '
                '"object": ["fp-key"]}}',
                '{"added": {"fields": ["parent"]}}',
                '{"changed": {"fields": ["description", "name", '
                '"probeexecutable", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe-new"]')
        self.assertEqual(mt.description, 'New description.')
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.files, '["file-key file-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(mt.fileparameter, '["fp-key fp-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_nonexisting_tag(
            self, inline, update
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'new_tag'],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        content, content_type = encode_data(data)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(update.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        new_tag = admin_models.MetricTags.objects.get(name='new_tag')
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 3)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "path", "retryInterval"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"added": {"fields": ["files"], "object": ["file-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["fileparameter"], '
                '"object": ["fp-key"]}}',
                '{"added": {"fields": ["parent"]}}',
                '{"added": {"fields": ["tags"], "object": ["new_tag"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag2"]}}',
                '{"changed": {"fields": ["description", "name", '
                '"probeexecutable", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(new_tag in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe-new"]')
        self.assertEqual(mt.description, 'New description.')
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.files, '["file-key file-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(mt.fileparameter, '["fp-key fp-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_no_tag(self, inline, update):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(update.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 3)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "path", "retryInterval"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"added": {"fields": ["files"], "object": ["file-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["fileparameter"], '
                '"object": ["fp-key"]}}',
                '{"added": {"fields": ["parent"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag1"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag2"]}}',
                '{"changed": {"fields": ["description", "name", '
                '"probeexecutable", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 0)
        self.assertEqual(mt.probeexecutable, '["ams-probe-new"]')
        self.assertEqual(mt.description, 'New description.')
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.files, '["file-key file-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(mt.fileparameter, '["fp-key fp-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_passive_metric_template(self, inline, update):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        data = {
            'id': self.metrictemplate2.id,
            'name': 'org.apel.APEL-Pub-new',
            'probeversion': '',
            'description': 'Added description for org.apel.APEL-Pub-new.',
            'mtype': 'Passive',
            'tags': ['test_tag1'],
            'probeexecutable': '',
            'parent': '',
            'config': json.dumps([{'key': '', 'value': ''}]),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': 'PASSIVE', 'value': '1'}]),
            'files': json.dumps([{'key': '', 'value': ''}]),
            'fileparameter': json.dumps([{'key': '', 'value': ''}]),
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate2.id)
        update.assert_called_once()
        update.assert_called_with(mt, 'org.apel.APEL-Pub', None)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.name, 'org.apel.APEL-Pub-new')
        self.assertEqual(mt.mtype.name, 'Passive')
        self.assertEqual(len(mt.tags.all()), 1)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertEqual(
            mt.description, 'Added description for org.apel.APEL-Pub-new.'
        )
        self.assertEqual(mt.probeexecutable, '')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.config, '')
        self.assertEqual(mt.attribute, '')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["PASSIVE 1"]')
        self.assertEqual(mt.files, '')
        self.assertEqual(mt.parameter, '')
        self.assertEqual(mt.fileparameter, '')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_existing_name(self, inline, update):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'org.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'ams-probe (0.1.7)',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
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
        self.assertFalse(update.called)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_nonexisting_probeversion(
            self, inline, update
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'test.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'nonexisting (1.0.0)',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'You should choose existing probe version!'}
        )
        self.assertFalse(update.called)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_specifying_probes_version(
            self, inline, update
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'test.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'nonexisting',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'You should specify the version of the probe!'}
        )
        self.assertFalse(update.called)

    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplates_with_update_err_msgs(self, inline, update):
        inline.side_effect = mocked_inline_metric_for_db
        update.return_value = [
            'TENANT1: Error trying to update metric in metric profiles.\n'
            'Please update metric profiles manually.',
            'TENANT2: Error trying to update metric in metric profiles.\n'
            'Please update metric profiles manually.'
        ]
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}]),
            'files': json.dumps([{'key': 'file-key', 'value': 'file-val'}]),
            'fileparameter': json.dumps([{'key': 'fp-key', 'value': 'fp-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_418_IM_A_TEAPOT)
        self.assertEqual(
            response.data,
            {
                'detail': 'TENANT1: Error trying to update metric in metric '
                          'profiles.\nPlease update metric profiles manually.\n'
                          'TENANT2: Error trying to update metric in metric '
                          'profiles.\nPlease update metric profiles manually.'
            }
        )
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        update.assert_called_once()
        update.assert_called_with(mt, 'argo.AMS-Check', self.probeversion2)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "maxCheckAttempts", "retryInterval", '
                '"timeout"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"added": {"fields": ["files"], "object": ["file-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["fileparameter"], '
                '"object": ["fp-key"]}}',
                '{"added": {"fields": ["parent"]}}',
                '{"changed": {"fields": ["description", "name", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(
            mt.description, 'New description for the metric template.'
        )
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.files, '["file-key file-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(mt.fileparameter, '["fp-key fp-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].files, mt.files)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].fileparameter, mt.fileparameter)

    def test_delete_metric_template(self):
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'argo.AMS-Check')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 2)

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


class ListMetricTemplatesForProbeVersionAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplatesForProbeVersion.as_view()
        self.url = '/api/v2/internal/metricsforprobes/'
        self.user = CustUser.objects.create_user(username='testuser')

        mtype1 = admin_models.MetricTemplateType.objects.create(name='Active')
        mtype2 = admin_models.MetricTemplateType.objects.create(name='Passive')

        tag = admin_models.OSTag.objects.create(name='CentOS 6')
        repo = admin_models.YumRepo.objects.create(name='repo-1', tag=tag)
        package1 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.7'
        )
        package1.repos.add(repo)

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

        self.probeversion2 = admin_models.ProbeHistory.objects.create(
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

        metrictag1 = admin_models.MetricTags.objects.create(name='test_tag1')
        metrictag2 = admin_models.MetricTags.objects.create(name='test_tag2')

        mt1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probekey=self.probeversion1,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        mt1.tags.add(metrictag1, metrictag2)

        mt2 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=mtype2,
        )
        mt2.tags.add(metrictag2)

        admin_models.MetricTemplate.objects.create(
            name='test-metric',
            mtype=mtype1,
            probekey=self.probeversion1,
            probeexecutable='["test-metric"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

    def test_get_metric_templates_for_probe_version(self):
        request = self.factory.get(self.url + 'ams-probe(0.1.7)')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ams-probe(0.1.7)')
        self.assertEqual(
            [r for r in response.data],
            ['argo.AMS-Check', 'test-metric']
        )

    def test_get_metric_templates_if_empty(self):
        request = self.factory.get(self.url + 'ams-publisher-probe(0.1.7)')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ams-publisher-probe(0.1.7)')
        self.assertEqual(list(response.data), [])


class ListMetricTemplatesForImportTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplatesForImport.as_view()
        self.url = '/api/v2/internal/metrictemplates-import/'
        self.user = CustUser.objects.create_user(username='testuser')

        mtype1 = admin_models.MetricTemplateType.objects.create(name='Active')
        mtype2 = admin_models.MetricTemplateType.objects.create(name='Passive')

        tag1 = admin_models.OSTag.objects.create(name='CentOS 6')
        tag2 = admin_models.OSTag.objects.create(name='CentOS 7')

        repo1 = admin_models.YumRepo.objects.create(name='repo-1', tag=tag1)
        repo2 = admin_models.YumRepo.objects.create(name='repo-2', tag=tag2)

        package1 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.7'
        )
        package1.repos.add(repo1)

        package2 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.11'
        )
        package2.repos.add(repo1, repo2)

        package3 = admin_models.Package.objects.create(
            name='nagios-plugins-nrpe',
            version='3.2.0'
        )
        package3.repos.add(repo1)

        package4 = admin_models.Package.objects.create(
            name='nagios-plugins-nrpe',
            version='3.2.1'
        )
        package4.repos.add(repo2)

        package5 = admin_models.Package.objects.create(
            name='sdc-nerc-sparql',
            version='1.0.1'
        )
        package5.repos.add(repo2)

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            package=package1,
            description='Probe is inspecting AMS service.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probe2 = admin_models.Probe.objects.create(
            name='check_nrpe',
            package=package3,
            description='This is a plugin that is and is used to contact the '
                        'NRPE process on remote hosts.',
            comment='Initial version.',
            repository='https://github.com/NagiosEnterprises/nrpe',
            docurl='https://github.com/NagiosEnterprises/nrpe/blob/master/'
                   'CHANGELOG.md'
        )

        probe3 = admin_models.Probe.objects.create(
            name='sdc-nerq-sparq',
            package=package5,
            description='sparql endpoint nvs.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/sdc-nerc-spqrql',
            docurl='https://github.com/ARGOeu/sdc-nerc-spqrql'
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
            version_user=self.user.username
        )

        probe1.package = package2
        probe1.comment = 'Newer version.'
        probe1.save()

        probeversion2 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newer version.',
            version_user=self.user.username
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
            version_user=self.user.username
        )

        probe2.package = package4
        probe2.comment = 'Newer version.'
        probe2.save()

        probeversion4 = admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=probe2.package,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newer version.',
            version_user=self.user.username
        )

        probeversion5 = admin_models.ProbeHistory.objects.create(
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

        metrictag1 = admin_models.MetricTags.objects.create(name='test_tag1')
        metrictag2 = admin_models.MetricTags.objects.create(name='test_tag2')
        metrictag3 = admin_models.MetricTags.objects.create(name='test_tag3')

        metrictemplate1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probekey=probeversion1,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        metrictemplate1.tags.add(metrictag2)

        self.mtversion1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate1,
            name=metrictemplate1.name,
            mtype=metrictemplate1.mtype,
            probekey=metrictemplate1.probekey,
            probeexecutable=metrictemplate1.probeexecutable,
            config=metrictemplate1.config,
            attribute=metrictemplate1.attribute,
            dependency=metrictemplate1.dependency,
            flags=metrictemplate1.flags,
            files=metrictemplate1.files,
            parameter=metrictemplate1.parameter,
            fileparameter=metrictemplate1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )
        self.mtversion1.tags.add(metrictag2)

        metrictemplate1.probekey = probeversion2
        metrictemplate1.save()
        metrictemplate1.tags.add(metrictag1)

        self.mtversion2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate1,
            name=metrictemplate1.name,
            mtype=metrictemplate1.mtype,
            probekey=metrictemplate1.probekey,
            probeexecutable=metrictemplate1.probeexecutable,
            config=metrictemplate1.config,
            attribute=metrictemplate1.attribute,
            dependency=metrictemplate1.dependency,
            flags=metrictemplate1.flags,
            files=metrictemplate1.files,
            parameter=metrictemplate1.parameter,
            fileparameter=metrictemplate1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newer version.'
        )
        self.mtversion2.tags.add(metrictag1, metrictag2)

        metrictemplate2 = admin_models.MetricTemplate.objects.create(
            name='argo.EGI-Connectors-Check',
            mtype=mtype1,
            probekey=probeversion3,
            probeexecutable='["check_nrpe"]',
            config='["maxCheckAttempts 2", "timeout 60", '
                   '"path /usr/lib64/nagios/plugins", '
                   '"interval 720", "retryInterval 15"]',
            parameter='["-c check_connectors_egi"]'
        )

        self.mtversion3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate2,
            name=metrictemplate2.name,
            mtype=metrictemplate2.mtype,
            probekey=metrictemplate2.probekey,
            probeexecutable=metrictemplate2.probeexecutable,
            config=metrictemplate2.config,
            attribute=metrictemplate2.attribute,
            dependency=metrictemplate2.dependency,
            flags=metrictemplate2.flags,
            files=metrictemplate2.files,
            parameter=metrictemplate2.parameter,
            fileparameter=metrictemplate2.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )

        metrictemplate2.probekey = probeversion4
        metrictemplate2.save()
        metrictemplate2.tags.add(metrictag3)

        self.mtversion4 = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate2,
            name=metrictemplate2.name,
            mtype=metrictemplate2.mtype,
            probekey=metrictemplate2.probekey,
            probeexecutable=metrictemplate2.probeexecutable,
            config=metrictemplate2.config,
            attribute=metrictemplate2.attribute,
            dependency=metrictemplate2.dependency,
            flags=metrictemplate2.flags,
            files=metrictemplate2.files,
            parameter=metrictemplate2.parameter,
            fileparameter=metrictemplate2.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newer version.'
        )
        self.mtversion4.tags.add(metrictag3)

        metrictemplate3 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=mtype2
        )

        self.mtversion5 = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate3,
            name=metrictemplate3.name,
            mtype=metrictemplate3.mtype,
            probekey=metrictemplate3.probekey,
            probeexecutable=metrictemplate3.probeexecutable,
            config=metrictemplate3.config,
            attribute=metrictemplate3.attribute,
            dependency=metrictemplate3.dependency,
            flags=metrictemplate3.flags,
            files=metrictemplate3.files,
            parameter=metrictemplate3.parameter,
            fileparameter=metrictemplate3.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )

        metrictemplate4 = admin_models.MetricTemplate.objects.create(
            name='eu.seadatanet.org.nerc-sparql-check',
            mtype=mtype1,
            probekey=probeversion5,
            probeexecutable='sdc-nerq-sparql.sh',
            config='["interval 15", "maxCheckAttempts 3", '
                   '"path /usr/libexec/argo-monitoring/probes/'
                   'sdc-nerc-sparql/", "retryInterval 3", "timeout 15"]',
            attribute='["eu.seadatanet.org.nerc-sparql_URL -H"]',
            flags='["OBSESS 1", "PNP 1"]'
        )

        self.mtversion6 = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate4,
            name=metrictemplate4.name,
            mtype=metrictemplate4.mtype,
            probekey=metrictemplate4.probekey,
            probeexecutable=metrictemplate4.probeexecutable,
            config=metrictemplate4.config,
            attribute=metrictemplate4.attribute,
            dependency=metrictemplate4.dependency,
            flags=metrictemplate4.flags,
            files=metrictemplate4.files,
            parameter=metrictemplate4.parameter,
            fileparameter=metrictemplate4.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )

    def test_get_metrictemplates_for_import_fail_if_no_auth(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_metrictemplates_for_import_all(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'name': 'argo.AMS-Check',
                    'mtype': 'Active',
                    'tags': ['test_tag1', 'test_tag2'],
                    'ostag': ['CentOS 6', 'CentOS 7'],
                    'probeversion': 'ams-probe (0.1.11)',
                    'centos6_probeversion': 'ams-probe (0.1.11)',
                    'centos7_probeversion': 'ams-probe (0.1.11)'
                },
                {
                    'name': 'argo.EGI-Connectors-Check',
                    'mtype': 'Active',
                    'tags': ['test_tag3'],
                    'ostag': ['CentOS 6', 'CentOS 7'],
                    'probeversion': 'check_nrpe (3.2.1)',
                    'centos6_probeversion': 'check_nrpe (3.2.0)',
                    'centos7_probeversion': 'check_nrpe (3.2.1)'
                },
                {
                    'name': 'eu.seadatanet.org.nerc-sparql-check',
                    'mtype': 'Active',
                    'tags': [],
                    'ostag': ['CentOS 7'],
                    'probeversion': 'sdc-nerq-sparq (1.0.1)',
                    'centos6_probeversion': '',
                    'centos7_probeversion': 'sdc-nerq-sparq (1.0.1)'
                },
                {
                    'name': 'org.apel.APEL-Pub',
                    'mtype': 'Passive',
                    'tags': [],
                    'ostag': ['CentOS 6', 'CentOS 7'],
                    'probeversion': '',
                    'centos6_probeversion': '',
                    'centos7_probeversion': ''
                }
            ]
        )


class CommentsTests(TenantTestCase):
    def test_new_comment_with_objects_change(self):
        comment = '[{"changed": {"fields": ["config"], ' \
                  '"object": ["maxCheckAttempts", "path", "timeout"]}}, ' \
                  '{"changed": {"fields": ["attribute"], ' \
                  '"object": ["attribute-key1", "attribute-key2"]}}, ' \
                  '{"changed": {"fields": ["dependency"], ' \
                  '"object": ["dependency-key"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Changed config fields "maxCheckAttempts", "path" and "timeout". '
            'Changed attribute fields "attribute-key1" and "attribute-key2". '
            'Changed dependency field "dependency-key".'
        )

    def test_new_comment_with_objects_add(self):
        comment = '[{"added": {"fields": ["config"], ' \
                  '"object": ["maxCheckAttempts", "path", "timeout"]}}, ' \
                  '{"added": {"fields": ["attribute"], ' \
                  '"object": ["attribute-key1", "attribute-key2"]}}, ' \
                  '{"added": {"fields": ["dependency"], ' \
                  '"object": ["dependency-key"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Added config fields "maxCheckAttempts", "path" and "timeout". '
            'Added attribute fields "attribute-key1" and "attribute-key2". '
            'Added dependency field "dependency-key".'
        )

    def test_new_comment_with_objects_delete(self):
        comment = '[{"deleted": {"fields": ["config"], ' \
                  '"object": ["maxCheckAttempts", "path", "timeout"]}}, ' \
                  '{"deleted": {"fields": ["attribute"], ' \
                  '"object": ["attribute-key1", "attribute-key2"]}}, ' \
                  '{"deleted": {"fields": ["dependency"], ' \
                  '"object": ["dependency-key"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Deleted config fields "maxCheckAttempts", "path" and "timeout". '
            'Deleted attribute fields "attribute-key1" and "attribute-key2". '
            'Deleted dependency field "dependency-key".'
        )

    def test_new_comment_with_fields(self):
        comment = '[{"added": {"fields": ["docurl", "comment"]}}, ' \
                  '{"changed": {"fields": ["name", "probeexecutable", ' \
                  '"group"]}}, ' \
                  '{"deleted": {"fields": ["version", "description"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Added docurl and comment. '
            'Changed name, probeexecutable and group. '
            'Deleted version and description.'
        )

    def test_new_comment_initial(self):
        comment = 'Initial version.'
        self.assertEqual(new_comment(comment), 'Initial version.')

    def test_new_comment_no_changes(self):
        comment = '[]'
        self.assertEqual(new_comment(comment), 'No fields changed.')

    def test_new_comment_for_thresholds_profiles_rules_field(self):
        comment = '[{"changed": {"fields": ["rules"], ' \
                  '"object": ["metricA"]}}, ' \
                  '{"deleted": {"fields": ["rules"], ' \
                  '"object": ["metricB"]}}, ' \
                  '{"added": {"fields": ["rules"], "object": ["metricC"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Changed rule for metric "metricA". '
            'Deleted rule for metric "metricB". '
            'Added rule for metric "metricC".'
        )

    def test_new_comment_for_metric_profile_metricinstances(self):
        comment = '[{"added": {"fields": ["metricinstances"], ' \
                  '"object": ["ARC-CE", "org.nordugrid.ARC-CE-IGTF"]}}, ' \
                  '{"deleted": {"fields": ["metricinstances"], ' \
                  '"object": ["APEL", "org.apel.APEL-Sync"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Added service-metric instance tuple '
            '(ARC-CE, org.nordugrid.ARC-CE-IGTF). '
            'Deleted service-metric instance tuple '
            '(APEL, org.apel.APEL-Sync).'
        )


class BulkDeleteMetricTemplatesTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.BulkDeleteMetricTemplates.as_view()
        self.url = '/api/v2/internal/deletetemplates/'
        self.user = CustUser.objects.create_user(username='testuser')

        with schema_context(get_public_schema_name()):
            Tenant.objects.create(
                name='public', domain_url='public',
                schema_name=get_public_schema_name()
            )

        mttype1 = admin_models.MetricTemplateType.objects.create(name='Active')
        mttype2 = admin_models.MetricTemplateType.objects.create(name='Passive')

        mtype = poem_models.MetricType.objects.create(name='Active')

        tag = admin_models.OSTag.objects.create(name='tag')
        repo = admin_models.YumRepo.objects.create(name='repo', tag=tag)

        package = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.12'
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

        probe2 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            package=package,
            description='Probe is inspecting AMS publisher running on Nagios '
                        'monitoring instances.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probeversion2 = admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=probe2.package,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username,
        )

        mt1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=mttype1,
            probekey=probeversion1,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        admin_models.MetricTemplateHistory.objects.create(
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
            files=mt1.files,
            parameter=mt1.parameter,
            fileparameter=mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )

        mt2 = admin_models.MetricTemplate.objects.create(
            name='test.AMS-Check',
            description='Description of test.AMS-Check.',
            probeexecutable='["ams-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            attribute='["argo.ams_TOKEN --token"]',
            parameter='["--project EGI"]',
            flags='["OBSESS 1"]',
            mtype=mttype1,
            probekey=probeversion1
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
            files=mt2.files,
            parameter=mt2.parameter,
            fileparameter=mt2.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )

        mt3 = admin_models.MetricTemplate.objects.create(
            name='argo.AMSPublisher-Check',
            mtype=mttype1,
            probekey=probeversion2,
            description='Some description of publisher metric.',
            probeexecutable='ams-publisher-probe',
            config='["maxCheckAttempts 1", "timeout 120",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 180", "retryInterval 1"]',
            parameter='["-s /var/run/argo-nagios-ams-publisher/sock"]',
            flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
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
            version_comment='Initial version.',
        )

        mt4 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=mttype2,
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=mt4,
            name=mt4.name,
            mtype=mt4.mtype,
            probekey=mt4.probekey,
            description=mt4.description,
            probeexecutable=mt4.probeexecutable,
            config=mt4.config,
            attribute=mt4.attribute,
            dependency=mt4.dependency,
            flags=mt4.flags,
            files=mt4.files,
            parameter=mt4.parameter,
            fileparameter=mt4.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )

        self.metric = poem_models.Metric.objects.create(
            name='test.AMS-Check',
            description='Description of test.AMS-Check.',
            probeexecutable='["ams-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            attribute='["argo.ams_TOKEN --token"]',
            parameter='["--project EGI"]',
            flags='["OBSESS 1"]',
            mtype=mtype,
            probekey=probeversion1,
            group=poem_models.GroupOfMetrics.objects.create(name='test')
        )

        poem_models.TenantHistory.objects.create(
            object_id=self.metric.id,
            serialized_data=serializers.serialize(
                'json', [self.metric],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr='argo.AMS-Check',
            content_type=ContentType.objects.get_for_model(self.metric),
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates(self, mock_get, mock_delete):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted."
            }
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 2)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='argo.AMS-Check'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertEqual(mock_delete.call_count, 2)
        mock_delete.assert_has_calls([
            call('PROFILE1', ['test.AMS-Check']),
            call('PROFILE2', ['test.AMS-Check'])
        ])

    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_one_metric_templates(self, mock_get, mock_delete):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        data = {'metrictemplates': ['test.AMS-Check']}
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {"info": "Metric template test.AMS-Check successfully deleted."}
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 3)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertEqual(mock_delete.call_count, 2)
        mock_delete.assert_has_calls([
            call('PROFILE1', ['test.AMS-Check']),
            call('PROFILE2', ['test.AMS-Check'])
        ])

    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_get_exception(
            self, mock_get, mock_delete
    ):
        mock_get.side_effect = Exception(
            'Error fetching WEB API data: API key not found'
        )
        mock_delete.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted.",
                "warning": "test: Metrics are not removed from metric "
                           "profiles. Unable to get metric profiles: "
                           "Error fetching WEB API data: API key not found"
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 2)
        metric_history = poem_models.TenantHistory.objects.filter(
            object_id=self.metric.id
        )
        assert self.metric, metric_history

    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_get_requests_exception(
            self, mock_get, mock_delete
    ):
        mock_get.side_effect = requests.exceptions.HTTPError('Exception')
        mock_delete.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted.",
                "warning": "test: Metrics are not removed from metric profiles."
                           " Unable to get metric profiles: Exception"
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        metric_history = poem_models.TenantHistory.objects.filter(
            object_id=self.metric.id
        )
        assert self.metric, metric_history

    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_delete_profile_exception(
            self, mock_get, mock_delete
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = Exception(
            'Error deleting metric from profile: Something went wrong'
        )
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        metric_id = self.metric.id
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted.",
                "warning": "test: Metric test.AMS-Check not deleted "
                           "from profile PROFILE1: Error deleting metric from "
                           "profile: Something went wrong; "
                           "test: Metric test.AMS-Check not deleted from "
                           "profile PROFILE2: Error deleting metric from "
                           "profile: Something went wrong"
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='argo.AMS-Check'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertEqual(mock_delete.call_count, 2)
        mock_delete.assert_has_calls([
            call('PROFILE1', ['test.AMS-Check']),
            call('PROFILE2', ['test.AMS-Check'])
        ])

    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_metric_not_in_profile(
            self, mock_get, mock_delete
    ):
        mock_get.return_value = {}
        mock_delete.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        metric_id = self.metric.id
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted."
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='argo.AMS-Check'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertFalse(mock_delete.called)


class MetricTagsTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTags.as_view()
        self.url = '/api/v2/internal/metrictags/'
        self.user = CustUser.objects.create_user(username='testuser')

        admin_models.MetricTags.objects.create(name='internal')
        admin_models.MetricTags.objects.create(name='deprecated')
        admin_models.MetricTags.objects.create(name='test_tag1')
        admin_models.MetricTags.objects.create(name='test_tag2')

    def test_get_metric_tags(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            ['deprecated', 'internal', 'test_tag1', 'test_tag2']
        )

    def test_get_metric_tags_if_not_auth(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
