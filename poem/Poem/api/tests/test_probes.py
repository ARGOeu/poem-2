import datetime
import json
from unittest.mock import patch

from Poem.api import views_internal as views
from Poem.helpers.history_helpers import serialize_metric
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import mail
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

        mth1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=mt1,
            name=mt1.name,
            mtype=mt1.mtype,
            probekey=mt1.probekey,
            parent=mt1.parent,
            probeexecutable=mt1.probeexecutable,
            config=mt1.config,
            attribute=mt1.attribute,
            dependency=mt1.dependency,
            flags=mt1.flags,
            parameter=mt1.parameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )
        mth1.tags.add(metrictag1, metrictag2)

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

        mth2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=mt2,
            name=mt2.name,
            mtype=mt2.mtype,
            probekey=mt2.probekey,
            parent=mt2.parent,
            probeexecutable=mt2.probeexecutable,
            config=mt2.config,
            attribute=mt2.attribute,
            dependency=mt2.dependency,
            flags=mt2.flags,
            parameter=mt2.parameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )
        mth2.tags.add(metrictag1)

        metric1 = poem_models.Metric.objects.create(
            name='argo.API-Check',
            group=group,
            probeversion=pv.__str__(),
            config='["maxCheckAttempts 3", "timeout 120", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]'
        )

        metric2 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            group=group,
            probeversion=pv2.__str__(),
            config='["maxCheckAttempts 3", "timeout 60", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]'
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric1.id,
            serialized_data=serialize_metric(metric1, [metrictag1, metrictag2]),
            object_repr=metric1.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.tenant_superuser.username
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric2.id,
            serialized_data=serialize_metric(metric2, [metrictag1]),
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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(
            serialized_data['probekey'], ['ams-probe-new', '0.1.11']
        )
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
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
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(
            metric.probeversion,
            admin_models.ProbeHistory.objects.filter(
                object_id=probe
            ).order_by('-date_created')[1].__str__()
        )
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['argo-web-api', '0.1.7'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["web-api"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.api_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], "")

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['argo-web-api', '0.1.7'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["web-api"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.api_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], "")

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['argo-web-api', '0.1.7'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["web-api"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.api_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], "")

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['argo-web-api', '0.1.7'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["web-api"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.api_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], "")

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
        self.assertEqual(metric.probeversion, versions[1].__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['argo-web-api', '0.1.7'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["web-api"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.api_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], "")

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
        self.assertEqual(metric.probeversion, versions[0].__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['argo-web-api', '0.1.7'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["web-api"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.api_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], "")

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
        self.assertEqual(metric.probeversion, versions[0].__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['argo-web-api', '0.1.7'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["web-api"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.api_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], "")

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
        self.assertEqual(metric.probeversion, versions[0].__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 120", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.API-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['argo-web-api', '0.1.7'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["web-api"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.api_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], "")

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
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
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
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
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
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
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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
        self.assertEqual(metric.probeversion, version.__str__())
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 3", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 3"]'
        )
        mt_history = poem_models.TenantHistory.objects.filter(
            object_repr='argo.AMS-Check'
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].comment, 'Initial version.')
        serialized_data = json.loads(mt_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], ['Active'])
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], "")
        self.assertEqual(serialized_data['probeexecutable'], '["ams-probe"]')
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(
            serialized_data['attribute'], '["argo.ams_TOKEN --token"]'
        )
        self.assertEqual(serialized_data['dependancy'], "")
        self.assertEqual(serialized_data['flags'], '["OBSESS 1"]')
        self.assertEqual(serialized_data['parameter'], '["--project EGI"]')

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


class ListProbeCandidatesTests(TenantTestCase):
    def setUp(self) -> None:
        self.view = views.ListProbeCandidates.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = "/api/v2/internal/probecandidates/"

        self.user = CustUser.objects.create_user(username="testuser")
        self.superuser = CustUser.objects.create_user(
            username="poem", is_superuser=True
        )

        status_submitted = poem_models.ProbeCandidateStatus.objects.create(
            name="submitted"
        )
        status_testing = poem_models.ProbeCandidateStatus.objects.create(
            name="testing"
        )
        status_deployed = poem_models.ProbeCandidateStatus.objects.create(
            name="deployed"
        )
        status_rejected = poem_models.ProbeCandidateStatus.objects.create(
            name="rejected"
        )
        status_processing = poem_models.ProbeCandidateStatus.objects.create(
            name="processing"
        )

        self.candidate1 = poem_models.ProbeCandidate.objects.create(
            name="test-probe",
            description="Some description for the test probe",
            docurl="https://github.com/ARGOeu-Metrics/argo-probe-test",
            rpm="argo-probe-test-0.1.0-1.el7.noarch.rpm",
            yum_baseurl="http://repo.example.com/devel/centos7/",
            command="/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                    "-t <timeout> --test",
            contact="poem@example.com",
            status=status_testing,
            submitted_sent=True,
            processing_sent=True,
            testing_sent=True,
            service_type="test.service.type",
            devel_url="https://test.argo.grnet.gr/ui/status/test"
        )
        self.candidate2 = poem_models.ProbeCandidate.objects.create(
            name="submitted-probe",
            description="Description of the probe",
            docurl="https://github.com/ARGOeu-Metrics/argo-probe-test",
            script="https://github.com/ARGOeu-Metrics/argo-probe-test/exec/"
                   "probe.py",
            command="/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                    "-t <timeout> --test --flag1 --flag2",
            contact="poem@example.com",
            status=status_submitted,
            submitted_sent=True
        )
        self.candidate3 = poem_models.ProbeCandidate.objects.create(
            name="processing-probe",
            description="Description of the processing probe",
            docurl="https://github.com/ARGOeu-Metrics/argo-probe-test",
            script="https://github.com/ARGOeu-Metrics/argo-probe-test/"
                   "test-probe",
            command="/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                    "-t <timeout> --test --flag1 --flag2 --flag3",
            contact="poem@example.com",
            status=status_processing,
            submitted_sent=True,
            processing_sent=True,
            service_type="processing.service.type"
        )
        self.candidate4 = poem_models.ProbeCandidate.objects.create(
            name="deployed-probe",
            description="Description of the production probe",
            docurl="https://github.com/ARGOeu-Metrics/argo-probe-production",
            script="https://github.com/ARGOeu-Metrics/argo-probe-production/"
                   "probe.sh",
            command="/usr/libexec/argo/probes/test/prod-probe -H <hostname> "
                    "-t <timeout> --prod",
            contact="poem@example.com",
            status=status_deployed,
            submitted_sent=True,
            processing_sent=True,
            testing_sent=True,
            deployed_sent=True,
            service_type="production.service.type",
            production_url="https://production.argo.grnet.gr/ui/status/prod"
        )
        self.candidate5 = poem_models.ProbeCandidate.objects.create(
            name="rejected-probe",
            description="Some description of the probe",
            docurl="https://github.com/ARGOeu-Metrics/argo-probe-bad",
            script="https://github.com/ARGOeu-Metrics/argo-probe-bad/bad.pl",
            command="/usr/libexec/argo/probes/test/test -H <hostname> "
                    "-t <timeout>",
            contact="test@contact.com",
            status=status_rejected,
            submitted_sent=True,
            processing_sent=True,
            testing_sent=True,
            rejected_sent=True,
            service_type="test.service.type",
            devel_url="https://devel.argo.grnet.gr/ui/status/devel",
            rejection_reason="Probe is not working"
        )

    def test_get_probe_candidates_list_if_not_authenticated(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_probe_candidates_list_superuser(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data, [
                {
                    "id": self.candidate4.id,
                    "name": "deployed-probe",
                    "description": "Description of the production probe",
                    "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-"
                              "production",
                    "rpm": "",
                    "yum_baseurl": "",
                    "script": "https://github.com/ARGOeu-Metrics/argo-probe-"
                              "production/probe.sh",
                    "command":
                        "/usr/libexec/argo/probes/test/prod-probe -H <hostname>"
                        " -t <timeout> --prod",
                    "contact": "poem@example.com",
                    "status": "deployed",
                    "service_type": "production.service.type",
                    "devel_url": "",
                    "production_url":
                        "https://production.argo.grnet.gr/ui/status/prod",
                    "rejection_reason": "",
                    "created":
                        self.candidate4.created.strftime("%Y-%m-%d %H:%M:%S"),
                    "last_update": self.candidate4.last_update.strftime(
                        "%Y-%m-%d %H:%M:%S")
                },
                {
                    "id": self.candidate3.id,
                    "name": "processing-probe",
                    "description": "Description of the processing probe",
                    "docurl":
                        "https://github.com/ARGOeu-Metrics/argo-probe-test",
                    "rpm": "",
                    "yum_baseurl": "",
                    "script": "https://github.com/ARGOeu-Metrics/argo-probe-"
                              "test/test-probe",
                    "command":
                        "/usr/libexec/argo/probes/test/test-probe -H <hostname>"
                        " -t <timeout> --test --flag1 --flag2 --flag3",
                    "contact": "poem@example.com",
                    "status": "processing",
                    "service_type": "processing.service.type",
                    "devel_url": "",
                    "production_url": "",
                    "rejection_reason": "",
                    "created":
                        self.candidate3.created.strftime("%Y-%m-%d %H:%M:%S"),
                    "last_update": self.candidate3.last_update.strftime(
                        "%Y-%m-%d %H:%M:%S")
                },
                {
                    "id": self.candidate5.id,
                    "name": "rejected-probe",
                    "description": "Some description of the probe",
                    "docurl":
                        "https://github.com/ARGOeu-Metrics/argo-probe-bad",
                    "rpm": "",
                    "yum_baseurl": "",
                    "script": "https://github.com/ARGOeu-Metrics/argo-probe-"
                              "bad/bad.pl",
                    "command": "/usr/libexec/argo/probes/test/test -H "
                               "<hostname> -t <timeout>",
                    "contact": "test@contact.com",
                    "status": "rejected",
                    "service_type": "test.service.type",
                    "devel_url": "https://devel.argo.grnet.gr/ui/status/devel",
                    "production_url": "",
                    "rejection_reason": "Probe is not working",
                    "created":
                        self.candidate5.created.strftime("%Y-%m-%d %H:%M:%S"),
                    "last_update": self.candidate5.last_update.strftime(
                        "%Y-%m-%d %H:%M:%S")
                },
                {
                    "id": self.candidate2.id,
                    "name": "submitted-probe",
                    "description": "Description of the probe",
                    "docurl":
                        "https://github.com/ARGOeu-Metrics/argo-probe-test",
                    "rpm": "",
                    "yum_baseurl": "",
                    "script": "https://github.com/ARGOeu-Metrics/argo-probe-"
                              "test/exec/probe.py",
                    "command":
                        "/usr/libexec/argo/probes/test/test-probe "
                        "-H <hostname> -t <timeout> --test --flag1 --flag2",
                    "contact": "poem@example.com",
                    "status": "submitted",
                    "service_type": "",
                    "devel_url": "",
                    "production_url": "",
                    "rejection_reason": "",
                    "created":
                        self.candidate2.created.strftime("%Y-%m-%d %H:%M:%S"),
                    "last_update": self.candidate2.last_update.strftime(
                        "%Y-%m-%d %H:%M:%S")
                }, {
                    "id": self.candidate1.id,
                    "name": "test-probe",
                    "description": "Some description for the test probe",
                    "docurl":
                        "https://github.com/ARGOeu-Metrics/argo-probe-test",
                    "rpm": "argo-probe-test-0.1.0-1.el7.noarch.rpm",
                    "yum_baseurl": "http://repo.example.com/devel/centos7/",
                    "script": "",
                    "command":
                        "/usr/libexec/argo/probes/test/test-probe -H <hostname>"
                        " -t <timeout> --test",
                    "contact": "poem@example.com",
                    "status": "testing",
                    "service_type": "test.service.type",
                    "devel_url": "https://test.argo.grnet.gr/ui/status/test",
                    "production_url": "",
                    "rejection_reason": "",
                    "created":
                        self.candidate1.created.strftime("%Y-%m-%d %H:%M:%S"),
                    "last_update": self.candidate1.last_update.strftime(
                        "%Y-%m-%d %H:%M:%S")
                }
            ]
        )

    def test_get_probe_candidates_list_regular_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view probe candidates"
        )

    def test_get_probe_candidate_by_id_superuser(self):
        request = self.factory.get(f"{self.url}{self.candidate1.id}")
        force_authenticate(request, user=self.superuser)
        response = self.view(request, self.candidate1.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data, {
                "id": self.candidate1.id,
                "name": "test-probe",
                "description": "Some description for the test probe",
                "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-test",
                "rpm": "argo-probe-test-0.1.0-1.el7.noarch.rpm",
                "yum_baseurl": "http://repo.example.com/devel/centos7/",
                "script": "",
                "command":
                    "/usr/libexec/argo/probes/test/test-probe -H <hostname>"
                    " -t <timeout> --test",
                "contact": "poem@example.com",
                "status": "testing",
                "service_type": "test.service.type",
                "devel_url": "https://test.argo.grnet.gr/ui/status/test",
                "production_url": "",
                "rejection_reason": "",
                "created":
                    self.candidate1.created.strftime("%Y-%m-%d %H:%M:%S"),
                "last_update":
                    self.candidate1.last_update.strftime("%Y-%m-%d %H:%M:%S")
            }
        )

    def test_get_probe_candidate_by_id_with_prod_url_superuser(self):
        request = self.factory.get(f"{self.url}{self.candidate4.id}")
        force_authenticate(request, user=self.superuser)
        response = self.view(request, self.candidate4.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data, {
                "id": self.candidate4.id,
                "name": "deployed-probe",
                "description": "Description of the production probe",
                "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-"
                          "production",
                "rpm": "",
                "yum_baseurl": "",
                "script": "https://github.com/ARGOeu-Metrics/argo-probe-"
                          "production/probe.sh",
                "command":
                    "/usr/libexec/argo/probes/test/prod-probe -H <hostname>"
                    " -t <timeout> --prod",
                "contact": "poem@example.com",
                "status": "deployed",
                "service_type": "production.service.type",
                "devel_url": "",
                "production_url":
                    "https://production.argo.grnet.gr/ui/status/prod",
                "rejection_reason": "",
                "created":
                    self.candidate4.created.strftime("%Y-%m-%d %H:%M:%S"),
                "last_update": self.candidate4.last_update.strftime(
                    "%Y-%m-%d %H:%M:%S")
            }
        )

    def test_get_probe_candidate_by_id_with_rejection_superuser(self):
        request = self.factory.get(f"{self.url}{self.candidate5.id}")
        force_authenticate(request, user=self.superuser)
        response = self.view(request, self.candidate5.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data, {
                "id": self.candidate5.id,
                "name": "rejected-probe",
                "description": "Some description of the probe",
                "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-bad",
                "rpm": "",
                "yum_baseurl": "",
                "script": "https://github.com/ARGOeu-Metrics/argo-probe-bad/"
                          "bad.pl",
                "command":
                    "/usr/libexec/argo/probes/test/test -H <hostname> "
                    "-t <timeout>",
                "contact": "test@contact.com",
                "status": "rejected",
                "service_type": "test.service.type",
                "devel_url": "https://devel.argo.grnet.gr/ui/status/devel",
                "production_url": "",
                "rejection_reason": "Probe is not working",
                "created":
                    self.candidate5.created.strftime("%Y-%m-%d %H:%M:%S"),
                "last_update": self.candidate5.last_update.strftime(
                    "%Y-%m-%d %H:%M:%S")
            }
        )

    def test_get_probe_candidate_by_id_regular_user(self):
        request = self.factory.get(f"{self.url}{self.candidate1.id}")
        force_authenticate(request, user=self.user)
        response = self.view(request, self.candidate1.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view probe candidates"
        )

    def test_get_probe_candidate_by_nonexisting_id_superuser(self):
        cid = self.candidate1.id + self.candidate2.id
        request = self.factory.get(f"{self.url}{cid}")
        force_authenticate(request, user=self.superuser)
        response = self.view(request, cid)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Probe candidate not found")

    def test_get_probe_candidate_by_nonexisting_id_regular_user(self):
        cid = self.candidate1.id + self.candidate2.id
        request = self.factory.get(f"{self.url}{cid}")
        force_authenticate(request, user=self.user)
        response = self.view(request, cid)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view probe candidates"
        )

    def test_put_probe_candidate_deployed_superuser(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "deployed",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe deployed"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

the probe 'new-probe' has been deployed to production.

You can see the results here: https://production.argo.grnet.gr/ui/status/new

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["meh@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "new-probe")
            self.assertEqual(
                candidate.description,
                "More detailed description for the new probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-new"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-new-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/rocky8/"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "deployed")
            self.assertEqual(candidate.service_type, "some.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(
                candidate.production_url,
                "https://production.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(candidate.rejection_reason, "")
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertTrue(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_deployed_empty_name_superuser(self):
        data = {
            "id": self.candidate1.id,
            "name": "",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "deployed",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(response.data["detail"], "Name is mandatory")
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "test-probe")
            self.assertEqual(
                candidate.description, "Some description for the test probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-test-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/centos7/"
            )
            self.assertEqual(candidate.script, None)
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "testing")
            self.assertEqual(candidate.service_type, "test.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/test"
            )
            self.assertEqual(candidate.production_url, None)
            self.assertEqual(candidate.rejection_reason, None)
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_deployed_empty_production_url_superuser(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "deployed",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Production URL is mandatory when probe status is 'deployed'"
            )
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "test-probe")
            self.assertEqual(
                candidate.description, "Some description for the test probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-test-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/centos7/"
            )
            self.assertEqual(candidate.script, None)
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "testing")
            self.assertEqual(candidate.service_type, "test.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/test"
            )
            self.assertEqual(candidate.production_url, None)
            self.assertEqual(candidate.rejection_reason, None)
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_processing_superuser(self):
        data = {
            "id": self.candidate2.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "https://github.com/ARGOeu-Metrics/argo-probe-test/exec"
                      "/probe2.py",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "processing",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe processing"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

we have started setting up the probe 'new-probe' for testing.

Please add a new monitoring extension for your service with service type some.service.type in https://providers.eosc-portal.eu

You will receive more information after the probe has been deployed to devel infrastructure.

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["meh@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate2.id
            )
            self.assertEqual(candidate.name, "new-probe")
            self.assertEqual(
                candidate.description,
                "More detailed description for the new probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-new"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-new-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/rocky8/"
            )
            self.assertEqual(
                candidate.script,
                "https://github.com/ARGOeu-Metrics/argo-probe-test/exec/"
                "probe2.py"
            )
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "processing")
            self.assertEqual(candidate.service_type, "some.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(
                candidate.production_url,
                "https://production.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(candidate.rejection_reason, "")
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertFalse(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_processing_empty_service_type_superuser(self):
        data = {
            "id": self.candidate2.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "https://github.com/ARGOeu-Metrics/argo-probe-test/exec"
                      "/probe2.py",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "processing",
            "service_type": "",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Service type is mandatory when probe status is 'processing'"
            )
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate2.id
            )
            self.assertEqual(candidate.name, "submitted-probe")
            self.assertEqual(candidate.description, "Description of the probe")
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(candidate.rpm, "")
            self.assertEqual(candidate.yum_baseurl, "")
            self.assertEqual(
                candidate.script,
                "https://github.com/ARGOeu-Metrics/argo-probe-test/exec/"
                "probe.py"
            )
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test --flag1 --flag2",
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "submitted")
            self.assertEqual(candidate.service_type, None)
            self.assertEqual(candidate.devel_url, None)
            self.assertEqual(candidate.production_url, None)
            self.assertEqual(candidate.rejection_reason, None)
            self.assertTrue(candidate.submitted_sent)
            self.assertFalse(candidate.processing_sent)
            self.assertFalse(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_testing_superuser(self):
        data = {
            "id": self.candidate3.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "https://github.com/ARGOeu-Metrics/argo-probe-test/"
                      "meh.pl",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "testing",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe testing"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

the probe 'new-probe' has been deployed to devel infrastructure.

You can see the results here: https://test.argo.grnet.gr/ui/status/new

The probe will be running in the devel infrastructure for a couple of days, and will be moved to production once we make sure it is working properly.

You will receive final email once the probe has been deployed to production infrastructure.

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["meh@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate3.id
            )
            self.assertEqual(candidate.name, "new-probe")
            self.assertEqual(
                candidate.description,
                "More detailed description for the new probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-new"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-new-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/rocky8/"
            )
            self.assertEqual(
                candidate.script,
                "https://github.com/ARGOeu-Metrics/argo-probe-test/meh.pl"
            )
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "testing")
            self.assertEqual(candidate.service_type, "some.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(
                candidate.production_url,
                "https://production.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(candidate.rejection_reason, "")
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_testing_empty_devel_url_superuser(self):
        data = {
            "id": self.candidate3.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "https://github.com/ARGOeu-Metrics/argo-probe-test/"
                      "meh.pl",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "testing",
            "service_type": "some.service.type",
            "devel_url": "",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Devel URL is mandatory when probe status is 'testing'"
            )
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate3.id
            )
            self.assertEqual(candidate.name, "processing-probe")
            self.assertEqual(
                candidate.description, "Description of the processing probe"
            )
            self.assertEqual(
                candidate.script,
                "https://github.com/ARGOeu-Metrics/argo-probe-test/test-probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(candidate.rpm, "")
            self.assertEqual(candidate.yum_baseurl, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test --flag1 --flag2 --flag3"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "processing")
            self.assertEqual(candidate.service_type, "processing.service.type")
            self.assertEqual(candidate.devel_url, None)
            self.assertEqual(candidate.production_url, None)
            self.assertEqual(candidate.rejection_reason, None)
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertFalse(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_rejected_superuser(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "rejected",
            "service_type": "some.service.type",
            "devel_url": "",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": "The probe is not stable."
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe rejected"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

the probe 'new-probe' has been rejected for the following reason:

The probe is not stable.

If you make the necessary changes to the probe, please submit the new version.

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["meh@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "new-probe")
            self.assertEqual(
                candidate.description,
                "More detailed description for the new probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-new"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-new-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/rocky8/"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "rejected")
            self.assertEqual(candidate.service_type, "some.service.type")
            self.assertEqual(candidate.devel_url, "")
            self.assertEqual(
                candidate.production_url,
                "https://production.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(
                candidate.rejection_reason, "The probe is not stable."
            )
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertTrue(candidate.rejected_sent)

    def test_put_probe_candidate_rejected_empty_reason_superuser(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "rejected",
            "service_type": "some.service.type",
            "devel_url": "",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Rejection reason is mandatory when probe status is 'rejected'"
            )
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "test-probe")
            self.assertEqual(
                candidate.description, "Some description for the test probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-test-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/centos7/"
            )
            self.assertEqual(candidate.script, None)
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "testing")
            self.assertEqual(candidate.service_type, "test.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/test"
            )
            self.assertEqual(candidate.production_url, None)
            self.assertEqual(candidate.rejection_reason, None)
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_processing_if_mail_already_sent_superusr(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "processing",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "new-probe")
            self.assertEqual(
                candidate.description,
                "More detailed description for the new probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-new"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-new-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/rocky8/"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "processing")
            self.assertEqual(candidate.service_type, "some.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(
                candidate.production_url,
                "https://production.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(candidate.rejection_reason, "")
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_submitted_if_mail_already_sent_superuser(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "submitted",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "new-probe")
            self.assertEqual(
                candidate.description,
                "More detailed description for the new probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-new"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-new-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/rocky8/"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "submitted")
            self.assertEqual(candidate.service_type, "some.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(
                candidate.production_url,
                "https://production.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(candidate.rejection_reason, "")
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_testing_if_mail_already_sent_superuser(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "testing",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "new-probe")
            self.assertEqual(
                candidate.description,
                "More detailed description for the new probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-new"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-new-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/rocky8/"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "testing")
            self.assertEqual(candidate.service_type, "some.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(
                candidate.production_url,
                "https://production.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(candidate.rejection_reason, "")
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_deployed_if_mail_already_sent_superuser(self):
        data = {
            "id": self.candidate4.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "deployed",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate4.id
            )
            self.assertEqual(candidate.name, "new-probe")
            self.assertEqual(
                candidate.description,
                "More detailed description for the new probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-new"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-new-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/rocky8/"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "deployed")
            self.assertEqual(candidate.service_type, "some.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(
                candidate.production_url,
                "https://production.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(candidate.rejection_reason, "")
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertTrue(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_rejected_if_mail_already_sent_superuser(self):
        data = {
            "id": self.candidate5.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "rejected",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": "Not working properly"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate5.id
            )
            self.assertEqual(candidate.name, "new-probe")
            self.assertEqual(
                candidate.description,
                "More detailed description for the new probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-new"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-new-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/rocky8/"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "test@contact.com")
            self.assertEqual(candidate.status.name, "rejected")
            self.assertEqual(candidate.service_type, "some.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(
                candidate.production_url,
                "https://production.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(candidate.rejection_reason, "Not working properly")
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertTrue(candidate.rejected_sent)

    def test_put_probe_candidate_regular_user(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the test probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "deployed",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(
                response.data["detail"],
                "You do not have permission to modify probe candidates"
            )
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "test-probe")
            self.assertEqual(
                candidate.description, "Some description for the test probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-test-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/centos7/"
            )
            self.assertEqual(candidate.script, None)
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "testing")
            self.assertEqual(candidate.service_type, "test.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/test"
            )
            self.assertEqual(candidate.production_url, None)
            self.assertEqual(candidate.rejection_reason, None)
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_nonexisting_id_superuser(self):
        data = {
            "id": self.candidate1.id + self.candidate2.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "deployed",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(
                response.data["detail"], "Probe candidate not found"
            )
            self.assertEqual(len(mail.outbox), 0)

    def test_put_probe_candidate_nonexisting_id_regular_user(self):
        data = {
            "id": self.candidate1.id + self.candidate2.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "deployed",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(
                response.data["detail"],
                "You do not have permission to modify probe candidates"
            )
            self.assertEqual(len(mail.outbox), 0)

    def test_put_probe_candidate_nonexisting_status_superuser(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "nonexisting",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(
                response.data["detail"], "Probe candidate status not found"
            )
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "test-probe")
            self.assertEqual(
                candidate.description, "Some description for the test probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-test-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/centos7/"
            )
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "testing")
            self.assertEqual(candidate.service_type, "test.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/test"
            )
            self.assertEqual(candidate.production_url, None)
            self.assertEqual(candidate.rejection_reason, None)
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_nonexisting_status_regular_user(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "nonexisting",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.user)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(
                response.data["detail"],
                "You do not have permission to modify probe candidates"
            )
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "test-probe")
            self.assertEqual(
                candidate.description, "Some description for the test probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-test-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/centos7/"
            )
            self.assertEqual(candidate.script, None)
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "testing")
            self.assertEqual(candidate.service_type, "test.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/test"
            )
            self.assertEqual(candidate.production_url, None)
            self.assertEqual(candidate.rejection_reason, None)
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_put_probe_candidate_missing_key_superuser(self):
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "deployed",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"], "Missing data key: docurl"
            )
            self.assertEqual(len(mail.outbox), 0)
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "test-probe")
            self.assertEqual(
                candidate.description, "Some description for the test probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-test-0.1.0-1.el7.noarch.rpm",
            )
            self.assertEqual(
                candidate.yum_baseurl, "http://repo.example.com/devel/centos7/"
            )
            self.assertEqual(candidate.script, None)
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "testing")
            self.assertEqual(candidate.service_type, "test.service.type")
            self.assertEqual(
                candidate.devel_url, "https://test.argo.grnet.gr/ui/status/test"
            )
            self.assertEqual(candidate.production_url, None)
            self.assertEqual(candidate.rejection_reason, None)
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    @patch("Poem.api.internal_views.probes.EmailMessage.send")
    def test_put_probe_candidate_superuser_mail_exception(self, mock_send):
        mock_send.side_effect = Exception("Error sending email")
        data = {
            "id": self.candidate1.id,
            "name": "new-probe",
            "description": "More detailed description for the new probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-new",
            "rpm": "argo-probe-new-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "http://repo.example.com/devel/rocky8/",
            "script": "https://github.com/ARGOeu-Metrics/argo-probe-new/script",
            "command": "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                       "-t <timeout> --test",
            "contact": "meh@example.com",
            "status": "deployed",
            "service_type": "some.service.type",
            "devel_url": "https://test.argo.grnet.gr/ui/status/new",
            "production_url": "https://production.argo.grnet.gr/ui/status/new",
            "rejection_reason": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(
                response.data["warning"],
                "Probe candidate has been successfully modified, but the email "
                "was not sent: Error sending email"
            )
            candidate = poem_models.ProbeCandidate.objects.get(
                id=self.candidate1.id
            )
            self.assertEqual(candidate.name, "new-probe")
            self.assertEqual(
                candidate.description,
                "More detailed description for the new probe"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-new"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-new-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl,
                "http://repo.example.com/devel/rocky8/"
            )
            self.assertEqual(
                candidate.script,
                "https://github.com/ARGOeu-Metrics/argo-probe-new/script"
            )
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/test/new-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "deployed")
            self.assertEqual(candidate.service_type, "some.service.type")
            self.assertEqual(
                candidate.devel_url,
                "https://test.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(
                candidate.production_url,
                "https://production.argo.grnet.gr/ui/status/new"
            )
            self.assertEqual(candidate.rejection_reason, "")
            self.assertTrue(candidate.submitted_sent)
            self.assertTrue(candidate.processing_sent)
            self.assertTrue(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)

    def test_delete_probe_candidate_superuser(self):
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)
        request = self.factory.delete(f"{self.url}/{self.candidate5.id}")
        force_authenticate(request, user=self.superuser)
        response = self.view(request, f"{self.candidate5.id}")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 4)
        self.assertRaises(
            poem_models.ProbeCandidate.DoesNotExist,
            poem_models.ProbeCandidate.objects.get,
            id=self.candidate5.id
        )

    def test_delete_probe_candidate_regular_user(self):
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)
        request = self.factory.delete(f"{self.url}/{self.candidate5.id}")
        force_authenticate(request, user=self.user)
        response = self.view(request, f"{self.candidate5.id}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete probe candidates"
        )
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)

    def test_delete_probe_candidate_without_id_superuser(self):
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"], "Probe candidate ID not specified"
        )
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)

    def test_delete_probe_candidate_without_id_regular_user(self):
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete probe candidates"
        )
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)

    def test_delete_nonexisting_probe_candidate_superuser(self):
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)
        request = self.factory.delete(
            f"{self.url}/{self.candidate1.id + self.candidate5.id}"
        )
        force_authenticate(request, user=self.superuser)
        response = self.view(
            request, f"{self.candidate1.id + self.candidate5.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data["detail"], "Probe candidate does not exist"
        )
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)

    def test_delete_nonexisting_probe_candidate_regular_user(self):
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)
        request = self.factory.delete(
            f"{self.url}/{self.candidate1.id + self.candidate5.id}"
        )
        force_authenticate(request, user=self.user)
        response = self.view(
            request, f"{self.candidate1.id + self.candidate5.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete probe candidates"
        )
        self.assertEqual(poem_models.ProbeCandidate.objects.all().count(), 5)


class ListProbeCandidateStatuses(TenantTestCase):
    def setUp(self) -> None:
        self.view = views.ListProbeCandidateStatuses.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = "/api/v2/internal/probecandidatestatuses/"

        self.user = CustUser.objects.create_user(username="testuser")
        self.superuser = CustUser.objects.create_user(
            username="poem", is_superuser=True
        )

        self.status1 = poem_models.ProbeCandidateStatus.objects.create(
            name="submitted"
        )
        self.status2 = poem_models.ProbeCandidateStatus.objects.create(
            name="testing"
        )
        self.status3 = poem_models.ProbeCandidateStatus.objects.create(
            name="deployed"
        )
        self.status4 = poem_models.ProbeCandidateStatus.objects.create(
            name="rejected"
        )

    def test_get_probe_candidate_statuses_if_not_authenticated(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_probe_candidate_statuses_superuser(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data, ["deployed", "rejected", "submitted", "testing"]
        )

    def test_get_probe_candidate_statuses_regular_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view probe candidate statuses"
        )
