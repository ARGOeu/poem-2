import json
import datetime

from mock import patch

from rest_framework import status

from rest_framework_api_key.models import APIKey
from rest_framework_api_key.crypto import _generate_token, hash_token

from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from Poem.poem.models import *
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
    )
    metric2 = Metric.objects.create(
        name='argo.AMSPublisher-Check',
        tag=tag2,
        mtype=metrictype,
    )

    group = GroupOfMetrics.objects.create(name='EOSC')
    group.metrics.create(name=metric1.name)

    MetricParent.objects.create(
        metric=metric1,
        value='org.nagios.CDMI-TCP'
    )
    MetricParent.objects.create(
        metric=metric2,
        value=None
    )

    MetricProbeExecutable.objects.create(
        metric=metric1,
        value='ams-probe'
    )
    MetricProbeExecutable.objects.create(
        metric=metric2,
        value=None
    )

    MetricConfig.objects.create(
        key='maxCheckAttempts',
        value='3',
        metric=metric1
    )
    MetricConfig.objects.create(
        key='timeout',
        value='60',
        metric=metric1
    )
    MetricConfig.objects.create(
        key='path',
        value='/usr/libexec/argo-monitoring/probes/argo',
        metric=metric1
    )
    MetricConfig.objects.create(
        key='interval',
        value='5',
        metric=metric1
    )
    MetricConfig.objects.create(
        key='retryInterval',
        value='3',
        metric=metric1
    )
    MetricConfig.objects.create(
        key=None,
        value=None,
        metric=metric2
    )

    MetricAttribute.objects.create(
        key='argo.ams_TOKEN',
        value='--token',
        metric=metric1
    )

    MetricDependancy.objects.create(
        key='argo.AMS-Check',
        value='1',
        metric=metric1
    )

    MetricFlags.objects.create(
        key='OBSESS',
        value='1',
        metric=metric1
    )

    MetricFiles.objects.create(
        key='UCC_CONFIG',
        value='UCC_CONFIG',
        metric=metric1
    )

    MetricParameter.objects.create(
        key='--project',
        value='EGI',
        metric=metric1
    )

    MetricFileParameter.objects.create(
        key='FILE_SIZE_KBS',
        value='1000',
        metric=metric1
    )

def mock_db_for_profile_testing():
    profile1 = Profile.objects.create(
        name='ARGO_MON',
        version='1.0',
        vo='ops',
        description='Central ARGO-MON profile',
        groupname='ARGO'
    )
    profile2 = Profile.objects.create(
        name='ARGO_MON_BIOMED',
        version='1.0',
        vo='biomed',
        description='Central ARGO-MON profile for Biomed vo',
        groupname='ARGO'
    )

    MetricInstance.objects.create(
        profile=profile1,
        service_flavour='APEL',
        metric='org.apel.APEL-Pub',
    )
    MetricInstance.objects.create(
        profile=profile1,
        service_flavour='APEL',
        metric='org.apel.APEL-Sync'
    )
    MetricInstance.objects.create(
        profile=profile2,
        service_flavour='ARC_CE',
        metric='org.nordugrid.ARC-CE-ARIS'
    )


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


@patch('Poem.api.permissions.SECRET_KEY', 'top_secret')
@patch('Poem.api.permissions.TOKEN_HEADER', 'HTTP_X_API_KEY')
class ListProfileAPIViewTests(TenantTestCase):
    def setUp(self):
        self.token = create_credentials()
        self.view = views.ListProfile.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = '/api/v2/profiles'

        mock_db_for_profile_testing()

    def test_list_profile_403_in_case_of_wrong_token(self):
        request = self.factory.get(self.url, **{'HTTP_X_API_KEY':
                                                    'wrong_token'})
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_profiles(self):
        request = self.factory.get(self.url, **{'HTTP_X_API_KEY': self.token})
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'name': 'ARGO_MON',
                    'vo': 'ops',
                    'description': 'Central ARGO-MON profile',
                    'metric_instances': [
                        {
                            'metric': 'org.apel.APEL-Pub',
                            'service_flavour': 'APEL'
                        },
                        {
                            'metric': 'org.apel.APEL-Sync',
                            'service_flavour': 'APEL'
                        }
                    ]
                },
                {
                    'name': 'ARGO_MON_BIOMED',
                    'vo': 'biomed',
                    'description': 'Central ARGO-MON profile for Biomed vo',
                    'metric_instances': [
                        {
                            'metric': 'org.nordugrid.ARC-CE-ARIS',
                            'service_flavour': 'ARC_CE'
                        }
                    ]
                }
            ]
        )


@patch('Poem.api.permissions.SECRET_KEY', 'top_secret')
@patch('Poem.api.permissions.TOKEN_HEADER', 'HTTP_X_API_KEY')
class DetailProfileAPIViewTests(TenantTestCase):
    def setUp(self):
        self.token = create_credentials()
        self.view = views.DetailProfile.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url_base = '/api/v2/profiles/'

        mock_db_for_profile_testing()

    def test_detail_profile_403_in_case_of_wrong_token(self):
        request = self.factory.get(self.url_base + 'ARGO_MON',
                                   **{'HTTP_X_API_KEY': 'wrong_token'})
        response = self.view(request, 'ARGO_MON')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_detail_profile(self):
        request = self.factory.get(self.url_base + 'ARGO_MON',
                                   **{'HTTP_X_API_KEY': self.token})
        response = self.view(request, **{'name': 'ARGO_MON'})
        self.assertEqual(
            response.data,
            {
               'name': 'ARGO_MON',
                'vo': 'ops',
                'description': 'Central ARGO-MON profile',
                'metric_instances': [
                    {
                        'metric': 'org.apel.APEL-Pub',
                        'service_flavour': 'APEL'
                    },
                    {
                        'metric': 'org.apel.APEL-Sync',
                        'service_flavour': 'APEL'
                    }
                ]
            }
        )

    def test_detail_profile_404_code_if_wrong_name(self):
        request = self.factory.get(self.url_base + 'FAKE_GROUP',
                                   **{'HTTP_X_API_KEY': self.token})
        response = self.view(request, **{'name': 'FAKE_GROUP'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
