import json
import datetime
import mock

from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from Poem.poem.models import *
from Poem.poem import views

from reversion.models import Version, Revision


class ProfileViewsTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.Profiles.as_view()

        self.profile = Profile.objects.create(
            name='ARGO_MON',
            version='1.0',
            vo='ops',
            description='Central ARGO-MON profile.',
            groupname='ARGO',
        )

    def test_get_profiles(self):

        MetricInstance.objects.create(
            profile=self.profile,
            service_flavour='APEL',
            metric='org.apel.APEL-Pub',
            vo='ops',
            fqan='fqan_text',
        )
        request = self.factory.get('/api/0.2/json/profiles')
        response = self.view(request)
        data = json.loads(response.content)
        self.assertEqual(
            data,
            [
                {
                    'name': 'ARGO_MON',
                    'atp_vo': 'ops',
                    'version': '1.0',
                    'description': 'Central ARGO-MON profile.',
                    'metric_instances': [
                        {
                            'metric': 'org.apel.APEL-Pub',
                            'fqan': 'fqan_text',
                            'vo': 'ops',
                            'atp_service_type_flavour': 'APEL'
                        }
                    ]
                }
            ]
        )

    def test_get_profiles_with_no_fqan(self):

        MetricInstance.objects.create(
            profile=self.profile,
            service_flavour='APEL',
            metric='org.apel.APEL-Pub',
            vo='ops',
            fqan=None,
        )
        request = self.factory.get('/api/0.2/json/profiles')
        response = self.view(request)
        data = json.loads(response.content)

        self.assertEqual(
            data,
            [
                {
                    'name': 'ARGO_MON',
                    'atp_vo': 'ops',
                    'version': '1.0',
                    'description': 'Central ARGO-MON profile.',
                    'metric_instances': [
                        {
                            'metric': 'org.apel.APEL-Pub',
                            'fqan': '',
                            'vo': 'ops',
                            'atp_service_type_flavour': 'APEL'
                        }
                    ]
                }
            ]
        )

    def test_get_profiles_with_no_profile_description(self):
        profile2 = Profile.objects.create(
            name='ARGO_MON_BIOMED',
            version='1.0',
            vo='biomed',
            description=None,
            groupname='ARGO',
        )

        MetricInstance.objects.create(
            profile=self.profile,
            service_flavour='APEL',
            metric='org.apel.APEL-Pub',
            vo='ops',
            fqan='fqan_text',
        )

        MetricInstance.objects.create(
            profile=profile2,
            service_flavour='APEL',
            metric='org.apel.APEL-Sync',
            fqan='something',
        )

        request = self.factory.get('/api/0.2/json/profiles')
        response = self.view(request)
        data = json.loads(response.content)

        # sorting list of profiles because they are not always obtained in
        # the same order from api
        data = sorted(data, key=lambda k: k['name'])

        self.assertEqual(
            data,
            [
                {
                    'name': 'ARGO_MON',
                    'atp_vo': 'ops',
                    'version': '1.0',
                    'description': 'Central ARGO-MON profile.',
                    'metric_instances': [
                        {
                            'metric': 'org.apel.APEL-Pub',
                            'fqan': 'fqan_text',
                            'vo': 'ops',
                            'atp_service_type_flavour': 'APEL'
                        }
                    ]
                },
                {
                    'name': 'ARGO_MON_BIOMED',
                    'atp_vo': 'biomed',
                    'version': '1.0',
                    'description': '',
                    'metric_instances': [
                        {
                            'metric': 'org.apel.APEL-Sync',
                            'fqan': 'something',
                            'vo': 'biomed',
                            'atp_service_type_flavour': 'APEL'
                        }
                    ]
                }
            ]
        )


class MetricsInProfilesVIewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.MetricsInProfiles.as_view()

        profile1 = Profile.objects.create(
            name='ARGO_MON_CRITICAL',
            description='Central ARGO-MON_CRITICAL profile.',
            vo='ops',
            groupname='ARGO',
        )

        profile2 = Profile.objects.create(
            name='ARGO_MON_BIOMED',
            description='Central ARGO-MON profile used for Biomed VO.',
            vo='biomed',
            groupname='ARGO',
        )

        profile3 = Profile.objects.create(
            name='ARGO_MON',
            description='Central ARGO-MON profile.',
            vo='ops',
            groupname='ARGO',
        )

        profile4 = Profile.objects.create(
            name='TEST_PROFILE',
            description=None,
            vo='test',
            groupname='ARGO',
        )

        Profile.objects.create(
            name='TEST_EMPTY_PROFILE',
            description='Profiles with no metrics associated with them.',
            vo='test_empty',
            groupname='ARGO',
        )

        MetricInstance.objects.create(
            profile=profile1,
            service_flavour='ARC-CE',
            metric='org.nordugrid.ARC-CE-ARIS',
            fqan=None,
        )

        MetricInstance.objects.create(
            profile=profile1,
            service_flavour='APEL',
            metric='org.apel.APEL-Pub',
            fqan=None,
        )

        MetricInstance.objects.create(
            profile=profile2,
            service_flavour='CREAM-CE',
            metric='emi.cream.CREAMCE-AllowedSubmission',
            fqan=None,
        )

        MetricInstance.objects.create(
            profile=profile3,
            service_flavour='APEL',
            metric='org.apel.APEL-Pub',
            fqan=None,
        )

        MetricInstance.objects.create(
            profile=profile4,
            service_flavour='TEST-FLAVOUR',
            metric='metric.for.testing',
            fqan=None,
        )

    def test_get_metrics_for_a_given_vo(self):
        with mock.patch('Poem.poem.views.poem_namespace',
                        return_value='hr.cro-ngi.TEST'):
            request = self.factory.get(
                '/api/0.2/json/metrics_in_profiles/?vo_name=ops'
            )
            response = self.view(request)
            data = json.loads(response.content)

            # sorting list of profiles because they are not always obtained in
            # the same order from api
            data[0]['profiles'] = sorted(data[0]['profiles'], key=lambda k: k[
                'name'])
            self.assertEqual(
                data,
                [
                    {
                        'name': ['ops'],
                        'profiles': [
                            {
                                'name': 'ARGO_MON',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Central ARGO-MON profile.',
                                'vo': 'ops',
                                'metrics': [
                                    {
                                        'service_flavour': 'APEL',
                                        'name': 'org.apel.APEL-Pub',
                                        'fqan': ''
                                    }
                                ]
                            },
                            {
                                'name': 'ARGO_MON_CRITICAL',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Central ARGO-MON_CRITICAL '
                                               'profile.',
                                'vo': 'ops',
                                'metrics': [
                                    {
                                        'service_flavour': 'APEL',
                                        'name': 'org.apel.APEL-Pub',
                                        'fqan': ''
                                    },
                                    {
                                        'service_flavour': 'ARC-CE',
                                        'name': 'org.nordugrid.ARC-CE-ARIS',
                                        'fqan': ''
                                    }
                                ]
                            }
                        ]
                    }
                ]
            )

    def test_get_metrics_for_multiple_vos(self):
        with mock.patch('Poem.poem.views.poem_namespace',
                        return_value='hr.cro-ngi.TEST'):
            request = self.factory.get(
                '/api/0.2/json/metrics_in_profiles/?vo_name=ops&vo_name=biomed')
            response = self.view(request)
            data = json.loads(response.content)

            # sorting list of profiles because they are not always obtained in
            # the same order from api
            data[0]['profiles'] = sorted(data[0]['profiles'], key=lambda k: k[
                'name'])

            self.assertEqual(
                data,
                [
                    {
                        'name': ['ops', 'biomed'],
                        'profiles': [
                            {
                                'name': 'ARGO_MON',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Central ARGO-MON profile.',
                                'vo': 'ops',
                                'metrics': [
                                    {
                                        'service_flavour': 'APEL',
                                        'name': 'org.apel.APEL-Pub',
                                        'fqan': ''
                                    }
                                ]
                            },
                            {
                                'name': 'ARGO_MON_BIOMED',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Central ARGO-MON profile used '
                                               'for Biomed VO.',
                                'vo': 'biomed',
                                'metrics': [
                                    {
                                        'service_flavour': 'CREAM-CE',
                                        'name':
                                            'emi.cream.CREAMCE-'
                                            'AllowedSubmission',
                                        'fqan': ''
                                    }
                                ]
                            },
                            {
                                'name': 'ARGO_MON_CRITICAL',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Central ARGO-MON_CRITICAL '
                                               'profile.',
                                'vo': 'ops',
                                'metrics': [
                                    {
                                        'service_flavour': 'APEL',
                                        'name': 'org.apel.APEL-Pub',
                                        'fqan': ''
                                    },
                                    {
                                        'service_flavour': 'ARC-CE',
                                        'name': 'org.nordugrid.ARC-CE-ARIS',
                                        'fqan': ''
                                    }
                                ]
                            }
                        ]
                    }
                ]
            )

    def test_get_metrics_for_a_given_vo_and_a_given_profile(self):
        with mock.patch('Poem.poem.views.poem_namespace',
                        return_value='hr.cro-ngi.TEST'):
            request = self.factory.get('/api/0.2/json/metrics_in_profiles/'
                                       '?vo_name=ops&profile=ARGO_MON')
            response = self.view(request)
            data = json.loads(response.content)

            self.assertEqual(
                data,
                [
                    {
                        'name': ['ops'],
                        'profiles': [
                            {
                                'name': 'ARGO_MON',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Central ARGO-MON profile.',
                                'vo': 'ops',
                                'metrics': [
                                    {
                                        'service_flavour': 'APEL',
                                        'name': 'org.apel.APEL-Pub',
                                        'fqan': ''
                                    }
                                ]
                            }
                        ]
                    }
                ]
            )

    def test_get_metrics_for_a_given_vo_and_multiple_profiles(self):
        with mock.patch('Poem.poem.views.poem_namespace',
                        return_value='hr.cro-ngi.TEST'):
            request = self.factory.get(
                '/api/0.2/json/metrics_in_profiles/?vo_name=ops&profile='
                'ARGO_MON&profile=ARGO_MON_CRITICAL')
            response = self.view(request)
            data = json.loads(response.content)

            data[0]['profiles'] = sorted(data[0]['profiles'], key=lambda k: k[
                'name'])

            self.assertEqual(
                data,
                [
                    {
                        'name': ['ops'],
                        'profiles':[
                            {
                                'name': 'ARGO_MON',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Central ARGO-MON profile.',
                                'vo': 'ops',
                                'metrics': [
                                    {
                                        'service_flavour': 'APEL',
                                        'name': 'org.apel.APEL-Pub',
                                        'fqan': ''
                                    }
                                ]
                            },
                            {
                                'name': 'ARGO_MON_CRITICAL',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Central ARGO-MON_CRITICAL '
                                               'profile.',
                                'vo': 'ops',
                                'metrics': [
                                    {
                                        'service_flavour': 'APEL',
                                        'name': 'org.apel.APEL-Pub',
                                        'fqan': ''
                                    },
                                    {
                                        'service_flavour': 'ARC-CE',
                                        'name': 'org.nordugrid.ARC-CE-ARIS',
                                        'fqan': ''
                                    }
                                ]
                            }
                        ]
                    }
                ]
            )

    def test_get_metrics_for_multiple_vos_and_multiple_profiles(self):
        with mock.patch('Poem.poem.views.poem_namespace',
                        return_value='hr.cro-ngi.TEST'):
            request = self.factory.get(
                '/api/0.2/json/metrics_in_profiles/?vo_name=ops&vo_name=biomed'
                '&profile=ARGO_MON&profile=ARGO_MON_BIOMED')
            response = self.view(request)
            data = json.loads(response.content)

            data[0]['profiles'] = sorted(data[0]['profiles'], key=lambda k: k[
                'name'])

            self.assertEqual(
                data,
                [
                    {
                        'name': ['ops', 'biomed'],
                        'profiles': [
                            {
                                'name': 'ARGO_MON',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Central ARGO-MON profile.',
                                'vo': 'ops',
                                'metrics': [
                                    {
                                        'service_flavour': 'APEL',
                                        'name': 'org.apel.APEL-Pub',
                                        'fqan': ''
                                    }
                                ]
                            },
                            {
                                'name': 'ARGO_MON_BIOMED',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Central ARGO-MON profile '
                                               'used for Biomed VO.',
                                'vo': 'biomed',
                                'metrics': [
                                    {
                                        'service_flavour': 'CREAM-CE',
                                        'name':
                                            'emi.cream.CREAMCE-Allowed'
                                            'Submission',
                                        'fqan': ''
                                    }
                                ]
                            }
                        ]
                    }
                ]
            )

    def test_get_metrics_without_vo(self):
        with mock.patch('Poem.poem.views.poem_namespace',
                        return_value='hr.cro-ngi.TEST'):
            request = self.factory.get('/api/0.2/json/metrics_in_profiles/')
            response = self.view(request)

            self.assertEqual(response.content, b'Need the name of VO')

    def test_get_metric_with_no_valid_vo(self):
        with mock.patch('Poem.poem.views.poem_namespace',
                        return_value='hr.cro-ngi.TEST'):
            request = self.factory.get(
                '/api/0.2/json/metrics_in_profiles/?vo_name=bla')
            response = self.view(request)

            self.assertEqual(response.content, b'Not valid VO')

    def test_get_metric_with_no_namespace(self):
        with mock.patch('Poem.poem.views.poem_namespace', return_value=None):
            request = self.factory.get(
                '/api/0.2/json/metrics_in_profiles/?vo_name=ops')
            response = self.view(request)

            data = json.loads(response.content)
            data[0]['profiles'] = sorted(data[0]['profiles'], key=lambda k: k[
                'name'])
            self.assertEqual(
                data,
                [
                    {
                        'name': ['ops'],
                        'profiles': [
                            {
                                'name': 'ARGO_MON',
                                'namespace': '',
                                'description': 'Central ARGO-MON profile.',
                                'vo': 'ops',
                                'metrics': [
                                    {
                                        'service_flavour': 'APEL',
                                        'name': 'org.apel.APEL-Pub',
                                        'fqan': ''
                                    }
                                ]
                            },
                            {
                                'name': 'ARGO_MON_CRITICAL',
                                'namespace': '',
                                'description': 'Central ARGO-MON_CRITICAL '
                                               'profile.',
                                'vo': 'ops',
                                'metrics': [
                                    {
                                        'service_flavour': 'APEL',
                                        'name': 'org.apel.APEL-Pub',
                                        'fqan': ''
                                    },
                                    {
                                        'service_flavour': 'ARC-CE',
                                        'name': 'org.nordugrid.ARC-CE-ARIS',
                                        'fqan': ''
                                    }
                                ]
                            }
                        ]
                    }
                ]
            )

    def test_get_metrics_with_no_profile_description(self):
        with mock.patch('Poem.poem.views.poem_namespace',
                        return_value='hr.cro-ngi.TEST'):
            request = self.factory.get(
                '/api/0.2/json/metrics_in_profiles/?vo_name=test')
            response = self.view(request)

            data = json.loads(response.content)

            self.assertEqual(
                data,
                [
                    {
                        'name': ['test'],
                        'profiles': [
                            {
                                'name': 'TEST_PROFILE',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': '',
                                'vo': 'test',
                                'metrics': [
                                    {
                                        'service_flavour': 'TEST-FLAVOUR',
                                        'name': 'metric.for.testing',
                                        'fqan': ''
                                    }
                                ]
                            }
                        ]
                    }
                ]
            )

    def test_get_metrics_if_no_metrics_exist_for_the_given_vo(self):
        with mock.patch('Poem.poem.views.poem_namespace',
                        return_value='hr.cro-ngi.TEST'):
            request = self.factory.get(
                '/api/0.2/json/metrics_in_profiles/?vo_name=test_empty')
            response = self.view(request)
            data = json.loads(response.content)

            self.assertEqual(
                data,
                [
                    {
                        'name': ['test_empty'],
                        'profiles': [
                            {
                                'name': 'TEST_EMPTY_PROFILE',
                                'namespace': 'hr.cro-ngi.TEST',
                                'description': 'Profiles with no metrics '
                                               'associated with them.',
                                'vo': 'test_empty',
                                'metrics': []
                            }
                        ]
                    }
                ]
            )


class MetricsInGroupViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.MetricsInGroup.as_view()

        metric1 = Metrics.objects.create(
            name='org.apel.APEL-Pub',
        )

        metric2 = Metrics.objects.create(
            name='org.apel.APEL-Sync',
        )

        group = GroupOfMetrics.objects.create(
            name='EOSC',
        )
        group.metrics.create(name=metric1.name)
        group.metrics.create(name=metric2.name)

        GroupOfMetrics.objects.create(
            name='Empty_group',
        )

    def test_get_metrics_in_group_for_a_given_group(self):

        request = self.factory.get('/api/0.2/json/metrics_in_group/?group=EOSC')
        response = self.view(request)

        data = json.loads(response.content)

        self.assertEqual(
            data,
            {
                'result': [
                    'org.apel.APEL-Pub', 'org.apel.APEL-Sync'
                ]
            }
        )

    def test_get_metrics_in_group_if_no_group(self):

        request = self.factory.get(
            '/api/0.2/json/metrics_in_group/')
        response = self.view(request)
        data = response.content

        self.assertEqual(data, b'Need the name of group')

    def test_get_metrics_in_group_if_invalid_group_name(self):

        request = self.factory.get(
            '/api/0.2/json/metrics_in_group/?group=invalidname')
        response = self.view(request)
        data = response.content

        self.assertEqual(data, b'Not a valid group.')

    def test_get_metrics_in_group_if_empty_group(self):
        request = self.factory.get(
            '/api/0.2/json/metrics_in_group/?group=Empty_group')
        response = self.view(request)
        data = json.loads(response.content)

        self.assertEqual(data, {'result': []})


class MetricsViewTests(TenantTestCase):
    def setUp(self):

        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.Metrics.as_view()

        user = CustUser.objects.create_user(username='testuser')

        tag = Tags.objects.create(
            name='prod',
        )

        tag2 = Tags.objects.create(
            name='test_none',
        )

        Tags.objects.create(
            name='test_empty',
        )

        metrictype = MetricType.objects.create(
            name='active',
        )

        Revision.objects.create(
            id=1,
            comment='Initial_version',
            date_created=datetime.datetime(2015, 1, 1, 0, 0, 0),
            user_id=user.id,
        )

        probekey = Version.objects.create(
            object_repr='ams_probe (0.1.7)',
            serialized_data=json.dumps(
                [{
                    'model': 'poem.probe',
                    'fields': {
                        'comment': 'Initial version',
                        'group': 'EOSC',
                        'version': '0.1.7',
                        'docurl':
                            'https://github.com/ARGOeu/nagios-plugins-argo'
                            '/blob/master/README.md'
                    }
                }]
            ),
            content_type_id='1',
            revision_id='1',
        )

        metric = Metric.objects.create(
            name='argo.AMS-Check',
            tag=tag,
            mtype=metrictype,
            probekey=probekey,
        )

        metric2 = Metric.objects.create(
            name='argo.API-Check',
            tag=tag2,
            mtype=metrictype,
        )

        group = GroupOfMetrics.objects.create(
            name='EOSC',
        )
        group.metrics.create(name=metric.name)

        MetricParent.objects.create(
            metric=metric,
            value='org.nagios.CDMI-TCP',
        )

        MetricParent.objects.create(
            metric=metric2,
            value=None,
        )

        MetricProbeExecutable.objects.create(
            metric=metric,
            value='ams-probe',
        )

        MetricProbeExecutable.objects.create(
            metric=metric2,
            value=None,
        )

        MetricConfig.objects.create(
            key='maxCheckAttempts',
            value='3',
            metric=metric,
        )

        MetricConfig.objects.create(
            key='timeout',
            value='60',
            metric=metric,
        )

        MetricConfig.objects.create(
            key='path',
            value='/usr/libexec/argo-monitoring/probes/argo',
            metric=metric,
        )

        MetricConfig.objects.create(
            key='interval',
            value='5',
            metric=metric,
        )

        MetricConfig.objects.create(
            key='retryInterval',
            value='3',
            metric=metric,
        )

        MetricConfig.objects.create(
            key=None,
            value=None,
            metric=metric2,
        )

        MetricAttribute.objects.create(
            key='argo.ams_TOKEN',
            value='--token',
            metric=metric,
        )

        MetricDependancy.objects.create(
            key='argo.AMS-Check',
            value='1',
            metric=metric,
        )

        MetricFlags.objects.create(
            key='OBSESS',
            value='1',
            metric=metric,
        )

        MetricFiles.objects.create(
            key='UCC_CONFIG',
            value='UCC_CONFIG',
            metric=metric,
        )

        MetricParameter.objects.create(
            key='--project',
            value='EGI',
            metric=metric,
        )

        MetricFileParameter.objects.create(
            key='FILE_SIZE_KBS',
            value='1000',
            metric=metric,
        )

    def test_get_metric_for_a_given_tag_with_all_fields(self):
        request = self.factory.get('/api/0.2/json/metrics/?tag=prod')
        response = self.view(request)
        data = json.loads(response.content)

        self.assertEqual(
            data,
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

    def test_get_metric_with_no_tag(self):
        request = self.factory.get('/api/0.2/json/metrics/')
        response = self.view(request)
        data = response.content

        self.assertEqual(data, b'Need the name of tag.')

    def test_get_metric_with_invalid_tag(self):
        request = self.factory.get('/api/0.2/json/metrics/?tag=invalidtag')
        response = self.view(request)
        data = response.content

        self.assertEqual(data, b'Not a valid tag.')

    def test_get_metric_with_all_empty_fields(self):
        request = self.factory.get('/api/0.2/json/metrics/?tag=test_none')
        response = self.view(request)
        data = json.loads(response.content)

        self.assertEqual(
            data,
            [
                {
                    'argo.API-Check': {
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
        request = self.factory.get('/api/0.2/json/metrics/?tag=test_empty')
        response = self.view(request)
        data = json.loads(response.content)

        self.assertEqual(data, [])
