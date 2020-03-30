import datetime

from django.db.models.signals import post_save

import factory

from rest_framework import status

from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from Poem.api import views
from Poem.api.models import MyAPIKey
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models

from unittest.mock import patch


def mock_function(profile):
    if profile == 'ARGO-MON':
        return {'argo.AMS-Check', 'argo.AMSPublisher-Check'}

    if profile == 'MON-TEST':
        return {'argo.AMS-Check', 'eu.seadatanet.org.downloadmanager-check', \
               'eu.seadatanet.org.nvs2-check'}

    if profile == 'EMPTY':
        return set()

    if profile == 'TEST-NONEXISTING':
        return {'nonexisting.metric'}

    if profile == 'TEST_PROMOO':
        return {'eu.egi.cloud.OCCI-Categories'}


@factory.django.mute_signals(post_save)
def mock_db_for_metrics_tests():
    metrictype = poem_models.MetricType.objects.create(name='Active')

    tag = admin_models.OSTag.objects.create(name='CentOS 6')
    repo = admin_models.YumRepo.objects.create(name='repo-1', tag=tag)
    package = admin_models.Package.objects.create(
        name='nagios-plugins-argo',
        version='0.1.7'
    )
    package.repos.add(repo)

    probe = admin_models.Probe.objects.create(
        name='ams-probe',
        package=package,
        description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
        comment='Initial version.',
        repository='https://github.com/ARGOeu/nagios-plugins-argo',
        docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
               'README.md',
        datetime=datetime.datetime.now(),
        user='testuser'
    )

    probekey = admin_models.ProbeHistory.objects.create(
        object_id=probe,
        name=probe.name,
        package=probe.package,
        description=probe.description,
        comment=probe.comment,
        repository=probe.repository,
        docurl=probe.docurl,
        version_comment='Initial version.',
        version_user='testuser'
    )
    group = poem_models.GroupOfMetrics.objects.create(name='EOSC')

    poem_models.Metric.objects.create(
        name='argo.AMS-Check',
        mtype=metrictype,
        group=group,
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

    poem_models.Metric.objects.create(
        name='argo.AMSPublisher-Check',
        mtype=metrictype,
    )


@factory.django.mute_signals(post_save)
def mock_db_for_repos_tests():
    tag1 = admin_models.OSTag.objects.create(name='CentOS 6')
    tag2 = admin_models.OSTag.objects.create(name='CentOS 7')

    repo1 = admin_models.YumRepo.objects.create(
        name='repo-1',
        tag=tag1,
        content='content1\ncontent2\n',
        description='For CentOS 6'
    )

    repo2 = admin_models.YumRepo.objects.create(
        name='repo-1',
        tag=tag2,
        content='content3\ncontent4\n',
        description='For CentOS 7'
    )

    repo3 = admin_models.YumRepo.objects.create(
        name='repo-2',
        tag=tag1,
        content='content5\ncontent6',
        description='CentOS 6'
    )

    repo4 = admin_models.YumRepo.objects.create(
        name='repo-2',
        tag=tag2,
        content='content7\ncontent8',
        description='CentOS 7'
    )

    repo5 = admin_models.YumRepo.objects.create(
        name='promoo',
        tag=tag1,
        content='content9\ncontent10',
        description='promoo for CentOS 6'
    )

    repo6 = admin_models.YumRepo.objects.create(
        name='promoo',
        tag=tag2,
        content='content11\ncontent12',
        description='promoo for CentOS 7'
    )

    package1 = admin_models.Package.objects.create(
        name='nagios-plugins-argo',
        version='0.1.11'
    )
    package1.repos.add(repo1, repo2)

    package2 = admin_models.Package.objects.create(
        name='nagios-plugins-http',
        version='2.2.2',
        use_present_version=True
    )
    package2.repos.add(repo3, repo4)

    package3 = admin_models.Package.objects.create(
        name='nagios-plugins-seadatacloud-nvs2',
        version='1.0.1'
    )
    package3.repos.add(repo2)

    package4 = admin_models.Package.objects.create(
        name='nagios-promoo',
        version='1.4.0'
    )
    package4.repos.add(repo5)

    package5 = admin_models.Package.objects.create(
        name='nagios-promo',
        version='1.7.1'
    )
    package5.repos.add(repo6)

    probe1 = admin_models.Probe.objects.create(
        name='ams-probe',
        package=package1,
        repository='https://github.com/ARGOeu/nagios-plugins-argo',
        docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
               'README.md',
        description='Probe is inspecting AMS service.',
        comment='Initial version.',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probe2 = admin_models.Probe.objects.create(
        name='ams-publisher-probe',
        package=package1,
        repository='https://github.com/ARGOeu/nagios-plugins-argo',
        docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
               'README.md',
        description='Probe is inspecting AMS publisher running on Nagios '
                    'monitoring instances.',
        comment='Initial version.',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probe3 = admin_models.Probe.objects.create(
        name='check_http',
        package=package2,
        repository='https://nagios-plugins.org',
        docurl='http://nagios-plugins.org/doc/man/check_http.html',
        description='This plugin tests the HTTP service on the specified host.',
        comment='Initial version.',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probe4 = admin_models.Probe.objects.create(
        name='seadatacloud-nvs2',
        package=package3,
        repository='https://github.com/ARGOeu/nagios-plugins-seadatacloud-nvs2/'
                   'tree/devel',
        docurl='https://github.com/ARGOeu/nagios-plugins-seadatacloud-nvs2/'
               'tree/devel',
        description='Nagios plugin.',
        comment='Initial version.',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probe5 = admin_models.Probe.objects.create(
        name='nagios-promoo.occi.categories',
        package=package4,
        repository='https://github.com/EGI-Foundation/nagios-promoo',
        docurl='https://wiki.egi.eu/wiki/Cloud_SAM_tests',
        description='Probe checks the existence of OCCI Infra kinds.',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probehistory1 = admin_models.ProbeHistory.objects.create(
        object_id=probe1,
        name=probe1.name,
        package=probe1.package,
        repository=probe1.repository,
        docurl=probe1.docurl,
        description=probe1.description,
        comment=probe1.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    probehistory2 = admin_models.ProbeHistory.objects.create(
        object_id=probe2,
        name=probe2.name,
        package=probe2.package,
        repository=probe2.repository,
        docurl=probe2.docurl,
        description=probe2.description,
        comment=probe2.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    probehistory3 = admin_models.ProbeHistory.objects.create(
        object_id=probe3,
        name=probe3.name,
        package=probe3.package,
        repository=probe3.repository,
        docurl=probe3.docurl,
        description=probe3.description,
        comment=probe3.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    probehistory4 = admin_models.ProbeHistory.objects.create(
        object_id=probe4,
        name=probe4.name,
        package=probe4.package,
        repository=probe4.repository,
        docurl=probe4.docurl,
        description=probe4.description,
        comment=probe4.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    probehistory5 = admin_models.ProbeHistory.objects.create(
        object_id=probe5,
        name=probe5.name,
        package=probe5.package,
        repository=probe5.repository,
        docurl=probe5.docurl,
        description=probe5.description,
        comment=probe5.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    probe5.package = package5
    probe5.save()

    probehistory6 = admin_models.ProbeHistory.objects.create(
        object_id=probe5,
        name=probe5.name,
        package=probe5.package,
        repository=probe5.repository,
        docurl=probe5.docurl,
        description=probe5.description,
        comment=probe5.comment,
        date_created=datetime.datetime.now(),
        version_comment='["changed": {"fields": ["package"]}]',
        version_user='testuser'
    )

    mtype1 = admin_models.MetricTemplateType.objects.create(name='Active')
    mtype2 = admin_models.MetricTemplateType.objects.create(name='Passive')

    mt1 = admin_models.MetricTemplate.objects.create(
        name='argo.AMS-Check',
        probekey=probehistory1,
        mtype=mtype1,
        probeexecutable='["ams-probe"]',
        config='["maxCheckAttempts 3", "timeout  60", '
               '"path /usr/libexec/argo-monitoring/probes/argo", '
               '"interval 5", "retryInterval 3"]',
        attribute='["argo.ams_TOKEN --token"]',
        parameter='["--project EGI"]',
        flags='["OBSESS 1"]'
    )

    mt2 = admin_models.MetricTemplate.objects.create(
        name='argo.AMSPublisher-Check',
        probekey=probehistory2,
        mtype=mtype1,
        probeexecutable='["ams-publisher-probe"]',
        config='["maxCheckAttempts 1", "timeout 120", '
               '"path /usr/libexec/argo-monitoring/probes/argo",'
               '"interval 180", "retryInterval 1"]',
        flags='["NOHOSTNAME 1", "NOTIMEOUT 1"]'
    )

    mt3 = admin_models.MetricTemplate.objects.create(
        name='eu.seadatanet.org.downloadmanager-check',
        probekey=probehistory3,
        mtype=mtype1,
        probeexecutable='["check_http"]',
        config='["maxCheckAttempts 3", "timeout 30", '
               '"path $USER1$", "interval 5", "retryInterval 3"]',
        attribute='["dm_path -u"]',
        parameter='["-f follow", "-s OK"]',
        flags='["PNP 1", "OBSESS 1"]'
    )

    mt4 = admin_models.MetricTemplate.objects.create(
        name='eu.seadatanet.org.nvs2-check',
        probekey=probehistory4,
        mtype=mtype1,
        probeexecutable='["seadatacloud-nvs2.sh"]',
        config='["interval 10", "maxCheckAttempts 3", '
               '"path /usr/libexec/argo-monitoring/probes/seadatacloud-nvs2/",'
               '"retryInterval 3", "timeout 30"]',
        attribute='["voc_collection -u"]'
    )

    mt5 = admin_models.MetricTemplate.objects.create(
        name='org.apel.APEL-Pub',
        mtype=mtype2,
        flags='["OBSESS 1", "PASSIVE 1"]'
    )

    mt6 = admin_models.MetricTemplate.objects.create(
        name='eu.egi.cloud.OCCI-Categories',
        probekey=probehistory6,
        mtype=mtype1,
        probeexecutable='nagios-promoo occi categories',
        config='["maxCheckAttempts 2", "path /opt/nagios-promoo/bin", '
               '"interval 60", "retryInterval 15"]',
        attribute='["OCCI_URL --endpoint", "X509_USER_PROXY --token"]',
        dependency='["org.nagios.OCCI-TCP 1", "hr.srce.GridProxy-Valid 0"]',
        parameter='["-t 300", "--check-location 0"]',
        flags='["OBSESS 1", "NOHOSTNAME 1", "NOTIMEOUT 1", "VO 1"]'
    )

    group = poem_models.GroupOfMetrics.objects.create(name='TEST')

    metric_type = poem_models.MetricType.objects.create(name='Active')

    poem_models.Metric.objects.create(
        name=mt1.name,
        group=group,
        mtype=metric_type,
        probekey=mt1.probekey,
        probeexecutable=mt1.probeexecutable,
        config=mt1.config,
        attribute=mt1.attribute,
        dependancy=mt1.dependency,
        flags=mt1.flags,
        files=mt1.files,
        parameter=mt1.parameter,
        fileparameter=mt1.fileparameter
    )

    poem_models.Metric.objects.create(
        name=mt2.name,
        group=group,
        mtype=metric_type,
        probekey=mt2.probekey,
        probeexecutable=mt2.probeexecutable,
        config=mt2.config,
        attribute=mt2.attribute,
        dependancy=mt2.dependency,
        flags=mt2.flags,
        files=mt2.files,
        parameter=mt2.parameter,
        fileparameter=mt2.fileparameter
    )

    poem_models.Metric.objects.create(
        name=mt3.name,
        group=group,
        mtype=metric_type,
        probekey=mt3.probekey,
        probeexecutable=mt3.probeexecutable,
        config=mt3.config,
        attribute=mt3.attribute,
        dependancy=mt3.dependency,
        flags=mt3.flags,
        files=mt3.files,
        parameter=mt3.parameter,
        fileparameter=mt3.fileparameter
    )

    poem_models.Metric.objects.create(
        name=mt4.name,
        group=group,
        mtype=metric_type,
        probekey=mt4.probekey,
        probeexecutable=mt4.probeexecutable,
        config=mt4.config,
        attribute=mt4.attribute,
        dependancy=mt4.dependency,
        flags=mt4.flags,
        files=mt4.files,
        parameter=mt4.parameter,
        fileparameter=mt4.fileparameter
    )

    poem_models.Metric.objects.create(
        name=mt5.name,
        group=group,
        mtype=metric_type,
        probekey=mt5.probekey,
        probeexecutable=mt5.probeexecutable,
        config=mt5.config,
        attribute=mt5.attribute,
        dependancy=mt5.dependency,
        flags=mt5.flags,
        files=mt5.files,
        parameter=mt5.parameter,
        fileparameter=mt5.fileparameter
    )

    poem_models.Metric.objects.create(
        name=mt6.name,
        group=group,
        mtype=metric_type,
        probekey=probehistory5,
        probeexecutable=mt6.probeexecutable,
        config=mt6.config,
        attribute=mt6.attribute,
        dependancy=mt6.dependency,
        flags=mt6.flags,
        files=mt6.files,
        parameter=mt6.parameter,
        fileparameter=mt6.fileparameter
    )


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


class ListReposAPIViewTests(TenantTestCase):
    def setUp(self):
        self.token = create_credentials()
        self.view = views.ListRepos.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = '/api/v2/repos'

        mock_db_for_repos_tests()

    def test_list_repos_if_wrong_token(self):
        request = self.factory.get(
            self.url + '/centos7',
            **{'HTTP_X_API_KEY': 'wrong_token',
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST]'}
        )
        response = self.view(request, 'centos7')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('Poem.api.views.get_metrics_from_profile',
           side_effect=mock_function)
    def test_list_repos(self, func):
        request = self.factory.get(
            self.url + '/centos7',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST]'}
        )
        response = self.view(request, 'centos7')
        test_data = response.data
        test_data[0]['repo-1']['packages'] = sorted(
            test_data[0]['repo-1']['packages'], key=lambda k: k['name']
        )
        self.assertEqual(
            test_data,
            [
                {
                    'repo-1': {
                        'content': 'content3\ncontent4\n',
                        'packages': [
                            {
                                'name': 'nagios-plugins-argo',
                                'version': '0.1.11'
                            },
                            {
                                'name': 'nagios-plugins-seadatacloud-nvs2',
                                'version': '1.0.1'
                            }
                        ]
                    },
                    'repo-2': {
                        'content': 'content7\ncontent8',
                        'packages': [
                            {
                                'name': 'nagios-plugins-http',
                                'version': 'present'
                            }
                        ]
                    }
                }
            ]
        )

    def test_list_repos_if_no_profile_or_tag(self):
        request = self.factory.get(
            self.url, **{'HTTP_X_API_KEY': self.token,
                         'HTTP_PROFILES': '[ARGO-MON, MON-TEST]'}
        )
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'You must define OS!'}
        )

    def test_list_repos_if_no_profile_defined(self):
        request = self.factory.get(
            self.url + '/centos7', **{'HTTP_X_API_KEY': self.token}
        )
        response = self.view(request, 'centos7')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'You must define profile!'}
        )

    @patch('Poem.api.views.get_metrics_from_profile',
           side_effect=mock_function)
    def test_list_repos_if_passive_metric_present(self, func):
        request = self.factory.get(
            self.url + '/centos6',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST]'}
        )
        response = self.view(request, 'centos6')
        self.assertEqual(
            response.data,
            [
                {
                    'repo-1': {
                        'content': 'content1\ncontent2\n',
                        'packages': [
                            {
                                'name': 'nagios-plugins-argo',
                                'version': '0.1.11'
                            }
                        ]
                    },
                    'repo-2': {
                        'content': 'content5\ncontent6',
                        'packages': [
                            {
                                'name': 'nagios-plugins-http',
                                'version': 'present'
                            }
                        ]
                    }
                }
            ]
        )

    @patch('Poem.api.views.get_metrics_from_profile',
           side_effect=mock_function)
    def test_empty_repo_list(self, func):
        request = self.factory.get(
            self.url + '/centos6',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[EMPTY]'}
        )
        response = self.view(request, 'centos6')
        self.assertEqual(response.data, [])

    @patch('Poem.api.views.get_metrics_from_profile',
           side_effect=mock_function)
    def test_list_repos_if_nonexisting_tag(self, func):
        request = self.factory.get(
            self.url + '/nonexisting',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST]'}
        )
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {'detail': 'YUM repo tag not found.'}
        )

    @patch('Poem.api.views.get_metrics_from_profile',
           side_effect=mock_function)
    def test_list_repos_if_function_return_metric_does_not_exist(self, func):
        request = self.factory.get(
            self.url + '/centos6',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST, TEST-NONEXISTING]'}
        )
        response = self.view(request, 'centos6')
        self.assertEqual(
            response.data,
            [
                {
                    'repo-1': {
                        'content': 'content1\ncontent2\n',
                        'packages': [
                            {
                                'name': 'nagios-plugins-argo',
                                'version': '0.1.11'
                            }
                        ]
                    },
                    'repo-2': {
                        'content': 'content5\ncontent6',
                        'packages': [
                            {
                                'name': 'nagios-plugins-http',
                                'version': 'present'
                            }
                        ]
                    }
                }
            ]
        )

    @patch('Poem.api.views.get_metrics_from_profile',
           side_effect=mock_function)
    def test_list_repos_if_version_is_the_right_os(self, func):
        request = self.factory.get(
            self.url + '/centos6',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[TEST_PROMOO]'}
        )
        response = self.view(request, 'centos6')
        self.assertEqual(
            response.data,
            [
                {
                    'promoo': {
                        'content': 'content9\ncontent10',
                        'packages': [
                            {
                                'name': 'nagios-promoo',
                                'version': '1.4.0'
                            }
                        ]
                    }
                }
            ]
        )

    @patch('Poem.api.views.get_metrics_from_profile',
           side_effect=mock_function)
    def test_list_repos_if_version_is_wrong_os(self, func):
        request = self.factory.get(
            self.url + '/centos6',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[TEST_PROMOO]'}
        )
        response = self.view(request, 'centos7')
        self.assertEqual(response.data, [])
