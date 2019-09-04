import json
import datetime

from mock import patch

from rest_framework import status

from rest_framework_api_key.models import APIKey
from rest_framework_api_key.crypto import _generate_token, hash_token

from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from Poem.poem.models import GroupOfMetrics, Metric, MetricType, Tags
from Poem.users.models import CustUser
from Poem.api import views

from reversion.models import Version, Revision


def mock_db_for_tagged_metrics_tests():
    user = CustUser.objects.create_user(username='testuser')

    tag1 = Tags.objects.create(name='prod')
    tag2 = Tags.objects.create(name='test_none')
    Tags.objects.create(name='test_empty')

    metrictype = MetricType.objects.create(name='active')

    Revision.objects.create(
        id=1,
        comment='Initial version',
        date_created=datetime.datetime(2015, 1, 1, 0, 0, 0),
        user_id=user.id
    )

    probekey = Version.objects.create(
        object_repr='ams_probe (0.1.7)',
        serialized_data=json.dumps(
            [
                {
                    'model': 'poem.probe',
                    'fields': {
                        'comment': 'Initial version',
                        'group': 'EOSC',
                        'version': '0.1.7',
                        'docurl':
                            'https://github.com/ARGOeu/nagios-plugins-argo'
                            '/blob/master/README.md'
                    }
                }
            ]
        ),
        content_type_id='1',
        revision_id='1'
    )

    metric1 = Metric.objects.create(
        name='argo.AMS-Check',
        tag=tag1,
        mtype=metrictype,
        probekey=probekey,
        parent='["org.nagios.CDMI-TCP"]',
        probeexecutable='["ams-probe"]',
        config='["maxCheckAttempts 3", "timeout 60", '
               '"path /usr/libexec/argo-monitoring/probes/argo", "interval 5", '
               '"retryInterval 3"]',
        attribute='["argo.ams_TOKEN --token"]',
        dependancy='["argo.AMS-Check 1"]',
        flags='["OBSESS 1"]',
        files='["UCC_CONFIG UCC_CONFIG"]',
        parameter='["--project EGI"]',
        fileparameter='["FILE_SIZE_KBS 1000"]'
    )

    Metric.objects.create(
        name='argo.AMSPublisher-Check',
        tag=tag2,
        mtype=metrictype,
    )

    group = GroupOfMetrics.objects.create(name='EOSC')
    group.metrics.create(name=metric1.name)


def create_credentials():
    token = _generate_token()
    hashed_token = hash_token(token, 'top_secret')
    obj = APIKey.objects.create(client_id='EGI')
    obj.token = token
    obj.hashed_token = hashed_token
    obj.save()
    return token


@patch('Poem.api.permissions.SECRET_KEY', 'top_secret')
@patch('Poem.api.permissions.TOKEN_HEADER', 'HTTP_X_API_KEY')
class ListTaggedMetricsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.token = create_credentials()
        self.view = views.ListTaggedMetrics.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url_base = '/api/v2/metrics/'

        mock_db_for_tagged_metrics_tests()

    def test_tagged_metric_wrong_token(self):
        request = self.factory.get(self.url_base + 'prod',
                                   **{'HTTP_X_API_KEY': 'wrong_token'})
        response = self.view(request, 'prod')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_metric_for_a_given_tag_with_all_fields(self):
        request = self.factory.get(self.url_base + 'prod', **{'HTTP_X_API_KEY':
                                                                  self.token})
        response = self.view(request, 'prod')
        self.assertEqual(
            response.data,
            [
                {
                    'argo.AMS-Check': {
                        'probe': 'ams-probe',
                        'config': {
                            'maxCheckAttempts': '3',
                            'timeout': '60',
                            'path': '/usr/libexec/argo-monitoring/probes/argo',
                            'interval': '5',
                            'retryInterval': '3'
                        },
                        'flags': {
                            'OBSESS': '1'
                        },
                        'dependency': {
                            'argo.AMS-Check': '1'
                        },
                        'attribute': {
                            'argo.ams_TOKEN': '--token'
                        },
                        'parameter': {
                            '--project': 'EGI'
                        },
                        'file_parameter': {
                            'FILE_SIZE_KBS': '1000'
                        },
                        'file_attribute': {
                            'UCC_CONFIG': 'UCC_CONFIG'
                        },
                        'parent': 'org.nagios.CDMI-TCP',
                        'docurl':
                            'https://github.com/ARGOeu/nagios-plugins-argo'
                            '/blob/master/README.md'
                    }
                }
            ]
        )

    def test_get_metric_with_invalid_tag(self):
        request = self.factory.get(self.url_base + 'invalidtag',
                                   **{'HTTP_X_API_KEY': self.token})
        response = self.view(request, 'invalidtag')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Tag not found'})

    def test_get_metric_with_all_empty_fields(self):
        request = self.factory.get(self.url_base + 'test_none',
                                   **{'HTTP_X_API_KEY': self.token})
        response = self.view(request, 'test_none')
        self.assertEqual(
            response.data,
            [
                {
                    'argo.AMSPublisher-Check': {
                        'probe': '',
                        'config': {},
                        'flags': {},
                        'dependency': {},
                        'attribute': {},
                        'parameter': {},
                        'file_parameter': {},
                        'file_attribute': {},
                        'parent': '',
                        'docurl': ''
                    }
                }
            ]
        )

    def test_get_metrics_if_tag_without_associated_metrics(self):
        request = self.factory.get(self.url_base + 'test_empty',
                                   **{'HTTP_X_API_KEY': self.token})
        response = self.view(request, 'test_empty')
        self.assertEqual(response.data, [])


@patch('Poem.api.permissions.SECRET_KEY', 'top_secret')
@patch('Poem.api.permissions.TOKEN_HEADER', 'HTTP_X_API_KEY')
class ListMetricsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.token = create_credentials()
        self.view = views.ListMetrics.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = '/api/v2/metrics'

        mock_db_for_tagged_metrics_tests()

    def test_list_metrics_if_wrong_token(self):
        request = self.factory.get(self.url, **{'HTTP_X_API_KEY':
                                                    'wrong_token'})
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_metrics(self):
        request = self.factory.get(self.url, **{'HTTP_X_API_KEY': self.token})
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'argo.AMS-Check': {
                        'probe': 'ams-probe',
                        'config': {
                            'maxCheckAttempts': '3',
                            'timeout': '60',
                            'path': '/usr/libexec/argo-monitoring/probes/argo',
                            'interval': '5',
                            'retryInterval': '3'
                        },
                        'flags': {
                            'OBSESS': '1'
                        },
                        'dependency': {
                            'argo.AMS-Check': '1'
                        },
                        'attribute': {
                            'argo.ams_TOKEN': '--token'
                        },
                        'parameter': {
                            '--project': 'EGI'
                        },
                        'file_parameter': {
                            'FILE_SIZE_KBS': '1000'
                        },
                        'file_attribute': {
                            'UCC_CONFIG': 'UCC_CONFIG'
                        },
                        'parent': 'org.nagios.CDMI-TCP',
                        'docurl':
                            'https://github.com/ARGOeu/nagios-plugins-argo'
                            '/blob/master/README.md'
                    }
                },
                {
                    'argo.AMSPublisher-Check': {
                        'probe': '',
                        'config': {},
                        'flags': {},
                        'dependency': {},
                        'attribute': {},
                        'parameter': {},
                        'file_parameter': {},
                        'file_attribute': {},
                        'parent': '',
                        'docurl': ''
                    }
                }
            ]
        )

