import json
import datetime

from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_save

import factory

from rest_framework import status

from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from Poem.api import views
from Poem.api.models import MyAPIKey
from Poem.poem.models import GroupOfMetrics, Metric, MetricType
from Poem.poem_super_admin import models as admin_models
from Poem.users.models import CustUser


@factory.django.mute_signals(post_save)
def mock_db_for_metrics_tests():
    user = CustUser.objects.create_user(username='testuser')

    metrictype = MetricType.objects.create(name='Active')

    ct = ContentType.objects.get_for_model(admin_models.Probe)

    probekey = admin_models.History.objects.create(
        object_repr='ams_probe (0.1.7)',
        serialized_data=json.dumps(
            [
                {
                    'model': 'poem.probe',
                    'fields': {
                        'comment': 'Initial version',
                        'version': '0.1.7',
                        'docurl':
                            'https://github.com/ARGOeu/nagios-plugins-argo'
                            '/blob/master/README.md'
                    }
                }
            ]
        ),
        content_type=ct,
        comment='Initial version',
        date_created=datetime.datetime(2015, 1, 1, 0, 0, 0),
        user=user.username
    )

    metric1 = Metric.objects.create(
        name='argo.AMS-Check',
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
        mtype=metrictype,
    )

    group = GroupOfMetrics.objects.create(name='EOSC')
    group.metrics.create(name=metric1.name)


def create_credentials():
    obj, key = MyAPIKey.objects.create_key(name='EGI')
    return obj.token


class ListMetricsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.token = create_credentials()
        self.view = views.ListMetrics.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = '/api/v2/metrics'

        mock_db_for_metrics_tests()

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

