import datetime
import json

import factory
from Poem.api import views_internal as views
from Poem.poem_super_admin import models as admin_models
from Poem.users.models import CustUser
from django.db.models.signals import pre_save
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from rest_framework import status
from rest_framework.test import force_authenticate


class ListVersionsAPIViewTests(TenantTestCase):
    @factory.django.mute_signals(pre_save)
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListVersions.as_view()
        self.url = '/api/v2/internal/version/'
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

        self.probe1 = admin_models.Probe.objects.create(
            name='poem-probe',
            package=package1,
            description='Probe inspects POEM service.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user=self.user.username,
            datetime=datetime.datetime.now()
        )

        self.ver1 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        self.probe1.name = 'poem-probe-new'
        self.probe1.package = package2
        self.probe1.comment = 'This version added: Check POEM metric ' \
                              'configuration API'
        self.probe1.description = 'Probe inspects new POEM service.'
        self.probe1.repository = 'https://github.com/ARGOeu/nagios-plugins-' \
                                 'argo2'
        self.probe1.docurl = 'https://github.com/ARGOeu/nagios-plugins-argo2/' \
                             'blob/master/README.md'
        self.probe1.save()

        self.ver2 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='[{"changed": {"fields": ["name", '
                            '"comment", "description", "repository", '
                            '"docurl"]}}]'
        )

        admin_models.Probe.objects.create(
            name='ams-probe',
            package=package1,
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user=self.user.username,
            datetime=datetime.datetime.now()
        )

        probe2 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            package=package2,
            description='Probe is inspecting AMS publisher',
            comment='Initial version',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user=self.user.username,
            datetime=datetime.datetime.now()
        )

        self.ver3 = admin_models.ProbeHistory.objects.create(
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

        self.mtype1 = admin_models.MetricTemplateType.objects.create(
            name='Active'
        )
        self.mtype2 = admin_models.MetricTemplateType.objects.create(
            name='Passive'
        )

        mtag1 = admin_models.MetricTags.objects.create(name='test_tag1')
        mtag2 = admin_models.MetricTags.objects.create(name='test_tag2')
        mtag3 = admin_models.MetricTags.objects.create(name='test_tag3')

        self.metrictemplate1 = admin_models.MetricTemplate.objects.create(
            name='argo.POEM-API-MON',
            mtype=self.mtype1,
            probekey=self.ver1,
            probeexecutable='["poem-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 5"]',
            attribute='["POEM_PROFILE -r", "NAGIOS_HOST_CERT --cert",'
                      '"NAGIOS_HOST_KEY --key"]',
        )

        self.ver4 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate1,
            name=self.metrictemplate1.name,
            mtype=self.metrictemplate1.mtype,
            probekey=self.metrictemplate1.probekey,
            probeexecutable=self.metrictemplate1.probeexecutable,
            config=self.metrictemplate1.config,
            attribute=self.metrictemplate1.attribute,
            dependency=self.metrictemplate1.dependency,
            flags=self.metrictemplate1.flags,
            parameter=self.metrictemplate1.parameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        self.metrictemplate1.name = 'argo.POEM-API-MON-new'
        self.metrictemplate1.description = \
            'Description of argo.POEM-API-MON-new'
        self.metrictemplate1.probekey = self.ver2
        self.metrictemplate1.save()
        self.metrictemplate1.tags.add(mtag1)

        self.ver5 = admin_models.MetricTemplateHistory.objects.create(
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
            parameter=self.metrictemplate1.parameter,
            date_created=datetime.datetime.now(),
            version_comment=json.dumps(
                [
                    {'added': {'fields': ['description']}},
                    {'changed': {'fields': ['name', 'probekey']}},
                    {'added': {'fields': ['tags'], 'object': ['test_tag1']}}
                ]
            ),
            version_user=self.user.username
        )
        self.ver5.tags.add(mtag1)

        self.metrictemplate2 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            description='Description of org.apel.APEL-Pub',
            mtype=self.mtype2,
            flags='["OBSESS 1", "PASSIVE 1"]'
        )
        self.metrictemplate2.tags.add(mtag2, mtag3)

        self.ver6 = admin_models.MetricTemplateHistory.objects.create(
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
            parameter=self.metrictemplate2.parameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )
        self.ver6.tags.add(mtag2, mtag3)

        self.metrictemplate2.name = 'org.apel.APEL-Pub-new'
        self.metrictemplate2.save()
        self.metrictemplate2.tags.remove(mtag2)

        self.ver7 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate2,
            name=self.metrictemplate2.name,
            mtype=self.metrictemplate2.mtype,
            probekey=self.metrictemplate2.probekey,
            description=self.metrictemplate2.description,
            probeexecutable=self.metrictemplate2.probeexecutable,
            config=self.metrictemplate2.config,
            attribute=self.metrictemplate2.attribute,
            dependency=self.metrictemplate2.dependency,
            flags=self.metrictemplate2.flags,
            parameter=self.metrictemplate2.parameter,
            date_created=datetime.datetime.now(),
            version_comment=json.dumps([{'changed': {'fields': ['name']}}]),
            version_user=self.user.username
        )
        self.ver7.tags.add(mtag3)

    def test_get_versions_of_probes(self):
        request = self.factory.get(self.url + 'probe/poem-probe-new')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'probe', 'poem-probe-new')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver2.id,
                    'object_repr': 'poem-probe-new (0.1.11)',
                    'fields': {
                        'name': 'poem-probe-new',
                        'version': '0.1.11',
                        'package': 'nagios-plugins-argo (0.1.11)',
                        'description': 'Probe inspects new POEM service.',
                        'comment': 'This version added: Check POEM metric '
                                   'configuration API',
                        'repository': 'https://github.com/ARGOeu/nagios-'
                                      'plugins-argo2',
                        'docurl': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo2/blob/master/README.md'
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver2.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Changed name, comment, description, '
                               'repository and docurl.',
                    'version': '0.1.11'
                },
                {
                    'id': self.ver1.id,
                    'object_repr': 'poem-probe (0.1.7)',
                    'fields': {
                        'name': 'poem-probe',
                        'version': '0.1.7',
                        'package': 'nagios-plugins-argo (0.1.7)',
                        'description': 'Probe inspects POEM service.',
                        'comment': 'Initial version.',
                        'repository': 'https://github.com/ARGOeu/nagios-'
                                      'plugins-argo',
                        'docurl': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo/blob/master/README.md'
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver1.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': '0.1.7'
                }
            ]
        )

    def test_get_versions_of_probes_given_old_version_name(self):
        request = self.factory.get(self.url + 'probe/poem-probe')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'probe', 'poem-probe')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver2.id,
                    'object_repr': 'poem-probe-new (0.1.11)',
                    'fields': {
                        'name': 'poem-probe-new',
                        'version': '0.1.11',
                        'package': 'nagios-plugins-argo (0.1.11)',
                        'description': 'Probe inspects new POEM service.',
                        'comment': 'This version added: Check POEM metric '
                                   'configuration API',
                        'repository': 'https://github.com/ARGOeu/nagios-'
                                      'plugins-argo2',
                        'docurl': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo2/blob/master/README.md'
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver2.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Changed name, comment, description, '
                               'repository and docurl.',
                    'version': '0.1.11'
                },
                {
                    'id': self.ver1.id,
                    'object_repr': 'poem-probe (0.1.7)',
                    'fields': {
                        'name': 'poem-probe',
                        'version': '0.1.7',
                        'package': 'nagios-plugins-argo (0.1.7)',
                        'description': 'Probe inspects POEM service.',
                        'comment': 'Initial version.',
                        'repository': 'https://github.com/ARGOeu/nagios-'
                                      'plugins-argo',
                        'docurl': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo/blob/master/README.md'
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver1.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': '0.1.7'
                }
            ]
        )

    def test_get_versions_of_metric_template(self):
        request = self.factory.get(self.url +
                                   'metrictemplate/argo.POEM-API-MON-new')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metrictemplate', 'argo.POEM-API-MON-new')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver5.id,
                    'object_repr':
                        'argo.POEM-API-MON-new [poem-probe-new (0.1.11)]',
                    'fields': {
                        'name': 'argo.POEM-API-MON-new',
                        'mtype': self.mtype1.name,
                        'tags': ['test_tag1'],
                        'probeversion': 'poem-probe-new (0.1.11)',
                        'description': 'Description of argo.POEM-API-MON-new',
                        'parent': '',
                        'probeexecutable': 'poem-probe',
                        'config': [
                            {'key': 'maxCheckAttempts', 'value': '3'},
                            {'key': 'timeout', 'value': '60'},
                            {'key': 'path',
                             'value':
                                 '/usr/libexec/argo-monitoring/probes/argo'},
                            {'key': 'interval', 'value': '5'},
                            {'key': 'retryInterval', 'value': '5'}
                        ],
                        'attribute': [
                            {'key': 'POEM_PROFILE', 'value': '-r'},
                            {'key': 'NAGIOS_HOST_CERT', 'value': '--cert'},
                            {'key': 'NAGIOS_HOST_KEY', 'value': '--key'},
                        ],
                        'dependency': [],
                        'flags': [],
                        'parameter': []
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver5.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Added description. Changed name and probekey. '
                               'Added tags field "test_tag1".',
                    'version': '0.1.11'
                },
                {
                    'id': self.ver4.id,
                    'object_repr':
                        'argo.POEM-API-MON [poem-probe (0.1.7)]',
                    'fields': {
                        'name': 'argo.POEM-API-MON',
                        'mtype': self.mtype1.name,
                        'tags': [],
                        'probeversion': 'poem-probe (0.1.7)',
                        'description': '',
                        'parent': '',
                        'probeexecutable': 'poem-probe',
                        'config': [
                            {'key': 'maxCheckAttempts', 'value': '3'},
                            {'key': 'timeout', 'value': '60'},
                            {'key': 'path',
                             'value':
                                 '/usr/libexec/argo-monitoring/probes/argo'},
                            {'key': 'interval', 'value': '5'},
                            {'key': 'retryInterval', 'value': '5'}
                        ],
                        'attribute': [
                            {'key': 'POEM_PROFILE', 'value': '-r'},
                            {'key': 'NAGIOS_HOST_CERT', 'value': '--cert'},
                            {'key': 'NAGIOS_HOST_KEY', 'value': '--key'},
                        ],
                        'dependency': [],
                        'flags': [],
                        'parameter': []
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver4.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': '0.1.7'
                }
            ]
        )

    def test_get_versions_of_metric_template_given_old_version_name(self):
        request = self.factory.get(self.url +
                                   'metrictemplate/argo.POEM-API-MON')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metrictemplate',
                             'argo.POEM-API-MON')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver5.id,
                    'object_repr':
                        'argo.POEM-API-MON-new [poem-probe-new (0.1.11)]',
                    'fields': {
                        'name': 'argo.POEM-API-MON-new',
                        'mtype': self.mtype1.name,
                        'tags': ['test_tag1'],
                        'probeversion': 'poem-probe-new (0.1.11)',
                        'description': 'Description of argo.POEM-API-MON-new',
                        'parent': '',
                        'probeexecutable': 'poem-probe',
                        'config': [
                            {'key': 'maxCheckAttempts', 'value': '3'},
                            {'key': 'timeout', 'value': '60'},
                            {'key': 'path',
                             'value':
                                 '/usr/libexec/argo-monitoring/probes/argo'},
                            {'key': 'interval', 'value': '5'},
                            {'key': 'retryInterval', 'value': '5'}
                        ],
                        'attribute': [
                            {'key': 'POEM_PROFILE', 'value': '-r'},
                            {'key': 'NAGIOS_HOST_CERT', 'value': '--cert'},
                            {'key': 'NAGIOS_HOST_KEY', 'value': '--key'},
                        ],
                        'dependency': [],
                        'flags': [],
                        'parameter': []
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver5.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Added description. Changed name and probekey. '
                               'Added tags field "test_tag1".',
                    'version': '0.1.11'
                },
                {
                    'id': self.ver4.id,
                    'object_repr':
                        'argo.POEM-API-MON [poem-probe (0.1.7)]',
                    'fields': {
                        'name': 'argo.POEM-API-MON',
                        'mtype': self.mtype1.name,
                        'tags': [],
                        'probeversion': 'poem-probe (0.1.7)',
                        'description': '',
                        'parent': '',
                        'probeexecutable': 'poem-probe',
                        'config': [
                            {'key': 'maxCheckAttempts', 'value': '3'},
                            {'key': 'timeout', 'value': '60'},
                            {'key': 'path',
                             'value':
                                 '/usr/libexec/argo-monitoring/probes/argo'},
                            {'key': 'interval', 'value': '5'},
                            {'key': 'retryInterval', 'value': '5'}
                        ],
                        'attribute': [
                            {'key': 'POEM_PROFILE', 'value': '-r'},
                            {'key': 'NAGIOS_HOST_CERT', 'value': '--cert'},
                            {'key': 'NAGIOS_HOST_KEY', 'value': '--key'},
                        ],
                        'dependency': [],
                        'flags': [],
                        'parameter': []
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver4.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': '0.1.7'
                }
            ]
        )

    def test_get_versions_of_passive_metric_template(self):
        request = self.factory.get(self.url + 'org.apel.APEL-Pub-new')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'metrictemplate', 'org.apel.APEL-Pub-new')
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver7.id,
                    'object_repr':
                        'org.apel.APEL-Pub-new',
                    'fields': {
                        'name': 'org.apel.APEL-Pub-new',
                        'mtype': self.mtype2.name,
                        'tags': ['test_tag3'],
                        'probeversion': '',
                        'description': 'Description of org.apel.APEL-Pub',
                        'parent': '',
                        'probeexecutable': '',
                        'config': [],
                        'attribute': [],
                        'dependency': [],
                        'flags': [
                            {'key': 'OBSESS', 'value': '1'},
                            {'key': 'PASSIVE', 'value': '1'}
                        ],
                        'parameter': []
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver7.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Changed name.',
                    'version': datetime.datetime.strftime(
                        self.ver7.date_created, '%Y%m%d-%H%M%S'
                    )
                },
                {
                    'id': self.ver6.id,
                    'object_repr':
                        'org.apel.APEL-Pub',
                    'fields': {
                        'name': 'org.apel.APEL-Pub',
                        'mtype': self.mtype2.name,
                        'tags': ['test_tag2', 'test_tag3'],
                        'probeversion': '',
                        'description': 'Description of org.apel.APEL-Pub',
                        'parent': '',
                        'probeexecutable': '',
                        'config': [],
                        'attribute': [],
                        'dependency': [],
                        'flags': [
                            {'key': 'OBSESS', 'value': '1'},
                            {'key': 'PASSIVE', 'value': '1'}
                        ],
                        'parameter': []
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

    def test_get_nonexisting_probe_version(self):
        request = self.factory.get(self.url + 'probe/ams-probe')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'probe', 'ams-probe')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Version not found'})

    def test_get_all_probe_versions(self):
        request = self.factory.get(self.url + 'probe/')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'probe')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.ver3.id,
                    'object_repr': 'ams-publisher-probe (0.1.11)',
                    'fields': {
                        'name': 'ams-publisher-probe',
                        'version': '0.1.11',
                        'package': 'nagios-plugins-argo (0.1.11)',
                        'description': 'Probe is inspecting AMS publisher',
                        'comment': 'Initial version',
                        'repository': 'https://github.com/ARGOeu/nagios-'
                                      'plugins-argo',
                        'docurl': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo/blob/master/README.md'
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver3.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': '0.1.11'
                },
                {
                    'id': self.ver1.id,
                    'object_repr': 'poem-probe (0.1.7)',
                    'fields': {
                        'name': 'poem-probe',
                        'version': '0.1.7',
                        'package': 'nagios-plugins-argo (0.1.7)',
                        'description': 'Probe inspects POEM service.',
                        'comment': 'Initial version.',
                        'repository': 'https://github.com/ARGOeu/'
                                      'nagios-plugins-argo',
                        'docurl': 'https://github.com/ARGOeu/'
                                  'nagios-plugins-argo/blob/master/README.md',
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver1.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Initial version.',
                    'version': '0.1.7'
                },
                {
                    'id': self.ver2.id,
                    'object_repr': 'poem-probe-new (0.1.11)',
                    'fields': {
                        'name': 'poem-probe-new',
                        'version': '0.1.11',
                        'package': 'nagios-plugins-argo (0.1.11)',
                        'description': 'Probe inspects new POEM service.',
                        'comment': 'This version added: Check POEM metric '
                                   'configuration API',
                        'repository': 'https://github.com/ARGOeu/nagios-'
                                      'plugins-argo2',
                        'docurl': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo2/blob/master/README.md'
                    },
                    'user': 'testuser',
                    'date_created': datetime.datetime.strftime(
                        self.ver2.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    'comment': 'Changed name, comment, description, '
                               'repository and docurl.',
                    'version': '0.1.11'
                }
            ]
        )
