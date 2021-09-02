import datetime
import json

from Poem.api import views_internal as views
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from django_tenants.utils import schema_context, get_public_schema_name, \
    get_tenant_domain_model
from rest_framework import status
from rest_framework.test import force_authenticate

from .utils_test import encode_data


class ListProbesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListProbes.as_view()
        self.url = '/api/v2/internal/probes/'
        self.tenant_user = CustUser.objects.create_user(username='testuser')
        self.tenant_superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )

        with schema_context(get_public_schema_name()):
            self.super_tenant = Tenant.objects.create(
                name='public', schema_name=get_public_schema_name()
            )
            get_tenant_domain_model().objects.create(
                domain='public', tenant=self.super_tenant, is_primary=True
            )
            self.user = CustUser.objects.create_user(username='testuser')
            self.superuser = CustUser.objects.create_user(
                username='poem', is_superuser=True
            )

        tag = admin_models.OSTag.objects.create(name='CentOS 6')
        repo = admin_models.YumRepo.objects.create(
            name='repo-1', tag=tag
        )

        self.package1 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.7'
        )
        self.package1.repos.add(repo)

        self.package2 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.11'
        )
        self.package2.repos.add(repo)

        self.probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            package=self.package1,
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user='poem',
            datetime=datetime.datetime.now()
        )

        self.probe2 = admin_models.Probe.objects.create(
            name='argo-web-api',
            package=self.package1,
            description='This is a probe for checking AR and status reports are'
                        ' properly working.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        self.probe3 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            package=self.package2,
            description='Probe is inspecting AMS publisher running on Nagios '
                        'monitoring instances.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user='poem',
            datetime=datetime.datetime.now()
        )

        admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            version_comment='Initial version.',
            version_user=self.superuser.username
        )

        pv = admin_models.ProbeHistory.objects.create(
            object_id=self.probe2,
            name=self.probe2.name,
            package=self.probe2.package,
            description=self.probe2.description,
            comment=self.probe2.comment,
            repository=self.probe2.repository,
            docurl=self.probe2.docurl,
            version_comment='Initial version.',
            version_user=self.superuser.username
        )

        self.probe1.package = self.package2
        self.probe1.comment = 'Newer version.'
        self.probe1.save()

        pv2 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=self.superuser.username
        )

        admin_models.ProbeHistory.objects.create(
            object_id=self.probe3,
            name=self.probe3.name,
            package=self.probe3.package,
            description=self.probe3.description,
            comment=self.probe3.comment,
            repository=self.probe3.repository,
            docurl=self.probe3.docurl,
            version_comment='Initial version.',
            version_user=self.superuser.username
        )

        mtype = admin_models.MetricTemplateType.objects.create(name='Active')
        metrictype = poem_models.MetricType.objects.create(name='Active')

        metrictag1 = admin_models.MetricTags.objects.create(name='test_tag1')
        metrictag2 = admin_models.MetricTags.objects.create(name='test_tag2')

        group = poem_models.GroupOfMetrics.objects.create(name='TEST')

        ct = ContentType.objects.get_for_model(poem_models.Metric)

        mt1 = admin_models.MetricTemplate.objects.create(
            name='argo.API-Check',
            mtype=mtype,
            probekey=pv,
            probeexecutable='["web-api"]',
            config='["maxCheckAttempts 3", "timeout 120", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]',
            attribute='["argo.api_TOKEN --token"]',
            flags='["OBSESS 1"]'
        )
        mt1.tags.add(metrictag1, metrictag2)

        mt2 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=mtype,
            probekey=pv2,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        mt2.tags.add(metrictag1)

        metric1 = poem_models.Metric.objects.create(
            name='argo.API-Check',
            mtype=metrictype,
            group=group,
            probekey=pv,
            probeexecutable='["web-api"]',
            config='["maxCheckAttempts 3", "timeout 120", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]',
            attribute='["argo.api_TOKEN --token"]',
            flags='["OBSESS 1"]'
        )

        metric2 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            group=group,
            mtype=metrictype,
            probekey=pv2,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric1.id,
            serialized_data=serializers.serialize(
                'json', [metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=metric1.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.tenant_superuser.username
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric2.id,
            serialized_data=serializers.serialize(
                'json', [metric2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=metric2.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.tenant_superuser.username
        )

    def test_get_list_of_all_probes_sp_superuser(self):
        request = self.factory.get(self.url)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'name': 'ams-probe',
                    'version': '0.1.11',
                    'package': 'nagios-plugins-argo (0.1.11)',
                    'docurl':
                        'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                        'master/README.md',
                    'description': 'Probe is inspecting AMS service by trying '
                                   'to publish and consume randomly generated '
                                   'messages.',
                    'comment': 'Newer version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'nv': 2
                },
                {
                    'name': 'ams-publisher-probe',
                    'version': '0.1.11',
                    'package': 'nagios-plugins-argo (0.1.11)',
                    'docurl':
                        'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                        'master/README.md',
                    'description': 'Probe is inspecting AMS publisher running '
                                   'on Nagios monitoring instances.',
                    'comment': 'Initial version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'nv': 1
                },
                {
                    'name': 'argo-web-api',
                    'version': '0.1.7',
                    'package': 'nagios-plugins-argo (0.1.7)',
                    'description': 'This is a probe for checking AR and status '
                                   'reports are properly working.',
                    'comment': 'Initial version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/'
                              'blob/master/README.md',
                    'nv': 1
                }
            ]
        )

    def test_get_list_of_all_probes_sp_user(self):
        request = self.factory.get(self.url)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'name': 'ams-probe',
                    'version': '0.1.11',
                    'package': 'nagios-plugins-argo (0.1.11)',
                    'docurl':
                        'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                        'master/README.md',
                    'description': 'Probe is inspecting AMS service by trying '
                                   'to publish and consume randomly generated '
                                   'messages.',
                    'comment': 'Newer version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'nv': 2
                },
                {
                    'name': 'ams-publisher-probe',
                    'version': '0.1.11',
                    'package': 'nagios-plugins-argo (0.1.11)',
                    'docurl':
                        'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                        'master/README.md',
                    'description': 'Probe is inspecting AMS publisher running '
                                   'on Nagios monitoring instances.',
                    'comment': 'Initial version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'nv': 1
                },
                {
                    'name': 'argo-web-api',
                    'version': '0.1.7',
                    'package': 'nagios-plugins-argo (0.1.7)',
                    'description': 'This is a probe for checking AR and status '
                                   'reports are properly working.',
                    'comment': 'Initial version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/'
                              'blob/master/README.md',
                    'nv': 1
                }
            ]
        )

    def test_get_list_of_all_probes_tenant_superuser(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'name': 'ams-probe',
                    'version': '0.1.11',
                    'package': 'nagios-plugins-argo (0.1.11)',
                    'docurl':
                        'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                        'master/README.md',
                    'description': 'Probe is inspecting AMS service by trying '
                                   'to publish and consume randomly generated '
                                   'messages.',
                    'comment': 'Newer version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'nv': 2
                },
                {
                    'name': 'ams-publisher-probe',
                    'version': '0.1.11',
                    'package': 'nagios-plugins-argo (0.1.11)',
                    'docurl':
                        'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                        'master/README.md',
                    'description': 'Probe is inspecting AMS publisher running '
                                   'on Nagios monitoring instances.',
                    'comment': 'Initial version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'nv': 1
                },
                {
                    'name': 'argo-web-api',
                    'version': '0.1.7',
                    'package': 'nagios-plugins-argo (0.1.7)',
                    'description': 'This is a probe for checking AR and status '
                                   'reports are properly working.',
                    'comment': 'Initial version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/'
                              'blob/master/README.md',
                    'nv': 1
                }
            ]
        )

    def test_get_list_of_all_probes_tenant_user(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'name': 'ams-probe',
                    'version': '0.1.11',
                    'package': 'nagios-plugins-argo (0.1.11)',
                    'docurl':
                        'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                        'master/README.md',
                    'description': 'Probe is inspecting AMS service by trying '
                                   'to publish and consume randomly generated '
                                   'messages.',
                    'comment': 'Newer version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'nv': 2
                },
                {
                    'name': 'ams-publisher-probe',
                    'version': '0.1.11',
                    'package': 'nagios-plugins-argo (0.1.11)',
                    'docurl':
                        'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                        'master/README.md',
                    'description': 'Probe is inspecting AMS publisher running '
                                   'on Nagios monitoring instances.',
                    'comment': 'Initial version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'nv': 1
                },
                {
                    'name': 'argo-web-api',
                    'version': '0.1.7',
                    'package': 'nagios-plugins-argo (0.1.7)',
                    'description': 'This is a probe for checking AR and status '
                                   'reports are properly working.',
                    'comment': 'Initial version.',
                    'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                                  'argo',
                    'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/'
                              'blob/master/README.md',
                    'nv': 1
                }
            ]
        )

    def test_get_probe_by_name_sp_superuser(self):
        request = self.factory.get(self.url + 'ams-probe')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'ams-probe')
        self.assertEqual(
            response.data,
            {
                'id': self.probe1.id,
                'name': 'ams-probe',
                'version': '0.1.11',
                'package': 'nagios-plugins-argo (0.1.11)',
                'docurl':
                    'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                    'README.md',
                'description': 'Probe is inspecting AMS service by trying to '
                               'publish and consume randomly generated '
                               'messages.',
                'comment': 'Newer version.',
                'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
                'user': 'poem',
                'datetime': datetime.datetime.strftime(
                    self.probe1.datetime,
                    '%Y-%m-%dT%H:%M:%S.%f'
                ),
            }
        )

    def test_get_probe_by_name_sp_user(self):
        request = self.factory.get(self.url + 'ams-probe')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ams-probe')
        self.assertEqual(
            response.data,
            {
                'id': self.probe1.id,
                'name': 'ams-probe',
                'version': '0.1.11',
                'package': 'nagios-plugins-argo (0.1.11)',
                'docurl':
                    'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                    'README.md',
                'description': 'Probe is inspecting AMS service by trying to '
                               'publish and consume randomly generated '
                               'messages.',
                'comment': 'Newer version.',
                'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
                'user': 'poem',
                'datetime': datetime.datetime.strftime(
                    self.probe1.datetime,
                    '%Y-%m-%dT%H:%M:%S.%f'
                ),
            }
        )

    def test_get_probe_by_name_tenant_superuser(self):
        request = self.factory.get(self.url + 'ams-probe')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'ams-probe')
        self.assertEqual(
            response.data,
            {
                'id': self.probe1.id,
                'name': 'ams-probe',
                'version': '0.1.11',
                'package': 'nagios-plugins-argo (0.1.11)',
                'docurl':
                    'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                    'README.md',
                'description': 'Probe is inspecting AMS service by trying to '
                               'publish and consume randomly generated '
                               'messages.',
                'comment': 'Newer version.',
                'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
                'user': 'poem',
                'datetime': datetime.datetime.strftime(
                    self.probe1.datetime,
                    '%Y-%m-%dT%H:%M:%S.%f'
                ),
            }
        )

    def test_get_probe_by_name_tenant_user(self):
        request = self.factory.get(self.url + 'ams-probe')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'ams-probe')
        self.assertEqual(
            response.data,
            {
                'id': self.probe1.id,
                'name': 'ams-probe',
                'version': '0.1.11',
                'package': 'nagios-plugins-argo (0.1.11)',
                'docurl':
                    'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                    'README.md',
                'description': 'Probe is inspecting AMS service by trying to '
                               'publish and consume randomly generated '
                               'messages.',
                'comment': 'Newer version.',
                'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
                'user': 'poem',
                'datetime': datetime.datetime.strftime(
                    self.probe1.datetime,
                    '%Y-%m-%dT%H:%M:%S.%f'
                ),
            }
        )

    def test_get_probe_by_name_if_no_datetime_nor_user_sp_superuser(self):
        request = self.factory.get(self.url + 'argo-web-api')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'argo-web-api')
        self.assertEqual(
            response.data,
            {
                'id': self.probe2.id,
                'name': 'argo-web-api',
                'version': '0.1.7',
                'package': 'nagios-plugins-argo (0.1.7)',
                'docurl':
                    'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                    'README.md',
                'description': 'This is a probe for checking AR and status '
                               'reports are properly working.',
                'comment': 'Initial version.',
                'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
                'user': '',
                'datetime': ''
            }
        )

    def test_get_probe_by_name_if_no_datetime_nor_user_sp_user(self):
        request = self.factory.get(self.url + 'argo-web-api')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo-web-api')
        self.assertEqual(
            response.data,
            {
                'id': self.probe2.id,
                'name': 'argo-web-api',
                'version': '0.1.7',
                'package': 'nagios-plugins-argo (0.1.7)',
                'docurl':
                    'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                    'README.md',
                'description': 'This is a probe for checking AR and status '
                               'reports are properly working.',
                'comment': 'Initial version.',
                'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
                'user': '',
                'datetime': ''
            }
        )

    def test_get_probe_by_name_if_no_datetime_nor_user_tenant_superuser(self):
        request = self.factory.get(self.url + 'argo-web-api')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'argo-web-api')
        self.assertEqual(
            response.data,
            {
                'id': self.probe2.id,
                'name': 'argo-web-api',
                'version': '0.1.7',
                'package': 'nagios-plugins-argo (0.1.7)',
                'docurl':
                    'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                    'README.md',
                'description': 'This is a probe for checking AR and status '
                               'reports are properly working.',
                'comment': 'Initial version.',
                'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
                'user': '',
                'datetime': ''
            }
        )

    def test_get_probe_by_name_if_no_datetime_nor_user_tenant_user(self):
        request = self.factory.get(self.url + 'argo-web-api')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'argo-web-api')
        self.assertEqual(
            response.data,
            {
                'id': self.probe2.id,
                'name': 'argo-web-api',
                'version': '0.1.7',
                'package': 'nagios-plugins-argo (0.1.7)',
                'docurl':
                    'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                    'README.md',
                'description': 'This is a probe for checking AR and status '
                               'reports are properly working.',
                'comment': 'Initial version.',
                'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
                'user': '',
                'datetime': ''
            }
        )

    def test_get_probe_permission_denied_in_case_of_no_authorization(self):
        request = self.factory.get(self.url + 'ams-probe')
        response = self.view(request, 'ams-probe')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_probe_empty_dict_in_case_of_nonexisting_probe_sp_spruser(self):
        request = self.factory.get(self.url + 'nonexisting_probe')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting_probe')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_probe_empty_dict_in_case_of_nonexisting_probe_sp_user(self):
        request = self.factory.get(self.url + 'nonexisting_probe')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting_probe')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_probe_empty_dict_in_case_of_nonexisting_probe_ten_sprusr(self):
        request = self.factory.get(self.url + 'nonexisting_probe')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'nonexisting_probe')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_probe_empty_dict_in_case_of_nonexisting_probe_ten_user(self):
        request = self.factory.get(self.url + 'nonexisting_probe')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'nonexisting_probe')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_put_probe_with_already_existing_name_sp_superuser(self):
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nagios-plugins-argo (0.1.7)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Probe with this name already exists.'
        )

    def test_put_probe_with_already_existing_name_sp_user(self):
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nagios-plugins-argo (0.1.7)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_with_already_existing_name_tenant_superuser(self):
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nagios-plugins-argo (0.1.7)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_with_already_existing_name_tenant_user(self):
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nagios-plugins-argo (0.1.7)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_with_nonexisting_package_sp_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nonexisting (1.0.0)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Package does not exist.')
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'

        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_with_nonexisting_package_sp_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nonexisting (1.0.0)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_with_nonexisting_package_tenant_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nonexisting (1.0.0)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_with_nonexisting_package_tenant_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nonexisting (1.0.0)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_with_no_package_version_sp_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nonexisting',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Package version should be specified.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_with_no_package_version_sp_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nonexisting',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_with_no_package_version_tenant_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nonexisting',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_with_no_package_version_tenant_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'id': self.probe1.id,
            'name': 'argo-web-api',
            'package': 'nonexisting',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service by trying '
                           'to publish and consume randomly generated '
                           'messages.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package=probe.package
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        self.assertEqual(version.version_user, 'poem')

    def test_put_probe_without_new_version_sp_superuser(self):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe-new')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo2/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description, 'Probe is inspecting AMS service.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo2'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["comment", "description", "docurl", '
            '"name", "package", "repository"]}}]'
        )
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe-new', '0.1.11']
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

    def test_put_probe_without_new_version_sp_user(self):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package=probe.package
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_put_probe_without_new_version_tenant_superuser(self):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package=probe.package
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_put_probe_without_new_version_tenant_user(self):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package=probe.package
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["package", "comment"]}}]'
        )
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_put_probe_no_new_name_metric_history_without_new_version_sp_spusr(
            self
    ):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package__version=probe.package.version
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo2/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service.'
        )
        self.assertEqual(
            probe.repository,
            'https://github.com/ARGOeu/nagios-plugins-argo2',
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["comment", "description", "docurl", '
            '"package", "repository"]}}]'
        )
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_put_probe_no_new_name_metric_history_without_new_version_sp_user(
            self
    ):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(
            probe.repository,
            'https://github.com/ARGOeu/nagios-plugins-argo',
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_put_probe_no_new_name_metric_history_without_new_version_tn_spusr(
            self
    ):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(
            probe.repository,
            'https://github.com/ARGOeu/nagios-plugins-argo',
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_put_probe_no_new_name_metric_history_without_new_version_tn_user(
            self
    ):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(
            probe.repository,
            'https://github.com/ARGOeu/nagios-plugins-argo',
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_put_probe_with_new_version_without_metrictemplate_update_sp_spusr(
            self
    ):
        data = {
            'id': self.probe2.id,
            'name': 'web-api',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is checking AR and status reports.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(probe.name, 'web-api')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'New version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo2/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is checking AR and status reports.'
        )
        self.assertEqual(
            probe.repository,
            'https://github.com/ARGOeu/nagios-plugins-argo2',
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(
            version.version_comment,
            '[{"changed": {"fields": ["comment", "description", "docurl", '
            '"name", "package", "repository"]}}]'
        )
        mt = admin_models.MetricTemplate.objects.get(name='argo.API-Check')
        self.assertEqual(
            mt.probekey,
            admin_models.ProbeHistory.objects.filter(
                object_id=probe
            ).order_by('-date_created')[1]
        )
        metric = poem_models.Metric.objects.get(name='argo.API-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["web-api"]')
        self.assertEqual(
            metric.probekey,
            admin_models.ProbeHistory.objects.filter(
                object_id=probe
            ).order_by('-date_created')[1]
        )
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.api_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['argo-web-api', '0.1.7']
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

    def test_put_probe_with_new_version_without_metrictemplate_update_sp_user(
            self
    ):
        data = {
            'id': self.probe2.id,
            'name': 'web-api',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is checking AR and status reports.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 1
        )
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(probe.name, 'argo-web-api')
        self.assertEqual(probe.package, self.package1)
        self.assertEqual(probe.comment, 'Initial version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'This is a probe for checking AR and status reports are properly '
            'working.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.version_comment, 'Initial version.')
        mt = admin_models.MetricTemplate.objects.get(name='argo.API-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.API-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["web-api"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.api_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['argo-web-api', '0.1.7']
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

    def test_put_probe_with_new_version_without_metrictemplate_update_tn_sprusr(
            self
    ):
        data = {
            'id': self.probe2.id,
            'name': 'web-api',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is checking AR and status reports.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 1
        )
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(probe.name, 'argo-web-api')
        self.assertEqual(probe.package, self.package1)
        self.assertEqual(probe.comment, 'Initial version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'This is a probe for checking AR and status reports are properly '
            'working.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.version_comment, 'Initial version.')
        mt = admin_models.MetricTemplate.objects.get(name='argo.API-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.API-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["web-api"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.api_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['argo-web-api', '0.1.7']
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

    def test_put_probe_with_new_version_without_metrictemplate_update_tn_user(
            self
    ):
        data = {
            'id': self.probe2.id,
            'name': 'web-api',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is checking AR and status reports.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 1
        )
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(probe.name, 'argo-web-api')
        self.assertEqual(probe.package, self.package1)
        self.assertEqual(probe.comment, 'Initial version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'This is a probe for checking AR and status reports are properly '
            'working.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(version.version_comment, 'Initial version.')
        mt = admin_models.MetricTemplate.objects.get(name='argo.API-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.API-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["web-api"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.api_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['argo-web-api', '0.1.7']
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

    def test_put_probe_with_new_version_with_metrictemplate_update_sp_spruser(
            self
    ):
        data = {
            'id': self.probe2.id,
            'name': 'web-api',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is checking AR and status reports.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(
            self.url, content, content_type=content_type
        )
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        versions = admin_models.ProbeHistory.objects.filter(
            object_id=self.probe2
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(probe.name, 'web-api')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'New version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo2/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is checking AR and status reports.'
        )
        self.assertEqual(
            probe.repository,
            'https://github.com/ARGOeu/nagios-plugins-argo2',
        )
        self.assertEqual(versions[0].name, probe.name)
        self.assertEqual(versions[0].package, probe.package)
        self.assertEqual(versions[0].comment, probe.comment)
        self.assertEqual(versions[0].docurl, probe.docurl)
        self.assertEqual(versions[0].description, probe.description)
        self.assertEqual(versions[0].repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.API-Check')
        self.assertEqual(mt.probekey, versions[0])
        metric = poem_models.Metric.objects.get(name='argo.API-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["web-api"]')
        self.assertEqual(metric.probekey, versions[1])
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.api_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['argo-web-api', '0.1.7']
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

    def test_put_probe_with_new_version_with_metrictemplate_update_sp_user(
            self
    ):
        data = {
            'id': self.probe2.id,
            'name': 'web-api',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is checking AR and status reports.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(
            self.url, content, content_type=content_type
        )
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        versions = admin_models.ProbeHistory.objects.filter(
            object_id=self.probe2
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 1)
        self.assertEqual(probe.name, 'argo-web-api')
        self.assertEqual(probe.package, self.package1)
        self.assertEqual(probe.comment, 'Initial version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'This is a probe for checking AR and status reports are properly '
            'working.'
        )
        self.assertEqual(
            probe.repository,
            'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(versions[0].name, probe.name)
        self.assertEqual(versions[0].package, probe.package)
        self.assertEqual(versions[0].comment, probe.comment)
        self.assertEqual(versions[0].docurl, probe.docurl)
        self.assertEqual(versions[0].description, probe.description)
        self.assertEqual(versions[0].repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.API-Check')
        self.assertEqual(mt.probekey, versions[0])
        metric = poem_models.Metric.objects.get(name='argo.API-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["web-api"]')
        self.assertEqual(metric.probekey, versions[0])
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.api_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['argo-web-api', '0.1.7']
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

    def test_put_probe_with_new_version_with_metrictemplate_update_tennt_sprusr(
            self
    ):
        data = {
            'id': self.probe2.id,
            'name': 'web-api',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is checking AR and status reports.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(
            self.url, content, content_type=content_type
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        versions = admin_models.ProbeHistory.objects.filter(
            object_id=self.probe2
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 1)
        self.assertEqual(probe.name, 'argo-web-api')
        self.assertEqual(probe.package, self.package1)
        self.assertEqual(probe.comment, 'Initial version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'This is a probe for checking AR and status reports are properly '
            'working.'
        )
        self.assertEqual(
            probe.repository,
            'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(versions[0].name, probe.name)
        self.assertEqual(versions[0].package, probe.package)
        self.assertEqual(versions[0].comment, probe.comment)
        self.assertEqual(versions[0].docurl, probe.docurl)
        self.assertEqual(versions[0].description, probe.description)
        self.assertEqual(versions[0].repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.API-Check')
        self.assertEqual(mt.probekey, versions[0])
        metric = poem_models.Metric.objects.get(name='argo.API-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["web-api"]')
        self.assertEqual(metric.probekey, versions[0])
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.api_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['argo-web-api', '0.1.7']
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

    def test_put_probe_with_new_version_with_metrictemplate_update_tenant_user(
            self
    ):
        data = {
            'id': self.probe2.id,
            'name': 'web-api',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'New version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is checking AR and status reports.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': True
        }
        content, content_type = encode_data(data)
        request = self.factory.put(
            self.url, content, content_type=content_type
        )
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        versions = admin_models.ProbeHistory.objects.filter(
            object_id=self.probe2
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 1)
        self.assertEqual(probe.name, 'argo-web-api')
        self.assertEqual(probe.package, self.package1)
        self.assertEqual(probe.comment, 'Initial version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'This is a probe for checking AR and status reports are properly '
            'working.'
        )
        self.assertEqual(
            probe.repository,
            'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(versions[0].name, probe.name)
        self.assertEqual(versions[0].package, probe.package)
        self.assertEqual(versions[0].comment, probe.comment)
        self.assertEqual(versions[0].docurl, probe.docurl)
        self.assertEqual(versions[0].description, probe.description)
        self.assertEqual(versions[0].repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.API-Check')
        self.assertEqual(mt.probekey, versions[0])
        metric = poem_models.Metric.objects.get(name='argo.API-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["web-api"]')
        self.assertEqual(metric.probekey, versions[0])
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.api_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['argo-web-api', '0.1.7']
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

    def test_put_probe_with_nonexisting_probe_sp_superuser(self):
        data = {
            'id': 999,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Probe does not exist.')

    def test_put_probe_with_nonexisting_probe_sp_user(self):
        data = {
            'id': 999,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )

    def test_put_probe_with_nonexisting_probe_tenant_superuser(self):
        data = {
            'id': 999,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )

    def test_put_probe_with_nonexisting_probe_tenant_user(self):
        data = {
            'id': 999,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'description': 'Probe is inspecting AMS service.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )

    def test_put_probe_missing_data_key_sp_superuser(self):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Missing data key: description'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_put_probe_missing_data_key_sp_user(self):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_put_probe_missing_data_key_tenant_superuser(self):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_put_probe_missing_data_key_tenant_user(self):
        data = {
            'id': self.probe1.id,
            'name': 'ams-probe-new',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Newer version.',
            'docurl':
                'https://github.com/ARGOeu/nagios-plugins-argo2/blob/'
                'master/README.md',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-'
                          'argo2',
            'update_metrics': False
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change probes.'
        )
        probe = admin_models.Probe.objects.get(id=self.probe1.id)
        version = admin_models.ProbeHistory.objects.get(
            object_id=probe, package__version=probe.package.version
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 2
        )
        self.assertEqual(probe.name, 'ams-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.comment, 'Newer version.')
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
            'README.md',
        )
        self.assertEqual(
            probe.description,
            'Probe is inspecting AMS service by trying to publish and consume '
            'randomly generated messages.'
        )
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, version)
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, '')
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(metric.probekey, version)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(
            mt_history[0].comment, 'Initial version.'
        )
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe', '0.1.11']
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

    def test_post_probe_sp_superuser(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': ''
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        probe = admin_models.Probe.objects.get(name='poem-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.description, 'Probe inspects POEM service.')
        self.assertEqual(probe.comment, 'Initial version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
            'master/README.md'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 1
        )
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package__version=probe.package.version
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)

    def test_post_probe_sp_user(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': ''
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_probe_tenant_superuser(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': ''
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_probe_tenant_user(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': ''
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_cloned_probe_sp_superuser(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': self.probe1.id
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        probe = admin_models.Probe.objects.get(name='poem-probe')
        self.assertEqual(probe.package, self.package2)
        self.assertEqual(probe.description, 'Probe inspects POEM service.')
        self.assertEqual(probe.comment, 'Initial version.')
        self.assertEqual(
            probe.repository, 'https://github.com/ARGOeu/nagios-plugins-argo'
        )
        self.assertEqual(
            probe.docurl,
            'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
            'master/README.md'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 1
        )
        version = admin_models.ProbeHistory.objects.get(
            name=probe.name, package__version=probe.package.version
        )
        self.assertEqual(version.name, probe.name)
        self.assertEqual(version.package, probe.package)
        self.assertEqual(version.comment, probe.comment)
        self.assertEqual(version.docurl, probe.docurl)
        self.assertEqual(version.description, probe.description)
        self.assertEqual(version.repository, probe.repository)
        self.assertEqual(
            version.version_comment, 'Derived from ams-probe (0.1.11).'
        )

    def test_post_cloned_probe_sp_user(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': self.probe1.id
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_cloned_probe_tenant_superuser(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': self.probe1.id
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_cloned_probe_tenant_user(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': self.probe1.id
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_cloned_probe_from_nonexisting_probe_sp_superuser(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': 999
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Probe from which to clone does not exist.'
        )
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_cloned_probe_from_nonexisting_probe_sp_user(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': 999
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_cloned_probe_from_nonexisting_probe_tenant_superuser(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': 999
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_cloned_probe_from_nonexisting_probe_tenant_user(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': 999
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_probe_with_name_which_already_exists_sp_superuser(self):
        data = {
            'name': 'ams-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Probe with this name already exists.'
        )

    def test_post_probe_with_name_which_already_exists_sp_user(self):
        data = {
            'name': 'ams-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )

    def test_post_probe_with_name_which_already_exists_tenant_superuser(self):
        data = {
            'name': 'ams-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )

    def test_post_probe_with_name_which_already_exists_tenant_user(self):
        data = {
            'name': 'ams-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )

    def test_post_probe_with_nonexisting_package_sp_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'name': 'ams-probe',
            'package': 'nonexisting (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Package does not exist.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_post_probe_with_nonexisting_package_sp_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'name': 'ams-probe',
            'package': 'nonexisting (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_post_probe_with_nonexisting_package_tenant_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'name': 'ams-probe',
            'package': 'nonexisting (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_post_probe_with_nonexisting_package_tenant_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'name': 'ams-probe',
            'package': 'nonexisting (0.1.11)',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_post_probe_with_package_without_version_sp_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'name': 'ams-probe',
            'package': 'nonexisting',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Package version should be specified.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_post_probe_with_package_without_version_sp_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        data = {
            'name': 'ams-probe',
            'package': 'nonexisting',
            'description': 'Probe inspects POEM service.',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now()
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_post_probe_missing_data_key_sp_superuser(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': ''
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Missing data key: description'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_probe_missing_data_key_sp_user(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': ''
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_probe_missing_data_key_tenant_superuser(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': ''
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_post_probe_missing_data_key_tenant_user(self):
        data = {
            'name': 'poem-probe',
            'package': 'nagios-plugins-argo (0.1.11)',
            'comment': 'Initial version.',
            'repository': 'https://github.com/ARGOeu/nagios-plugins-argo',
            'docurl': 'https://github.com/ARGOeu/nagios-plugins-argo/blob/'
                      'master/README.md',
            'user': 'testuser',
            'datetime': datetime.datetime.now(),
            'cloned_from': ''
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'], 'You do not have permission to add probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='poem-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(name='poem-probe').count(),
            0
        )

    def test_delete_probe_sp_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'ams-publisher-probe')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'ams-publisher-probe')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(admin_models.Probe.objects.all().count(), 2)
        self.assertRaises(
            admin_models.Probe.DoesNotExist,
            admin_models.Probe.objects.get,
            name='ams-publisher-probe'
        )
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(
                object_id=self.probe3
            ).count(), 0
        )

    def test_delete_probe_sp_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'ams-publisher-probe')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ams-publisher-probe')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(name='ams-publisher-probe')
        assert probe
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(
                object_id=self.probe3
            ).count(), 1
        )

    def test_delete_probe_tenant_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'ams-publisher-probe')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'ams-publisher-probe')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(name='ams-publisher-probe')
        assert probe
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(
                object_id=self.probe3
            ).count(), 1
        )

    def test_delete_probe_tenant_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'ams-publisher-probe')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'ams-publisher-probe')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(name='ams-publisher-probe')
        assert probe
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(
                object_id=self.probe3
            ).count(), 1
        )

    def test_delete_probe_associated_to_metric_template_sp_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'argo-web-api')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'argo-web-api')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'You cannot delete probe that is associated to metric templates.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        assert probe
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 1
        )

    def test_delete_probe_associated_to_metric_template_sp_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'argo-web-api')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo-web-api')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        assert probe
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 1
        )

    def test_delete_probe_associated_to_metric_template_tenant_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'argo-web-api')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'argo-web-api')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        assert probe
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 1
        )

    def test_delete_probe_associated_to_metric_template_tenant_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'argo-web-api')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'argo-web-api')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        probe = admin_models.Probe.objects.get(id=self.probe2.id)
        assert probe
        self.assertEqual(
            admin_models.ProbeHistory.objects.filter(object_id=probe).count(), 1
        )

    def test_delete_probe_without_name_sp_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Probe name not specified.')
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_delete_probe_without_name_sp_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_delete_probe_without_name_tenant_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_delete_probe_without_name_tenant_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_trying_to_delete_nonexisting_probe_sp_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'nonexisting')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Probe does not exist.')
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_trying_to_delete_nonexisting_probe_sp_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'nonexisting')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_trying_to_delete_nonexisting_probe_tenant_superuser(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)

    def test_trying_to_delete_nonexisting_probe_tenant_user(self):
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
        request = self.factory.delete(self.url + 'nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete probes.'
        )
        self.assertEqual(admin_models.Probe.objects.all().count(), 3)
