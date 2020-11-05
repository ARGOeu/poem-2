import datetime
import json
from unittest.mock import patch, call

import requests
from Poem.api import views_internal as views
from Poem.api.internal_views.utils import sync_webapi, \
    get_tenant_resources
from Poem.api.models import MyAPIKey
from Poem.helpers.history_helpers import create_comment
from Poem.helpers.metrics_helpers import import_metrics, update_metrics, \
    update_metrics_in_profiles, get_metrics_in_profiles, \
    delete_metrics_from_profile
from Poem.helpers.versioned_comments import new_comment
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django.core.management import call_command
from django.db import connection
from django.test.client import encode_multipart
from django.test.testcases import TransactionTestCase
from rest_framework import status
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory
from tenant_schemas.utils import get_public_schema_name, schema_context, \
    get_tenant_model

ALLOWED_TEST_DOMAIN = '.test.com'


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


def encode_data(data):
    content = encode_multipart('BoUnDaRyStRiNg', data)
    content_type = 'multipart/form-data; boundary=BoUnDaRyStRiNg'

    return content, content_type


def mocked_func(*args, **kwargs):
    pass


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


class ListMetricTemplatesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplates.as_view()
        self.url = '/api/v2/internal/metrictemplates/'
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
            version_user=self.user.username,
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
            version_user=self.user.username
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
            version_user=self.user.username
        )

        for schema in [self.tenant.schema_name, get_public_schema_name()]:
            with schema_context(schema):
                if schema == get_public_schema_name():
                    Tenant.objects.create(name='public',
                                          domain_url='public',
                                          schema_name=get_public_schema_name())

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
            version_user=self.user.username,
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
            version_user=self.user.username,
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
            version_user=self.user.username,
            version_comment=create_comment(self.metrictemplate1)
        )
        mt1_history2.tags.add(self.tag3, self.tag4)

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
            user=self.user.username
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
            user=self.user.username
        )

    def test_get_metric_template_list(self):
        request = self.factory.get(self.url)
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

    def test_get_metrictemplate_by_name(self):
        request = self.factory.get(self.url + 'argo.AMS-Check')
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

    def test_get_metric_template_by_nonexisting_name(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Metric template not found'})

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template(self, mocked_inline):
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
        force_authenticate(request, user=self.user)
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
        self.assertEqual(versions[0].version_user, 'testuser')
        self.assertEqual(versions[0].version_comment, 'Initial version.')

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_tag(self, mocked_inline):
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
        force_authenticate(request, user=self.user)
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
        self.assertEqual(versions[0].version_user, 'testuser')
        self.assertEqual(versions[0].version_comment, 'Initial version.')

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_tag(self, mocked_inline):
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
        force_authenticate(request, user=self.user)
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
        self.assertEqual(versions[0].version_user, 'testuser')
        self.assertEqual(versions[0].version_comment, 'Initial version.')

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_existing_name(self, mocked_inline):
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
    def test_post_metric_template_with_nonexisting_probeversion(
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
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                'detail': 'You should choose existing probe version!'
            }
        )

    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_specifying_probes_version(
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
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                'detail': 'You should specify the version of the probe!'
            }
        )

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


class SyncWebApiTests(TenantTestCase):
    def setUp(self):
        ct_mp = ContentType.objects.get_for_model(poem_models.MetricProfiles)
        MyAPIKey.objects.create(
            name='WEB-API',
            token='mocked_token'
        )

        self.mp1 = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.mp2 = poem_models.MetricProfiles.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.mp1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'metricinstances': [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.mp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.mp1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=ct_mp
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.mp2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'metricinstances': [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.mp2.id,
            serialized_data=json.dumps(data),
            object_repr=self.mp2.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=ct_mp
        )

        self.aggr1 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.aggr2 = poem_models.Aggregation.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.tp1 = poem_models.ThresholdsProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.tp2 = poem_models.ThresholdsProfiles.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

    @patch('requests.get')
    def test_sync_webapi_metricprofiles(self, func):
        func.side_effect = mocked_web_api_request
        self.assertEqual(poem_models.MetricProfiles.objects.all().count(), 2)
        sync_webapi('metric_profiles', poem_models.MetricProfiles)
        self.assertEqual(poem_models.MetricProfiles.objects.all().count(), 2)
        self.assertEqual(
            poem_models.MetricProfiles.objects.get(name='TEST_PROFILE'),
            self.mp1
        )
        self.assertRaises(
            poem_models.MetricProfiles.DoesNotExist,
            poem_models.MetricProfiles.objects.get,
            name='ANOTHER-PROFILE'
        )
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.mp2.id
            ).count(), 0
        )
        self.assertTrue(
            poem_models.MetricProfiles.objects.get(name='NEW_PROFILE')
        )
        history = poem_models.TenantHistory.objects.filter(
            object_repr='NEW_PROFILE'
        )
        self.assertEqual(history.count(), 1)
        self.assertEqual(history[0].comment, 'Initial version.')
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], 'NEW_PROFILE')
        self.assertEqual(
            serialized_data['apiid'], '11110000-aaaa-kkkk-aaaa-aaeekkccnnee'
        )
        self.assertEqual(
            serialized_data['metricinstances'],
            [['dg.3GBridge', 'eu.egi.cloud.Swift-CRUD']]
        )

    @patch('requests.get')
    def test_sync_webapi_aggregationprofiles(self, func):
        func.side_effect = mocked_web_api_request
        self.assertEqual(poem_models.Aggregation.objects.all().count(), 2)
        sync_webapi('aggregation_profiles', poem_models.Aggregation)
        self.assertEqual(poem_models.Aggregation.objects.all().count(), 2)
        self.assertEqual(
            poem_models.Aggregation.objects.get(name='TEST_PROFILE'), self.aggr1
        )
        self.assertRaises(
            poem_models.Aggregation.DoesNotExist,
            poem_models.Aggregation.objects.get,
            name='ANOTHER-PROFILE'
        )
        self.assertTrue(poem_models.Aggregation.objects.get(name='NEW_PROFILE'))

    @patch('requests.get')
    def test_sync_webapi_thresholdsprofile(self, func):
        func.side_effect = mocked_web_api_request
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        sync_webapi('thresholds_profiles', poem_models.ThresholdsProfiles)
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE'),
            self.tp1
        )
        self.assertRaises(
            poem_models.ThresholdsProfiles.DoesNotExist,
            poem_models.ThresholdsProfiles.objects.get,
            name='ANOTHER-PROFILE'
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


class ChangePasswordTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ChangePassword.as_view()
        self.url = '/api/v2/internal/change_password'
        self.user1 = CustUser.objects.create_user(
            username='testuser',
            first_name='Test',
            last_name='User',
            email='testuser@example.com',
            date_joined=datetime.datetime(2015, 1, 1, 0, 0, 0)
        )

        self.user2 = CustUser.objects.create(
            username='anotheruser',
            first_name='Another',
            last_name='Test',
            email='anotheruser@example.com',
            date_joined=datetime.datetime(2015, 1, 1, 0, 0, 0)
        )

    def test_change_password(self):
        data = {
            'username': 'testuser',
            'new_password': 'extra-cool-passwd'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = CustUser.objects.get(username=self.user1.username)
        self.assertTrue(user.check_password('extra-cool-passwd'))

    def test_try_change_password_for_different_user(self):
        data = {
            'username': 'anotheruser',
            'new_password': 'extra-cool-passwd'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data['detail'],
            'Trying to change password for another user.'
        )

    def test_change_password_for_nonexisting_user(self):
        data = {
            'username': 'nonexisting',
            'new_password': 'extra-cool-passwd'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user1)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'User not found.')


class MetricsHelpersTests(TransactionTestCase):
    """
    Using TransactionTestCase because of handling of IntegrityError. The extra
    setup steps are taken from TenantTestCase.
    """
    @classmethod
    def add_allowed_test_domain(cls):

        # ALLOWED_HOSTS is a special setting of Django setup_test_environment
        # so we can't modify it with helpers
        if ALLOWED_TEST_DOMAIN not in settings.ALLOWED_HOSTS:
            settings.ALLOWED_HOSTS += [ALLOWED_TEST_DOMAIN]

    @classmethod
    def remove_allowed_test_domain(cls):
        if ALLOWED_TEST_DOMAIN in settings.ALLOWED_HOSTS:
            settings.ALLOWED_HOSTS.remove(ALLOWED_TEST_DOMAIN)

    def tearDown(self):
        connection.set_schema_to_public()
        self.tenant.delete()

        self.remove_allowed_test_domain()
        cursor = connection.cursor()
        cursor.execute('DROP SCHEMA IF EXISTS test CASCADE')

    @classmethod
    def sync_shared(cls):
        call_command('migrate_schemas',
                     schema_name=get_public_schema_name(),
                     interactive=False,
                     verbosity=0)

    def setUp(self):
        self.sync_shared()
        self.add_allowed_test_domain()
        tenant_domain = 'tenant.test.com'
        self.tenant = get_tenant_model()(domain_url=tenant_domain,
                                         schema_name='test',
                                         name='Test')
        self.tenant.save(verbosity=0)

        connection.set_tenant(self.tenant)

        for schema in [self.tenant.schema_name, get_public_schema_name()]:
            with schema_context(schema):
                if schema == get_public_schema_name():
                    Tenant.objects.create(
                        name='public', domain_url='public',
                        schema_name=get_public_schema_name()
                    )

        self.user = CustUser.objects.create_user(username='testuser')

        self.mt_active = admin_models.MetricTemplateType.objects.create(
            name='Active'
        )
        self.mt_passive = admin_models.MetricTemplateType.objects.create(
            name='Passive'
        )

        self.mtag1 = admin_models.MetricTags.objects.create(name='test_tag1')
        self.mtag2 = admin_models.MetricTags.objects.create(name='test_tag2')
        self.mtag3 = admin_models.MetricTags.objects.create(name='test_tag3')

        self.m_active = poem_models.MetricType.objects.create(name='Active')
        self.m_passive = poem_models.MetricType.objects.create(name='Passive')

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

        package4 = admin_models.Package.objects.create(
            name='nagios-plugins-http',
            version='2.2.2'
        )
        package4.repos.add(repo1, repo2)

        package5 = admin_models.Package.objects.create(
            name='nagios-plugins-fedcloud',
            version='0.5.2'
        )
        package5.repos.add(repo1)

        package6 = admin_models.Package.objects.create(
            name='test_package_1',
            version='1.1.0'
        )
        package6.repos.add(repo1, repo2)

        package7 = admin_models.Package.objects.create(
            name='test_package_1',
            version='1.2.0'
        )
        package7.repos.add(repo1, repo2)

        package8 = admin_models.Package.objects.create(
            name='test_package_2',
            version='2.0.0'
        )
        package8.repos.add(repo1, repo2)

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

        self.probeversion1_1 = admin_models.ProbeHistory.objects.create(
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

        probe1.package = package2
        probe1.comment = 'Newer version.'
        probe1.save()

        self.probeversion1_2 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=self.user.username
        )

        probe1.package = package3
        probe1.comment = 'Newest version.'
        probe1.save()

        self.probeversion1_3 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=self.user.username
        )

        probe2 = admin_models.Probe.objects.create(
            name='check_http',
            package=package4,
            description='This plugin tests the HTTP service on the specified '
                        'host.',
            comment='Initial version',
            repository='https://nagios-plugins.org',
            docurl='http://nagios-plugins.org/doc/man/check_http.html'
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
            version_user=self.user.username
        )

        probe3 = admin_models.Probe.objects.create(
            name='novaprobe',
            package=package5,
            description='Probe uses OpenStack Nova interface.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-fedcloud',
            docurl='https://wiki.egi.eu/wiki/Cloud_SAM_tests'
        )

        probeversion3 = admin_models.ProbeHistory.objects.create(
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

        probe4 = admin_models.Probe.objects.create(
            name='swiftprobe',
            package=package5,
            description='Probe uses OpenStack Swift interface.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-fedcloud',
            docurl='https://github.com/ARGOeu/nagios-plugins-fedcloud/blob/'
                   'master/README.md'
        )

        probeversion4 = admin_models.ProbeHistory.objects.create(
            object_id=probe4,
            name=probe4.name,
            package=probe4.package,
            description=probe4.description,
            comment=probe4.comment,
            repository=probe4.repository,
            docurl=probe4.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe5 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            package=package1,
            description='Probe is inspecting AMS publisher.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        self.probeversion5_1 = admin_models.ProbeHistory.objects.create(
            object_id=probe5,
            name=probe5.name,
            package=probe5.package,
            description=probe5.description,
            comment=probe5.comment,
            repository=probe5.repository,
            docurl=probe5.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe5.package = package2
        probe5.comment = 'Newer version.'
        probe5.save()

        self.probeversion5_2 = admin_models.ProbeHistory.objects.create(
            object_id=probe5,
            name=probe5.name,
            package=probe5.package,
            description=probe5.description,
            comment=probe5.comment,
            repository=probe5.repository,
            docurl=probe5.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newer version.',
            version_user=self.user.username
        )

        probe5.package = package3
        probe5.comment = 'Newest version.'
        probe5.save()

        self.probeversion5_3 = admin_models.ProbeHistory.objects.create(
            object_id=probe5,
            name=probe5.name,
            package=probe5.package,
            description=probe5.description,
            comment=probe5.comment,
            repository=probe5.repository,
            docurl=probe5.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newest version.',
            version_user=self.user.username
        )

        probe6 = admin_models.Probe.objects.create(
            name='test-probe',
            package=package6,
            description='Some description.',
            comment='Initial version.',
            repository='https://repo.com',
            docurl='https://documentation.com'
        )

        probeversion6_1 = admin_models.ProbeHistory.objects.create(
            object_id=probe6,
            name=probe6.name,
            package=probe6.package,
            description=probe6.description,
            comment=probe6.comment,
            repository=probe6.repository,
            docurl=probe6.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe6.package = package7
        probe6.comment = 'Newer version.'
        probe6.save()

        probeversion6_2 = admin_models.ProbeHistory.objects.create(
            object_id=probe6,
            name=probe6.name,
            package=probe6.package,
            description=probe6.description,
            comment=probe6.comment,
            repository=probe6.repository,
            docurl=probe6.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newer version.',
            version_user=self.user.username
        )

        probe7 = admin_models.Probe.objects.create(
            name='test-probe-2',
            package=package8,
            description='Description for the probe.',
            comment='Initial version.',
            repository='https://probe-repo.com',
            docurl='https://probe-documentation.com'
        )

        admin_models.ProbeHistory.objects.create(
            object_id=probe7,
            name=probe7.name,
            package=probe7.package,
            description=probe7.description,
            comment=probe7.comment,
            repository=probe7.repository,
            docurl=probe7.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe7.package = package6
        probe7.description = 'Description for the probe, which was changed.'
        probe7.comment = 'Changed version.'
        probe7.save()

        probeversion7_2 = admin_models.ProbeHistory.objects.create(
            object_id=probe7,
            name=probe7.name,
            package=probe7.package,
            description=probe7.description,
            comment=probe7.comment,
            repository=probe7.repository,
            docurl=probe7.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Changed version.',
            version_user=self.user.username
        )

        self.metrictemplate1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=self.mt_active,
            probekey=self.probeversion1_1,
            description='Some description of argo.AMS-Check metric template.',
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        self.metrictemplate1.tags.add(self.mtag1, self.mtag2)

        self.mt1_history1 = admin_models.MetricTemplateHistory.objects.create(
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
            version_user=self.user.username,
            version_comment='Initial version.',
        )
        self.mt1_history1.tags.add(self.mtag1, self.mtag2)

        self.metrictemplate1.probekey = self.probeversion1_2
        self.metrictemplate1.config = '["maxCheckAttempts 4", "timeout 70", ' \
                                      '"path /usr/libexec/argo-monitoring/", ' \
                                      '"interval 5", "retryInterval 3"]'
        self.metrictemplate1.save()
        self.metrictemplate1.tags.add(self.mtag3)

        self.mt1_history2 = admin_models.MetricTemplateHistory.objects.create(
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
            version_user=self.user.username,
            version_comment=create_comment(self.metrictemplate1)
        )
        self.mt1_history2.tags.add(self.mtag1, self.mtag2, self.mtag3)

        self.metrictemplate1.probekey = self.probeversion1_3
        self.metrictemplate1.save()

        self.mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
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
            version_user=self.user.username,
            version_comment=create_comment(self.metrictemplate1)
        )
        self.mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)

        self.metrictemplate2 = admin_models.MetricTemplate.objects.create(
            name='org.nagios.CertLifetime',
            mtype=self.mt_active,
            probekey=probeversion2,
            probeexecutable='check_http',
            config='["maxCheckAttempts 2", "timeout 60", '
                   '"path $USER1$", "interval 240", "retryInterval 30"]',
            attribute='["NAGIOS_HOST_CERT -J", "NAGIOS_HOST_KEY -K"]',
            parameter='["-C 30", "--sni "]',
            flags='["OBSESS 1"]'
        )
        self.metrictemplate2.tags.add(self.mtag2)

        mt2_history1 = admin_models.MetricTemplateHistory.objects.create(
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
            version_user=self.user.username,
            version_comment='Initial version.',
        )
        mt2_history1.tags.add(self.mtag2)

        self.metrictemplate3 = admin_models.MetricTemplate.objects.create(
            name='eu.egi.cloud.OpenStack-VM',
            mtype=self.mt_active,
            probekey=probeversion3,
            probeexecutable='novaprobe.py',
            config='["maxCheckAttempts 2", "timeout 300", '
                   '"path /usr/libexec/argo-monitoring/probes/fedcloud", '
                   '"interval 60", "retryInterval 15"]',
            attribute='["OIDC_ACCESS_TOKEN --access-token", '
                      '"OS_APPDB_IMAGE --appdb-image", '
                      '"OS_KEYSTONE_URL --endpoint", "X509_USER_PROXY --cert"]',
            dependency='["hr.srce.GridProxy-Valid 0", '
                       '"org.nagios.Keystone-TCP 1"]',
            parameter='["-v "]',
            flags='["VO 1", "NOHOSTNAME 1", "OBSESS 1"]'
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate3,
            name=self.metrictemplate3.name,
            mtype=self.metrictemplate3.mtype,
            probekey=self.metrictemplate3.probekey,
            description=self.metrictemplate3.description,
            parent=self.metrictemplate3.parent,
            probeexecutable=self.metrictemplate3.probeexecutable,
            config=self.metrictemplate3.config,
            attribute=self.metrictemplate3.attribute,
            dependency=self.metrictemplate3.dependency,
            flags=self.metrictemplate3.flags,
            files=self.metrictemplate3.files,
            parameter=self.metrictemplate3.parameter,
            fileparameter=self.metrictemplate3.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user='testuser'
        )

        self.metrictemplate4 = admin_models.MetricTemplate.objects.create(
            name='eu.egi.cloud.OpenStack-Swift',
            mtype=self.mt_active,
            probekey=probeversion4,
            probeexecutable='swiftprobe.py',
            config='["maxCheckAttempts 2", "timeout 300", '
                   '"path /usr/libexec/argo-monitoring/probes/fedcloud", '
                   '"interval 60", "retryInterval 15"]',
            attribute='["OS_KEYSTONE_URL --endpoint", '
                      '"OIDC_ACCESS_TOKEN --access-token"]',
            dependency='["hr.srce.GridProxy-Valid 0", '
                       '"org.nagios.Keystone-TCP 1"]',
            flags='["NOHOSTNAME 1", "OBSESS 1"]'
        )
        self.metrictemplate4.tags.add(self.mtag3)

        mt4_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate4,
            name=self.metrictemplate4.name,
            mtype=self.metrictemplate4.mtype,
            probekey=self.metrictemplate4.probekey,
            description=self.metrictemplate4.description,
            parent=self.metrictemplate4.parent,
            probeexecutable=self.metrictemplate4.probeexecutable,
            config=self.metrictemplate4.config,
            attribute=self.metrictemplate4.attribute,
            dependency=self.metrictemplate4.dependency,
            flags=self.metrictemplate4.flags,
            files=self.metrictemplate4.files,
            parameter=self.metrictemplate4.parameter,
            fileparameter=self.metrictemplate4.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user='testuser'
        )
        mt4_history1.tags.add(self.mtag3)

        self.metrictemplate5 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=self.mt_passive
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate5,
            name=self.metrictemplate5.name,
            mtype=self.metrictemplate5.mtype,
            description=self.metrictemplate5.description,
            probekey=self.metrictemplate5.probekey,
            probeexecutable=self.metrictemplate5.probeexecutable,
            config=self.metrictemplate5.config,
            attribute=self.metrictemplate5.attribute,
            dependency=self.metrictemplate5.dependency,
            flags=self.metrictemplate5.flags,
            files=self.metrictemplate5.files,
            parameter=self.metrictemplate5.parameter,
            fileparameter=self.metrictemplate5.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )

        self.metrictemplate6 = admin_models.MetricTemplate.objects.create(
            name='org.nagios.CertLifetime2',
            mtype=self.mt_active,
            probekey=probeversion2,
            probeexecutable='check_http',
            config='["maxCheckAttempts 4", "timeout 70", '
                   '"path $USER1$", "interval 240", "retryInterval 30"]',
            attribute='["NAGIOS_HOST_CERT -J", "NAGIOS_HOST_KEY -K"]',
            parameter='["-C 30", "--sni "]',
            flags='["OBSESS 1"]'
        )
        self.metrictemplate6.tags.add(self.mtag1, self.mtag2)

        mt6_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate6,
            name=self.metrictemplate6.name,
            mtype=self.metrictemplate6.mtype,
            description=self.metrictemplate6.description,
            probekey=self.metrictemplate6.probekey,
            probeexecutable=self.metrictemplate6.probeexecutable,
            config=self.metrictemplate6.config,
            attribute=self.metrictemplate6.attribute,
            dependency=self.metrictemplate6.dependency,
            flags=self.metrictemplate6.flags,
            files=self.metrictemplate6.files,
            parameter=self.metrictemplate6.parameter,
            fileparameter=self.metrictemplate6.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )
        mt6_history1.tags.add(self.mtag1, self.mtag2)

        self.metrictemplate7 = admin_models.MetricTemplate.objects.create(
            name='eu.egi.sec.ARC-CE-result',
            flags='["OBSESS 0", "PASSIVE 1", "VO 1"]',
            mtype=self.mt_passive,
            parent='eu.egi.sec.ARC-CE-submit'
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate7,
            name=self.metrictemplate7.name,
            mtype=self.metrictemplate7.mtype,
            description=self.metrictemplate7.description,
            probekey=self.metrictemplate7.probekey,
            probeexecutable=self.metrictemplate7.probeexecutable,
            config=self.metrictemplate7.config,
            attribute=self.metrictemplate7.attribute,
            dependency=self.metrictemplate7.dependency,
            flags=self.metrictemplate7.flags,
            files=self.metrictemplate7.files,
            parameter=self.metrictemplate7.parameter,
            fileparameter=self.metrictemplate7.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )

        self.metrictemplate8 = admin_models.MetricTemplate.objects.create(
            name='argo.AMSPublisher-Check',
            mtype=self.mt_active,
            probekey=self.probeversion5_1,
            description='Some description of publisher metric.',
            probeexecutable='ams-publisher-probe',
            config='["maxCheckAttempts 1", "timeout 120",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 180", "retryInterval 1"]',
            parameter='["-s /var/run/argo-nagios-ams-publisher/sock"]',
            flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
        )
        self.metrictemplate8.tags.add(self.mtag1)

        self.mt8_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate8,
            name=self.metrictemplate8.name,
            mtype=self.metrictemplate8.mtype,
            probekey=self.metrictemplate8.probekey,
            description=self.metrictemplate8.description,
            probeexecutable=self.metrictemplate8.probeexecutable,
            config=self.metrictemplate8.config,
            attribute=self.metrictemplate8.attribute,
            dependency=self.metrictemplate8.dependency,
            flags=self.metrictemplate8.flags,
            files=self.metrictemplate8.files,
            parameter=self.metrictemplate8.parameter,
            fileparameter=self.metrictemplate8.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )
        self.mt8_history1.tags.add(self.mtag1)

        self.metrictemplate8.probekey = self.probeversion5_2
        self.metrictemplate8.save()

        self.mt8_history2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate8,
            name=self.metrictemplate8.name,
            mtype=self.metrictemplate8.mtype,
            probekey=self.metrictemplate8.probekey,
            description=self.metrictemplate8.description,
            probeexecutable=self.metrictemplate8.probeexecutable,
            config=self.metrictemplate8.config,
            attribute=self.metrictemplate8.attribute,
            dependency=self.metrictemplate8.dependency,
            flags=self.metrictemplate8.flags,
            files=self.metrictemplate8.files,
            parameter=self.metrictemplate8.parameter,
            fileparameter=self.metrictemplate8.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newer version.'
        )
        self.mt8_history2.tags.add(self.mtag1)

        self.metrictemplate8.probekey = self.probeversion5_3
        self.metrictemplate8.parameter = ''
        self.metrictemplate8.save()
        self.metrictemplate8.tags.remove(self.mtag1)
        self.metrictemplate8.tags.add(self.mtag2)

        self.mt8_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate8,
            name=self.metrictemplate8.name,
            mtype=self.metrictemplate8.mtype,
            probekey=self.metrictemplate8.probekey,
            description=self.metrictemplate8.description,
            probeexecutable=self.metrictemplate8.probeexecutable,
            config=self.metrictemplate8.config,
            attribute=self.metrictemplate8.attribute,
            dependency=self.metrictemplate8.dependency,
            flags=self.metrictemplate8.flags,
            files=self.metrictemplate8.files,
            parameter=self.metrictemplate8.parameter,
            fileparameter=self.metrictemplate8.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.',
        )
        self.mt8_history3.tags.add(self.mtag2)

        self.metrictemplate9 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check-Old',
            mtype=self.mt_active,
            probekey=self.probeversion1_1,
            description='Some description of argo.AMS-Check metric template.',
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        self.mt9_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate9,
            name=self.metrictemplate9.name,
            mtype=self.metrictemplate9.mtype,
            probekey=self.metrictemplate9.probekey,
            description=self.metrictemplate9.description,
            probeexecutable=self.metrictemplate9.probeexecutable,
            config=self.metrictemplate9.config,
            attribute=self.metrictemplate9.attribute,
            dependency=self.metrictemplate9.dependency,
            flags=self.metrictemplate9.flags,
            files=self.metrictemplate9.files,
            parameter=self.metrictemplate9.parameter,
            fileparameter=self.metrictemplate9.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )

        metrictemplate10 = admin_models.MetricTemplate.objects.create(
            name='test.Metric-Template',
            mtype=self.mt_active,
            probekey=probeversion6_1,
            description='Metric template for testing probe.',
            probeexecutable='["test-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /path", "interval 5", "retryInterval 3"]'
        )
        metrictemplate10.tags.add(self.mtag1)

        mt10_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate10,
            name=metrictemplate10.name,
            mtype=metrictemplate10.mtype,
            probekey=metrictemplate10.probekey,
            description=metrictemplate10.description,
            probeexecutable=metrictemplate10.probeexecutable,
            config=metrictemplate10.config,
            attribute=metrictemplate10.attribute,
            dependency=metrictemplate10.dependency,
            flags=metrictemplate10.flags,
            files=metrictemplate10.files,
            parameter=metrictemplate10.parameter,
            fileparameter=metrictemplate10.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )
        mt10_history1.tags.add(self.mtag1)

        metrictemplate10.probekey = probeversion6_2
        metrictemplate10.save()

        self.mt10_history2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate10,
            name=metrictemplate10.name,
            mtype=metrictemplate10.mtype,
            probekey=metrictemplate10.probekey,
            description=metrictemplate10.description,
            probeexecutable=metrictemplate10.probeexecutable,
            config=metrictemplate10.config,
            attribute=metrictemplate10.attribute,
            dependency=metrictemplate10.dependency,
            flags=metrictemplate10.flags,
            files=metrictemplate10.files,
            parameter=metrictemplate10.parameter,
            fileparameter=metrictemplate10.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newer version.'
        )
        mt10_history1.tags.add(self.mtag1)

        metrictemplate11 = admin_models.MetricTemplate.objects.create(
            name='test.MetricTemplate',
            mtype=self.mt_active,
            probekey=probeversion7_2,
            description='Metric template for something.',
            probeexecutable='["test-probe-2"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /path", "interval 5", "retryInterval 3"]',
            attribute='["attribute1 lower", "attribute2 bigger"]',
            dependency='["depend none"]',
            parameter='["-y yes", "-n no"]',
            flags='["OBSESS 1"]',
            parent='["test.Metric-Template"]'
        )
        metrictemplate11.tags.add(self.mtag1, self.mtag2)

        admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate11,
            name=metrictemplate11.name,
            mtype=metrictemplate11.mtype,
            probekey=metrictemplate11.probekey,
            description=metrictemplate11.description,
            probeexecutable=metrictemplate11.probeexecutable,
            config=metrictemplate11.config,
            attribute=metrictemplate11.attribute,
            dependency=metrictemplate11.dependency,
            flags=metrictemplate11.flags,
            files=metrictemplate11.files,
            parameter=metrictemplate11.parameter,
            fileparameter=metrictemplate11.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )
        mt10_history1.tags.add(self.mtag1, self.mtag2)

        self.group = poem_models.GroupOfMetrics.objects.create(
            name=self.tenant.name.upper()
        )
        self.ct = ContentType.objects.get_for_model(poem_models.Metric)

        self.metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            group=self.group,
            mtype=self.m_active,
            probekey=self.probeversion1_2,
            description='Some description of argo.AMS-Check metric template.',
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 4", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 2"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        self.metric1.tags.add(self.mtag1, self.mtag2, self.mtag3)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric1.__str__(),
            content_type=self.ct,
            comment='Initial version.',
            user='testuser'
        )

        self.metric2 = poem_models.Metric.objects.create(
            name=self.metrictemplate2.name,
            group=self.group,
            mtype=self.m_active,
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
        self.metric2.tags.add(self.mtag2)

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
            user=self.user.username
        )

        self.metric3 = poem_models.Metric.objects.create(
            name=self.metrictemplate4.name,
            group=self.group,
            mtype=self.m_active,
            description=self.metrictemplate4.description,
            probekey=self.metrictemplate4.probekey,
            probeexecutable=self.metrictemplate4.probeexecutable,
            config='["maxCheckAttempts 3", "timeout 300", '
                   '"path /usr/libexec/argo-monitoring/probes/fedcloud", '
                   '"interval 80", "retryInterval 15"]',
            attribute=self.metrictemplate4.attribute,
            dependancy=self.metrictemplate4.dependency,
            flags=self.metrictemplate4.flags,
            files=self.metrictemplate4.files,
            parameter=self.metrictemplate4.parameter,
            fileparameter=self.metrictemplate4.fileparameter
        )
        self.metric3.tags.add(self.mtag3)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric3.id,
            object_repr=self.metric3.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric3],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.metric4 = poem_models.Metric.objects.create(
            name=self.metrictemplate5.name,
            group=self.group,
            mtype=self.m_passive,
            description=self.metrictemplate5.description,
            probekey=self.metrictemplate5.probekey,
            probeexecutable=self.metrictemplate5.probeexecutable,
            config=self.metrictemplate5.config,
            attribute=self.metrictemplate5.attribute,
            dependancy=self.metrictemplate5.dependency,
            flags=self.metrictemplate5.flags,
            files=self.metrictemplate5.files,
            parameter=self.metrictemplate5.parameter,
            fileparameter=self.metrictemplate5.fileparameter,
        )

        poem_models.TenantHistory.objects.create(
            object_id=self.metric4.id,
            object_repr=self.metric4.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric4],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.metric5 = poem_models.Metric.objects.create(
            name=metrictemplate10.name,
            group=self.group,
            mtype=self.m_active,
            description=metrictemplate10.description,
            probekey=metrictemplate10.probekey,
            probeexecutable=metrictemplate10.probeexecutable,
            config=metrictemplate10.config,
            attribute=metrictemplate10.attribute,
            dependancy=metrictemplate10.dependency,
            flags=metrictemplate10.flags,
            files=metrictemplate10.files,
            parameter=metrictemplate10.parameter,
            fileparameter=metrictemplate10.fileparameter,
        )
        self.metric5.tags.add(self.mtag1, self.mtag2)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric5.id,
            object_repr=self.metric5.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric5],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

    def test_import_active_metrics_successfully(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['eu.egi.cloud.OpenStack-VM', 'org.nagios.CertLifetime2'],
            self.tenant, self.user
        )
        self.assertEqual(
            success, ['eu.egi.cloud.OpenStack-VM', 'org.nagios.CertLifetime2']
        )
        self.assertEqual(warning, [])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 7)
        metric1 = poem_models.Metric.objects.get(
            name='eu.egi.cloud.OpenStack-VM'
        )
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        metric2 = poem_models.Metric.objects.get(
            name='org.nagios.CertLifetime2'
        )
        history2 = poem_models.TenantHistory.objects.filter(
            object_id=metric2.id
        ).order_by('-date_created')
        serialized_data2 = json.loads(history2[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metrictemplate3.name)
        self.assertEqual(metric1.mtype, self.m_active)
        self.assertEqual(len(metric1.tags.all()), 0)
        self.assertEqual(metric1.group, self.group)
        self.assertEqual(metric1.description, self.metrictemplate3.description)
        self.assertEqual(metric1.probekey, self.metrictemplate3.probekey)
        self.assertEqual(
            metric1.probeexecutable, self.metrictemplate3.probeexecutable
        )
        self.assertEqual(metric1.config, self.metrictemplate3.config)
        self.assertEqual(metric1.attribute, self.metrictemplate3.attribute)
        self.assertEqual(metric1.dependancy, self.metrictemplate3.dependency)
        self.assertEqual(metric1.flags, self.metrictemplate3.flags)
        self.assertEqual(metric1.files, self.metrictemplate3.files)
        self.assertEqual(metric1.parameter, self.metrictemplate3.parameter)
        self.assertEqual(
            metric1.fileparameter, self.metrictemplate3.fileparameter
        )
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(serialized_data1['mtype'][0], metric1.mtype.name)
        self.assertEqual(serialized_data1['tags'], [])
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(serialized_data1['description'], metric1.description)
        self.assertEqual(
            serialized_data1['probekey'],
            [metric1.probekey.name, metric1.probekey.package.version]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'], metric1.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(serialized_data1['attribute'], metric1.attribute)
        self.assertEqual(serialized_data1['dependancy'], metric1.dependancy)
        self.assertEqual(serialized_data1['flags'], metric1.flags)
        self.assertEqual(serialized_data1['files'], metric1.files)
        self.assertEqual(serialized_data1['parameter'], metric1.parameter)
        self.assertEqual(
            serialized_data1['fileparameter'], metric1.fileparameter
        )
        self.assertEqual(history2.count(), 1)
        self.assertEqual(metric2.name, self.metrictemplate6.name)
        self.assertEqual(metric2.mtype, self.m_active)
        self.assertEqual(len(metric2.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric2.tags.all())
        self.assertTrue(self.mtag2 in metric2.tags.all())
        self.assertEqual(metric2.group, self.group)
        self.assertEqual(metric2.description, self.metrictemplate6.description)
        self.assertEqual(metric2.probekey, self.metrictemplate6.probekey)
        self.assertEqual(
            metric2.probeexecutable, self.metrictemplate6.probeexecutable
        )
        self.assertEqual(metric2.config, self.metrictemplate6.config)
        self.assertEqual(metric2.attribute, self.metrictemplate6.attribute)
        self.assertEqual(metric2.dependancy, self.metrictemplate6.dependency)
        self.assertEqual(metric2.flags, self.metrictemplate6.flags)
        self.assertEqual(metric2.files, self.metrictemplate6.files)
        self.assertEqual(metric2.parameter, self.metrictemplate6.parameter)
        self.assertEqual(
            metric2.fileparameter, self.metrictemplate6.fileparameter
        )
        self.assertEqual(serialized_data2['name'], metric2.name)
        self.assertEqual(serialized_data2['mtype'][0], metric2.mtype.name)
        self.assertEqual(
            serialized_data2['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data2['group'][0], metric2.group.name)
        self.assertEqual(serialized_data2['description'], metric2.description)
        self.assertEqual(
            serialized_data2['probekey'],
            [metric2.probekey.name, metric2.probekey.package.version]
        )
        self.assertEqual(
            serialized_data2['probeexecutable'], metric2.probeexecutable
        )
        self.assertEqual(serialized_data2['config'], metric2.config)
        self.assertEqual(serialized_data2['attribute'], metric2.attribute)
        self.assertEqual(serialized_data2['dependancy'], metric2.dependancy)
        self.assertEqual(serialized_data2['flags'], metric2.flags)
        self.assertEqual(serialized_data2['files'], metric2.files)
        self.assertEqual(serialized_data2['parameter'], metric2.parameter)
        self.assertEqual(
            serialized_data2['fileparameter'], metric2.fileparameter
        )

    def test_import_passive_metric_successfully(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['eu.egi.sec.ARC-CE-result'], self.tenant, self.user
        )
        self.assertEqual(success, ['eu.egi.sec.ARC-CE-result'])
        self.assertEqual(warning, [])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        metric1 = poem_models.Metric.objects.get(
            name='eu.egi.sec.ARC-CE-result'
        )
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metrictemplate7.name)
        self.assertEqual(metric1.mtype, self.m_passive)
        self.assertEqual(len(metric1.tags.all()), 0)
        self.assertEqual(metric1.group, self.group)
        self.assertEqual(metric1.description, self.metrictemplate7.description)
        self.assertEqual(metric1.probekey, self.metrictemplate7.probekey)
        self.assertEqual(
            metric1.probeexecutable, self.metrictemplate7.probeexecutable
        )
        self.assertEqual(metric1.config, self.metrictemplate7.config)
        self.assertEqual(metric1.attribute, self.metrictemplate7.attribute)
        self.assertEqual(metric1.dependancy, self.metrictemplate7.dependency)
        self.assertEqual(metric1.flags, self.metrictemplate7.flags)
        self.assertEqual(metric1.files, self.metrictemplate7.files)
        self.assertEqual(metric1.parameter, self.metrictemplate7.parameter)
        self.assertEqual(
            metric1.fileparameter, self.metrictemplate7.fileparameter
        )
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(serialized_data1['mtype'][0], metric1.mtype.name)
        self.assertEqual(serialized_data1['tags'], [])
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(serialized_data1['description'], metric1.description)
        self.assertEqual(serialized_data1['probekey'], None)
        self.assertEqual(
            serialized_data1['probeexecutable'], metric1.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(serialized_data1['attribute'], metric1.attribute)
        self.assertEqual(serialized_data1['dependancy'], metric1.dependancy)
        self.assertEqual(serialized_data1['flags'], metric1.flags)
        self.assertEqual(serialized_data1['files'], metric1.files)
        self.assertEqual(serialized_data1['parameter'], metric1.parameter)
        self.assertEqual(
            serialized_data1['fileparameter'], metric1.fileparameter
        )

    def test_import_active_metric_with_warning(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['argo.AMSPublisher-Check'], self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, ['argo.AMSPublisher-Check'])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        metric1 = poem_models.Metric.objects.get(
            name='argo.AMSPublisher-Check'
        )
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.mt8_history2.name)
        self.assertEqual(metric1.mtype, self.m_active)
        self.assertEqual(len(metric1.tags.all()), 1)
        self.assertTrue(self.mtag1 in metric1.tags.all())
        self.assertEqual(metric1.group, self.group)
        self.assertEqual(metric1.description, self.mt8_history2.description)
        self.assertEqual(metric1.probekey, self.mt8_history2.probekey)
        self.assertEqual(
            metric1.probeexecutable, self.mt8_history2.probeexecutable
        )
        self.assertEqual(metric1.config, self.mt8_history2.config)
        self.assertEqual(metric1.attribute, self.mt8_history2.attribute)
        self.assertEqual(metric1.dependancy, self.mt8_history2.dependency)
        self.assertEqual(metric1.flags, self.mt8_history2.flags)
        self.assertEqual(metric1.files, self.mt8_history2.files)
        self.assertEqual(metric1.parameter, self.mt8_history2.parameter)
        self.assertEqual(
            metric1.fileparameter, self.mt8_history2.fileparameter
        )
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(serialized_data1['mtype'][0], metric1.mtype.name)
        self.assertEqual(serialized_data1['tags'], [['test_tag1']])
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(serialized_data1['description'], metric1.description)
        self.assertEqual(
            serialized_data1['probekey'],
            [metric1.probekey.name, metric1.probekey.package.version]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'], metric1.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(serialized_data1['attribute'], metric1.attribute)
        self.assertEqual(serialized_data1['dependancy'], metric1.dependancy)
        self.assertEqual(serialized_data1['flags'], metric1.flags)
        self.assertEqual(serialized_data1['files'], metric1.files)
        self.assertEqual(serialized_data1['parameter'], metric1.parameter)
        self.assertEqual(
            serialized_data1['fileparameter'], metric1.fileparameter
        )

    def test_import_active_metric_if_package_already_exists_with_diff_version(
            self
    ):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['test.Metric-Template', 'test.MetricTemplate'],
            self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, [])
        self.assertEqual(error, ['test.Metric-Template'])
        self.assertEqual(unavailable, ['test.MetricTemplate'])
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        metric1 = poem_models.Metric.objects.get(name='test.Metric-Template')
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metric5.name)
        self.assertEqual(metric1.mtype, self.metric5.mtype)
        self.assertEqual(metric1.tags, self.metric5.tags)
        self.assertEqual(metric1.group, self.metric5.group)
        self.assertEqual(metric1.description, self.metric5.description)
        self.assertEqual(metric1.probekey, self.metric5.probekey)
        self.assertEqual(
            metric1.probeexecutable, self.metric5.probeexecutable
        )
        self.assertEqual(metric1.config, self.metric5.config)
        self.assertEqual(metric1.attribute, self.metric5.attribute)
        self.assertEqual(metric1.dependancy, self.metric5.dependancy)
        self.assertEqual(metric1.flags, self.metric5.flags)
        self.assertEqual(metric1.files, self.metric5.files)
        self.assertEqual(metric1.parameter, self.metric5.parameter)
        self.assertEqual(
            metric1.fileparameter, self.metric5.fileparameter
        )
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(serialized_data1['mtype'][0], metric1.mtype.name)
        self.assertEqual(
            serialized_data1['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(serialized_data1['description'], metric1.description)
        self.assertEqual(
            serialized_data1['probekey'],
            [metric1.probekey.name, metric1.probekey.package.version]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'], metric1.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(serialized_data1['attribute'], metric1.attribute)
        self.assertEqual(serialized_data1['dependancy'], metric1.dependancy)
        self.assertEqual(serialized_data1['flags'], metric1.flags)
        self.assertEqual(serialized_data1['files'], metric1.files)
        self.assertEqual(serialized_data1['parameter'], metric1.parameter)
        self.assertEqual(
            serialized_data1['fileparameter'], metric1.fileparameter
        )
        poem_models.Metric.objects.get(name='argo.AMS-Check')
        poem_models.Metric.objects.get(name='org.nagios.CertLifetime')
        poem_models.Metric.objects.get(name='eu.egi.cloud.OpenStack-Swift')
        poem_models.Metric.objects.get(name='org.apel.APEL-Pub')
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.MetricTemplate'
        )

    def test_import_active_metrics_with_error(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['argo.AMS-Check', 'org.nagios.CertLifetime'],
            self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, [])
        self.assertEqual(error, ['argo.AMS-Check', 'org.nagios.CertLifetime'])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metric1.name)
        self.assertEqual(metric1.mtype, self.metric1.mtype)
        self.assertEqual(metric1.tags, self.metric1.tags)
        self.assertEqual(metric1.group, self.metric1.group)
        self.assertEqual(metric1.description, self.metric1.description)
        self.assertEqual(metric1.probekey, self.metric1.probekey)
        self.assertEqual(
            metric1.probeexecutable, self.metric1.probeexecutable
        )
        self.assertEqual(metric1.config, self.metric1.config)
        self.assertEqual(metric1.attribute, self.metric1.attribute)
        self.assertEqual(metric1.dependancy, self.metric1.dependancy)
        self.assertEqual(metric1.flags, self.metric1.flags)
        self.assertEqual(metric1.files, self.metric1.files)
        self.assertEqual(metric1.parameter, self.metric1.parameter)
        self.assertEqual(
            metric1.fileparameter, self.metric1.fileparameter
        )
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(serialized_data1['mtype'][0], metric1.mtype.name)
        self.assertEqual(
            serialized_data1['tags'],
            [['test_tag1'], ['test_tag2'], ['test_tag3']]
        )
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(serialized_data1['description'], metric1.description)
        self.assertEqual(
            serialized_data1['probekey'],
            [metric1.probekey.name, metric1.probekey.package.version]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'], metric1.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(serialized_data1['attribute'], metric1.attribute)
        self.assertEqual(serialized_data1['dependancy'], metric1.dependancy)
        self.assertEqual(serialized_data1['flags'], metric1.flags)
        self.assertEqual(serialized_data1['files'], metric1.files)
        self.assertEqual(serialized_data1['parameter'], metric1.parameter)
        self.assertEqual(
            serialized_data1['fileparameter'], metric1.fileparameter
        )
        metric2 = poem_models.Metric.objects.get(
            name='org.nagios.CertLifetime'
        )
        history2 = poem_models.TenantHistory.objects.filter(
            object_id=metric2.id
        ).order_by('-date_created')
        serialized_data2 = json.loads(history2[0].serialized_data)[0]['fields']
        self.assertEqual(history2.count(), 1)
        self.assertEqual(metric2.name, self.metric2.name)
        self.assertEqual(metric2.mtype, self.metric2.mtype)
        self.assertEqual(metric2.tags, self.metric2.tags)
        self.assertEqual(metric2.group, self.metric2.group)
        self.assertEqual(metric2.description, self.metric2.description)
        self.assertEqual(metric2.probekey, self.metric2.probekey)
        self.assertEqual(
            metric2.probeexecutable, self.metric2.probeexecutable
        )
        self.assertEqual(metric2.config, self.metric2.config)
        self.assertEqual(metric2.attribute, self.metric2.attribute)
        self.assertEqual(metric2.dependancy, self.metric2.dependancy)
        self.assertEqual(metric2.flags, self.metric2.flags)
        self.assertEqual(metric2.files, self.metric2.files)
        self.assertEqual(metric2.parameter, self.metric2.parameter)
        self.assertEqual(
            metric2.fileparameter, self.metric2.fileparameter
        )
        self.assertEqual(serialized_data2['name'], metric2.name)
        self.assertEqual(serialized_data2['mtype'][0], metric2.mtype.name)
        self.assertEqual(serialized_data2['tags'], [['test_tag2']])
        self.assertEqual(serialized_data2['group'][0], metric2.group.name)
        self.assertEqual(serialized_data2['description'], metric2.description)
        self.assertEqual(
            serialized_data2['probekey'],
            [metric2.probekey.name, metric2.probekey.package.version]
        )
        self.assertEqual(
            serialized_data2['probeexecutable'], metric2.probeexecutable
        )
        self.assertEqual(serialized_data2['config'], metric2.config)
        self.assertEqual(serialized_data2['attribute'], metric2.attribute)
        self.assertEqual(serialized_data2['dependancy'], metric2.dependancy)
        self.assertEqual(serialized_data2['flags'], metric2.flags)
        self.assertEqual(serialized_data2['files'], metric2.files)
        self.assertEqual(serialized_data2['parameter'], metric2.parameter)
        self.assertEqual(
            serialized_data2['fileparameter'], metric2.fileparameter
        )

    def test_import_metric_older_version_than_tenants_package(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['argo.AMS-Check-Old'], self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, [])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, ['argo.AMS-Check-Old'])
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        poem_models.Metric.objects.get(name='argo.AMS-Check')
        poem_models.Metric.objects.get(name='org.nagios.CertLifetime')
        poem_models.Metric.objects.get(name='eu.egi.cloud.OpenStack-Swift')
        poem_models.Metric.objects.get(name='org.apel.APEL-Pub')
        poem_models.Metric.objects.get(name='test.Metric-Template')
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='argo.AMS-Check-Old'
        )

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_active_metrics(self, mock_update):
        mock_update.return_value = []
        metrictemplate = admin_models.MetricTemplate.objects.get(
            id=self.metrictemplate1.id
        )
        metrictemplate.name = 'argo.AMS-Check-new'
        metrictemplate.mtype = self.mt_active
        metrictemplate.description = 'New description for the metric.'
        metrictemplate.probekey = self.probeversion1_2
        metrictemplate.parent = 'argo.AMS-Check'
        metrictemplate.probeexecutable = 'ams-probe'
        metrictemplate.config = \
            '["maxCheckAttempts 4", "timeout 70", ' \
            '"path /usr/libexec/argo-monitoring/probes/argo", ' \
            '"interval 6", "retryInterval 4"]'
        metrictemplate.attribute = '[argo.ams_TOKEN2 --token]'
        metrictemplate.dependency = '["dep-key dep-val"]'
        metrictemplate.parameter = '["par-key par-val"]'
        metrictemplate.flags = '["flag-key flag-val"]'
        metrictemplate.files = '["file-key file-val"]'
        metrictemplate.fileparameter = '["fp-key fp-val"]'
        metrictemplate.save()
        metrictemplate.tags.remove(self.mtag2)
        update_metrics(
            metrictemplate, 'argo.AMS-Check', self.probeversion1_2
        )
        mock_update.assert_called_once()
        mock_update.assert_has_calls([
            call('argo.AMS-Check', 'argo.AMS-Check-new')
        ])
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 1)
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(metric.mtype.name, metrictemplate.mtype.name)
        self.assertEqual(len(metric.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag3 in metric.tags.all())
        self.assertEqual(metric.probekey, metrictemplate.probekey)
        self.assertEqual(metric.description, metrictemplate.description)
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, metrictemplate.parent)
        self.assertEqual(metric.probeexecutable, metrictemplate.probeexecutable)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 2"]'
        )
        self.assertEqual(metric.attribute, metrictemplate.attribute)
        self.assertEqual(metric.dependancy, metrictemplate.dependency)
        self.assertEqual(metric.flags, metrictemplate.flags)
        self.assertEqual(metric.files, metrictemplate.files)
        self.assertEqual(metric.parameter, metrictemplate.parameter)
        self.assertEqual(metric.fileparameter, metrictemplate.fileparameter)
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag3']]
        )
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(
            serialized_data['probekey'],
            [metric.probekey.name, metric.probekey.package.version]
        )
        self.assertEqual(serialized_data['group'], ['TEST'])
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

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_passive_metrics(self, mock_update):
        mock_update.return_value = []
        metrictemplate = admin_models.MetricTemplate.objects.get(
            id=self.metrictemplate5.id
        )
        metrictemplate.name = 'org.apel.APEL-Pub-new'
        metrictemplate.mtype = self.mt_passive
        metrictemplate.description = 'Added description for ' \
                                     'org.apel.APEL-Pub-new.'
        metrictemplate.probekey = None
        metrictemplate.parent = ''
        metrictemplate.probeexecutable = ''
        metrictemplate.config = ''
        metrictemplate.attribute = ''
        metrictemplate.dependency = ''
        metrictemplate.parameter = ''
        metrictemplate.flags = '["PASSIVE 1"]'
        metrictemplate.files = ''
        metrictemplate.fileparameter = ''
        metrictemplate.save()
        metrictemplate.tags.add(self.mtag1)
        update_metrics(metrictemplate, 'org.apel.APEL-Pub', None)
        mock_update.assert_called_once()
        mock_update.assert_has_calls([
            call('org.apel.APEL-Pub', 'org.apel.APEL-Pub-new')
        ])
        metric = poem_models.Metric.objects.get(id=self.metric4.id)
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 1)
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(metric.mtype.name, metrictemplate.mtype.name)
        self.assertEqual(len(metric.tags.all()), 1)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertEqual(metric.probekey, metrictemplate.probekey)
        self.assertEqual(metric.description, metrictemplate.description)
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, metrictemplate.parent)
        self.assertEqual(metric.probeexecutable,
                         metrictemplate.probeexecutable)
        self.assertEqual(metric.config, '')
        self.assertEqual(metric.attribute, metrictemplate.attribute)
        self.assertEqual(metric.dependancy, metrictemplate.dependency)
        self.assertEqual(metric.flags, metrictemplate.flags)
        self.assertEqual(metric.files, metrictemplate.files)
        self.assertEqual(metric.parameter, metrictemplate.parameter)
        self.assertEqual(metric.fileparameter, metrictemplate.fileparameter)
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(serialized_data['tags'], [['test_tag1']])
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(serialized_data['probekey'], None)
        self.assertEqual(serialized_data['group'], ['TEST'])
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
        self.assertEqual(serialized_data['fileparameter'],
                         metric.fileparameter)

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_metrics_from_metrictemplatehistory_instance(
            self, mock_update
    ):
        mock_update.return_value = []
        metrictemplate = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate1,
            name='argo.AMS-Check-new',
            mtype=self.mt_active,
            description='New description for the metric.',
            probekey=self.probeversion1_2,
            parent='argo.AMS-Check',
            probeexecutable='ams-probe',
            config='["maxCheckAttempts 4", "timeout 70", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 6", "retryInterval 4"]',
            attribute='[argo.ams_TOKEN2 --token]',
            dependency='["dep-key dep-val"]',
            parameter='["par-key par-val"]',
            flags='["flag-key flag-val"]',
            files='["file-key file-val"]',
            fileparameter='["fp-key fp-val"]',
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment=create_comment(self.metrictemplate1)
        )
        metrictemplate.tags.add(self.mtag1, self.mtag2)
        update_metrics(
            metrictemplate, 'argo.AMS-Check', self.probeversion1_2
        )
        mock_update.assert_called_once()
        mock_update.assert_has_calls([
            call('argo.AMS-Check', 'argo.AMS-Check-new')
        ])
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 1)
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(metric.mtype.name, metrictemplate.mtype.name)
        self.assertEqual(len(metric.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag2 in metric.tags.all())
        self.assertEqual(metric.probekey, metrictemplate.probekey)
        self.assertEqual(metric.description, metrictemplate.description)
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, metrictemplate.parent)
        self.assertEqual(metric.probeexecutable, metrictemplate.probeexecutable)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 2"]'
        )
        self.assertEqual(metric.attribute, metrictemplate.attribute)
        self.assertEqual(metric.dependancy, metrictemplate.dependency)
        self.assertEqual(metric.flags, metrictemplate.flags)
        self.assertEqual(metric.files, metrictemplate.files)
        self.assertEqual(metric.parameter, metrictemplate.parameter)
        self.assertEqual(metric.fileparameter, metrictemplate.fileparameter)
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
        self.assertEqual(serialized_data['group'], ['TEST'])
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

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_metrics_if_different_metrictemplate_version(
            self, mock_update
    ):
        mock_update.side_effect = mocked_func
        metrictemplate = admin_models.MetricTemplate.objects.get(
            id=self.metrictemplate1.id
        )
        metrictemplate.name = 'argo.AMS-Check'
        metrictemplate.mtype = self.mt_active
        metrictemplate.description = 'New description for the metric.'
        metrictemplate.probekey = self.probeversion1_3
        metrictemplate.parent = 'argo.AMS-Check'
        metrictemplate.probeexecutable = 'ams-probe'
        metrictemplate.config = \
            '["maxCheckAttempts 4", "timeout 70", ' \
            '"path /usr/libexec/argo-monitoring/probes/argo", ' \
            '"interval 6", "retryInterval 4"]'
        metrictemplate.attribute = '["argo.ams_TOKEN2 --token"]'
        metrictemplate.dependency = '["dep-key dep-val"]'
        metrictemplate.parameter = '["par-key par-val"]'
        metrictemplate.flags = '["flag-key flag-val"]'
        metrictemplate.files = '["file-key file-val"]'
        metrictemplate.fileparameter = '["fp-key fp-val"]'
        metrictemplate.save()
        metrictemplate.tags.remove(self.mtag2)
        update_metrics(
            metrictemplate, 'argo.AMS-Check', self.probeversion1_2,
            user='testuser'
        )
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 2)
        self.assertEqual(metric_versions[0].user, 'testuser')
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(len(metric.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag3 in metric.tags.all())
        self.assertEqual(metric.mtype.name, metrictemplate.mtype.name)
        self.assertEqual(metric.probekey, metrictemplate.probekey)
        self.assertEqual(metric.description, metrictemplate.description)
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, metrictemplate.parent)
        self.assertEqual(metric.probeexecutable, metrictemplate.probeexecutable)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 2"]'
        )
        self.assertEqual(metric.attribute, metrictemplate.attribute)
        self.assertEqual(metric.dependancy, metrictemplate.dependency)
        self.assertEqual(metric.flags, metrictemplate.flags)
        self.assertEqual(metric.files, metrictemplate.files)
        self.assertEqual(metric.parameter, metrictemplate.parameter)
        self.assertEqual(metric.fileparameter, metrictemplate.fileparameter)
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag3']]
        )
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(
            serialized_data['probekey'],
            [metric.probekey.name, metric.probekey.package.version]
        )
        self.assertEqual(serialized_data['group'], ['TEST'])
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
        self.assertFalse(mock_update.called)

    def test_update_metrics_if_metric_template_different_name(self):
        self.metrictemplate1.name = 'argo.AMS-Check-new'
        self.metrictemplate1.probekey = self.probeversion1_3
        self.metrictemplate1.save()
        update_metrics(
            self.metrictemplate1, 'argo.AMS-Check', self.probeversion1_2
        )
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        self.assertEqual(metric.name, 'argo.AMS-Check-new')
        self.assertEqual(len(metric.tags.all()), 3)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag2 in metric.tags.all())
        self.assertTrue(self.mtag3 in metric.tags.all())
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(
            metric.description,
            'Some description of argo.AMS-Check metric template.'
        )
        self.assertEqual(metric.probekey, self.probeversion1_3)
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 2"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')

    @patch('Poem.helpers.metrics_helpers.requests.put')
    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_update_metrics_in_profiles(self, mock_key, mock_get, mock_put):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_get.side_effect = mocked_web_api_metric_profiles
            msgs = update_metrics_in_profiles('metric1', 'new.metric1')
            mock_put.assert_called_once()
            mock_put.assert_called_with(
                'https://mock.api.url/11111111-2222-3333-4444-555555555555',
                headers={'Accept': 'application/json', 'x-api-key': 'mock_key'},
                data=json.dumps(
                    {
                        "id": "11111111-2222-3333-4444-555555555555",
                        "name": "PROFILE1",
                        "description": "First profile",
                        "services": [
                            {
                                "service": "service1",
                                "metrics": [
                                    "new.metric1",
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
                )
            )
            self.assertEqual(msgs, [])

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_update_metrics_in_profiles_wrong_token(self, mock_key, mock_get):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='wrong_key')
            mock_get.side_effect = mocked_web_api_metric_profiles_wrong_token
            msgs = update_metrics_in_profiles('metric1', 'new.metric1')
            self.assertEqual(
                msgs,
                [
                    'TEST: Error trying to update metric in metric profiles: '
                    '401 Client Error: Unauthorized.'
                    '\nPlease update metric profiles manually.'
                ]
            )

    def test_update_metrics_in_profiles_nonexisting_key(self):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            msgs = update_metrics_in_profiles('metric1', 'new.metric1')
            self.assertEqual(
                msgs,
                [
                    'TEST: No "WEB-API" key in the DB!\n'
                    'Please update metric profiles manually.'
                ]
            )

    @patch('Poem.helpers.metrics_helpers.requests.put')
    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_update_metrics_in_profiles_if_response_empty(
            self, mock_key, mock_get, mock_put
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_get.side_effect = mocked_web_api_metric_profiles_empty
            msgs = update_metrics_in_profiles('metric1', 'new.metric1')
            self.assertEqual(msgs, [])
            self.assertFalse(mock_put.called)

    @patch('Poem.helpers.metrics_helpers.requests.put')
    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_update_metrics_in_profiles_if_same_name(
            self, mock_key, mock_get, mock_put
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_get.side_effect = mocked_web_api_metric_profiles
            msgs = update_metrics_in_profiles('metric1', 'metric1')
            self.assertEqual(msgs, [])
            self.assertFalse(mock_put.called)

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_get_metrics_in_profiles(self, mock_key, mock_get):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_get.side_effect = mocked_web_api_metric_profiles
            metrics = get_metrics_in_profiles('test')
            mock_get.assert_called_once()
            mock_get.assert_called_with(
                'https://mock.api.url',
                headers={'Accept': 'application/json', 'x-api-key': 'mock_key'},
                timeout=180
            )
            self.assertEqual(
                metrics,
                {
                    'metric1': ['PROFILE1'],
                    'metric2': ['PROFILE1', 'PROFILE2'],
                    'metric3': ['PROFILE1', 'PROFILE2'],
                    'metric4': ['PROFILE1'],
                    'metric5': ['PROFILE2'],
                    'metric7': ['PROFILE2']
                }
            )

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_get_metrics_in_profiles_wrong_token(self, mock_key, mock_get):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='wrong_key')
            mock_get.side_effect = mocked_web_api_metric_profiles_wrong_token
            self.assertRaises(
                requests.exceptions.HTTPError,
                get_metrics_in_profiles,
                'test'
            )

    def test_get_metrics_in_profiles_nonexisting_key(self):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            with self.assertRaises(Exception) as context:
                get_metrics_in_profiles('test')
            self.assertEqual(
                str(context.exception),
                'Error fetching WEB API data: API key not found.'
            )

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_get_metrics_in_profiles_if_response_empty(
            self, mock_key, mock_get
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_get.side_effect = mocked_web_api_metric_profiles_empty
            metrics = get_metrics_in_profiles('test')
            mock_get.assert_called_once_with(
                'https://mock.api.url',
                headers={'Accept': 'application/json', 'x-api-key': 'mock_key'},
                timeout=180
            )
            self.assertEqual(metrics, {})

    @patch('Poem.helpers.metrics_helpers.requests.put')
    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.poem_models.MetricProfiles.objects.'
           'get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_delete_metrics_from_profiles(
            self, mock_key, mock_profile, mock_get, mock_put
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url/'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_profile.return_value = poem_models.MetricProfiles(
                name='PROFILE1', apiid='11111111-2222-3333-4444-555555555555',
                description='First profile', groupname='TEST'
            )
            mock_get.side_effect = mocked_web_api_metric_profile
            mock_put.side_effect = mocked_web_api_metric_profile_put
            delete_metrics_from_profile(
                profile='PROFILE1', metrics=['metric3', 'metric4']
            )
            mock_get.assert_called_once_with(
                'https://mock.api.url/11111111-2222-3333-4444-555555555555',
                headers={'Accept': 'application/json', 'x-api-key': 'mock_key'},
                timeout=180
            )
            data = {
                "id": "11111111-2222-3333-4444-555555555555",
                "name": "PROFILE1",
                "description": "First profile",
                "services": [
                    {
                        "service": "service1",
                        "metrics": [
                            "metric1",
                            "metric2"
                        ]
                    }
                ]
            }
            mock_put.assert_called_once_with(
                'https://mock.api.url/11111111-2222-3333-4444-555555555555',
                headers={'Accept': 'application/json', 'x-api-key': 'mock_key'},
                data=json.dumps(data)
            )

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.poem_models.MetricProfiles.objects.'
           'get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_delete_metrics_from_profiles_wrong_token(
            self, mock_key, mock_profile, mock_get
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url/'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='wrong_key')
            mock_profile.return_value = poem_models.MetricProfiles(
                name='PROFILE1', apiid='11111111-2222-3333-4444-555555555555',
                description='First profile', groupname='TEST'
            )
            mock_get.side_effect = mocked_web_api_metric_profiles_wrong_token
            self.assertRaises(
                requests.exceptions.HTTPError,
                delete_metrics_from_profile,
                profile='PROFILE1', metrics=['metric3', 'metric4']
            )
            mock_get.assert_called_once_with(
                'https://mock.api.url/11111111-2222-3333-4444-555555555555',
                headers={'Accept': 'application/json',
                         'x-api-key': 'wrong_key'},
                timeout=180
            )

    @patch(
        'Poem.helpers.metrics_helpers.poem_models.MetricProfiles.objects.get'
    )
    def test_delete_metrics_from_profiles_nonexisting_key(self, mock_profile):
        mock_profile.return_value = poem_models.MetricProfiles(
            name='PROFILE1', apiid='11111111-2222-3333-4444-555555555555',
            description='First profile', groupname='TEST'
        )
        with self.assertRaises(Exception) as context:
            delete_metrics_from_profile(
                profile='PROFILE1', metrics=['metric3', 'metric4']
            )
        self.assertEqual(
            str(context.exception),
            'Error deleting metric from profile: API key not found.'
        )

    def test_delete_metrics_from_profiles_missing_profile(self):
        with self.assertRaises(Exception) as context:
            delete_metrics_from_profile(
                profile='PROFILE1', metrics=['metric3', 'metric4']
            )
        self.assertEqual(
            str(context.exception),
            'Error deleting metric from profile: Profile not found.'
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


class BasicResourceInfoTests(TenantTestCase):
    def setUp(self) -> None:
        user = CustUser.objects.create_user(username='testuser')

        mtype1 = admin_models.MetricTemplateType.objects.create(name='Active')
        mtype2 = admin_models.MetricTemplateType.objects.create(name='Passive')

        mtype3 = poem_models.MetricType.objects.create(name='Active')
        mtype4 = poem_models.MetricType.objects.create(name='Passive')

        ct = ContentType.objects.get_for_model(poem_models.Metric)

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
            version_user=user.username,
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
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=user.username
        )

        probe1.package = package3
        probe1.comment = 'Newest version.'
        probe1.save()

        admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=user.username
        )

        probe2 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            package=package3,
            description='Probe is inspecting AMS publisher.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probeversion4 = admin_models.ProbeHistory.objects.create(
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

        metrictemplate1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probekey=probeversion1,
            description='Some description of argo.AMS-Check metric template.',
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

        admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate1,
            name=metrictemplate1.name,
            mtype=metrictemplate1.mtype,
            probekey=metrictemplate1.probekey,
            description=metrictemplate1.description,
            probeexecutable=metrictemplate1.probeexecutable,
            config=metrictemplate1.config,
            attribute=metrictemplate1.attribute,
            dependency=metrictemplate1.dependency,
            flags=metrictemplate1.flags,
            files=metrictemplate1.files,
            parameter=metrictemplate1.parameter,
            fileparameter=metrictemplate1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=user.username,
            version_comment='Initial version.',
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate2,
            name=metrictemplate2.name,
            mtype=metrictemplate2.mtype,
            description=metrictemplate2.description,
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
            version_user=user.username,
            version_comment='Initial version.',
        )

        metrictemplate1.probekey = probeversion2
        metrictemplate1.config = '["maxCheckAttempts 4", "timeout 70", ' \
                                 '"path /usr/libexec/argo-monitoring/", ' \
                                 '"interval 5", "retryInterval 3"]'
        metrictemplate1.save()

        admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate1,
            name=metrictemplate1.name,
            mtype=metrictemplate1.mtype,
            description=metrictemplate1.description,
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
            version_user=user.username,
            version_comment=create_comment(metrictemplate1)
        )

        metrictemplate3 = admin_models.MetricTemplate.objects.create(
            name='argo.AMSPublisher-Check',
            mtype=mtype1,
            probekey=probeversion4,
            probeexecutable='["ams-publisher-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            parameter='["-s /var/run/argo-nagios-ams-publisher/sock"]',
            flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate3,
            name=metrictemplate3.name,
            mtype=metrictemplate3.mtype,
            description=metrictemplate3.description,
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
            version_user=user.username,
            version_comment=create_comment(metrictemplate3)
        )

        group = poem_models.GroupOfMetrics.objects.create(name='TEST')

        metric1 = poem_models.Metric.objects.create(
            name=metrictemplate1.name,
            group=group,
            mtype=mtype3,
            description=metrictemplate1.description,
            probekey=metrictemplate1.probekey,
            probeexecutable=metrictemplate1.probeexecutable,
            config=metrictemplate1.config,
            attribute=metrictemplate1.attribute,
            dependancy=metrictemplate1.dependency,
            flags=metrictemplate1.flags,
            files=metrictemplate1.files,
            parameter=metrictemplate1.parameter,
            fileparameter=metrictemplate1.fileparameter,
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric1.id,
            object_repr=metric1.__str__(),
            serialized_data=serializers.serialize(
                'json', [metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=user.username
        )

        metric2 = poem_models.Metric.objects.create(
            name=metrictemplate2.name,
            group=group,
            mtype=mtype4,
            description=metrictemplate2.description,
            probekey=metrictemplate2.probekey,
            probeexecutable=metrictemplate2.probeexecutable,
            config=metrictemplate2.config,
            attribute=metrictemplate2.attribute,
            dependancy=metrictemplate2.dependency,
            flags=metrictemplate2.flags,
            files=metrictemplate2.files,
            parameter=metrictemplate2.parameter,
            fileparameter=metrictemplate2.fileparameter,
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric2.id,
            object_repr=metric2.__str__(),
            serialized_data=serializers.serialize(
                'json', [metric2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=user.username
        )

    def test_get_resource_info(self):
        data = get_tenant_resources('test')
        self.assertEqual(data, {'metrics': 2, 'probes': 1})

    def test_get_resourece_info_for_super_poem_tenant(self):
        data = get_tenant_resources(get_public_schema_name())
        self.assertEqual(data, {'metric_templates': 3, 'probes': 2})


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
