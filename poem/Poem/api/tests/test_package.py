import datetime
import json

from Poem.api import views_internal as views
from Poem.helpers.history_helpers import serialize_metric
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from django_tenants.utils import schema_context, get_public_schema_name, \
    get_tenant_domain_model
from rest_framework import status
from rest_framework.test import force_authenticate

from .utils_test import encode_data


class ListPackagesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListPackages.as_view()
        self.url = '/api/v2/internal/packages/'
        self.tenant_user = CustUser.objects.create_user(username='testuser')
        self.tenant_superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )

        with schema_context(get_public_schema_name()):
            self.public_tenant = Tenant.objects.create(
                name='public', schema_name=get_public_schema_name()
            )
            get_tenant_domain_model().objects.create(
                domain='public', tenant=self.public_tenant, is_primary=True
            )
            self.user = CustUser.objects.create_user(username='testuser')
            self.superuser = CustUser.objects.create_user(
                username='poem', is_superuser=True
            )

        self.tag1 = admin_models.OSTag.objects.create(name='CentOS 6')
        self.tag2 = admin_models.OSTag.objects.create(name='CentOS 7')
        self.repo1 = admin_models.YumRepo.objects.create(
            name='repo-1', tag=self.tag1
        )
        self.repo2 = admin_models.YumRepo.objects.create(
            name='repo-2', tag=self.tag2
        )

        self.package1 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.11'
        )
        self.package1.repos.add(self.repo1, self.repo2)

        self.package2 = admin_models.Package.objects.create(
            name='nagios-plugins-globus',
            version='0.1.5'
        )
        self.package2.repos.add(self.repo2)

        self.package3 = admin_models.Package.objects.create(
            name='nagios-plugins-fedcloud',
            version='0.5.0'
        )
        self.package3.repos.add(self.repo2)

        self.package4 = admin_models.Package.objects.create(
            name='nagios-plugins-http',
            use_present_version=True
        )
        self.package4.repos.add(self.repo1, self.repo2)

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            package=self.package1,
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user='testuser',
            datetime=datetime.datetime.now()
        )

        pv1 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            version_comment='Initial version.',
            version_user=self.user.username
        )

        mtype = admin_models.MetricTemplateType.objects.create(name='Active')

        group = poem_models.GroupOfMetrics.objects.create(name='TEST')

        ct = ContentType.objects.get_for_model(poem_models.Metric)

        mtag1 = admin_models.MetricTags.objects.create(name='test_tag1')

        mt = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=mtype,
            probekey=pv1,
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        mt.tags.add(mtag1)

        mth1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=mt,
            name=mt.name,
            mtype=mt.mtype,
            probekey=mt.probekey,
            parent=mt.parent,
            probeexecutable=mt.probeexecutable,
            config=mt.config,
            attribute=mt.attribute,
            dependency=mt.dependency,
            flags=mt.flags,
            parameter=mt.parameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )
        mth1.tags.add(mtag1)

        metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            group=group,
            probeversion=pv1.__str__(),
            config='["maxCheckAttempts 3", "timeout 60", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 5", "retryInterval 3"]'
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric1.id,
            serialized_data=serialize_metric(metric1, [mtag1]),
            object_repr=metric1.__str__(),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

    def test_get_list_of_packages_super(self):
        with schema_context(get_public_schema_name()):
            request = self.factory.get(self.url)
            force_authenticate(request, user=self.user)
            response = self.view(request)
            data = response.data
            for item in data:
                item["repos"] = sorted(item["repos"])

            self.assertEqual(
                data,
                [
                    {
                        'id': self.package1.id,
                        'name': 'nagios-plugins-argo',
                        'version': '0.1.11',
                        'use_present_version': False,
                        'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
                    },
                    {
                        'id': self.package3.id,
                        'name': 'nagios-plugins-fedcloud',
                        'version': '0.5.0',
                        'use_present_version': False,
                        'repos': ['repo-2 (CentOS 7)']
                    },
                    {
                        'id': self.package2.id,
                        'name': 'nagios-plugins-globus',
                        'version': '0.1.5',
                        'use_present_version': False,
                        'repos': ['repo-2 (CentOS 7)']
                    },
                    {
                        'id': self.package4.id,
                        'name': 'nagios-plugins-http',
                        'version': 'present',
                        'use_present_version': True,
                        'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
                    }
                ]
            )

    def test_get_list_of_packages_tenant(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.package1.id,
                    'name': 'nagios-plugins-argo',
                    'version': '0.1.11',
                    'use_present_version': False,
                    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
                }
            ]
        )

    def test_access_denied_if_no_authn(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_package_by_name_and_version(self):
        request = self.factory.get(self.url + 'nagios-plugins-argo-0.1.11')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-argo-0.1.11')
        self.assertEqual(
            response.data,
            {
                'id': self.package1.id,
                'name': 'nagios-plugins-argo',
                'version': '0.1.11',
                'use_present_version': False,
                'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
            }
        )

    def test_get_package_by_name_if_present_version(self):
        request = self.factory.get(self.url + 'nagios-plugins-http-present')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-http-present')
        self.assertEqual(
            response.data,
            {
                'id': self.package4.id,
                'name': 'nagios-plugins-http',
                'version': 'present',
                'use_present_version': True,
                'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
            }
        )

    def test_get_package_by_nonexisting_name_and_version(self):
        request = self.factory.get(self.url + 'nonexisting-0.1.1')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting-0.1.1')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Package not found.'})

    def test_post_package_sp_superuser(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(admin_models.Package.objects.all().count(), 5)
        package = admin_models.Package.objects.get(
            name='nagios-plugins-activemq', version='1.0.0'
        )
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())

    def test_post_package_sp_user(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-activemq', version='1.0.0'
        )

    def test_post_package_tenant_superuser(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-activemq', version='1.0.0'
        )

    def test_post_package_tenant_user(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-activemq', version='1.0.0'
        )

    def test_post_package_with_present_version_sp_superuser(self):
        data = {
            'name': 'nagios-plugins-tcp',
            'version': '2.2.2',
            'use_present_version': True,
            'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(admin_models.Package.objects.all().count(), 5)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-tcp', version='2.2.2'
        )
        package = admin_models.Package.objects.get(
            name='nagios-plugins-tcp', version='present'
        )
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())

    def test_post_package_with_present_version_sp_user(self):
        data = {
            'name': 'nagios-plugins-tcp',
            'version': '2.2.2',
            'use_present_version': True,
            'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-tcp', version='present'
        )

    def test_post_package_with_present_version_tenant_superuser(self):
        data = {
            'name': 'nagios-plugins-tcp',
            'version': '2.2.2',
            'use_present_version': True,
            'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-tcp', version='present'
        )

    def test_post_package_with_present_version_tenant_user(self):
        data = {
            'name': 'nagios-plugins-tcp',
            'version': '2.2.2',
            'use_present_version': True,
            'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-tcp', version='present'
        )

    def test_post_package_with_name_and_version_which_already_exist_sp_sprusr(
            self
    ):
        data = {
            'name': 'nagios-plugins-argo',
            'version': '0.1.11',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 6)']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'Package with this name and version already exists.'
        )

    def test_post_package_with_name_and_version_which_already_exist_sp_user(
            self
    ):
        data = {
            'name': 'nagios-plugins-argo',
            'version': '0.1.11',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 6)']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_name_and_version_which_already_exist_ten_spusr(
            self
    ):
        data = {
            'name': 'nagios-plugins-argo',
            'version': '0.1.11',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 6)']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_name_and_version_which_already_exist_ten_user(
            self
    ):
        data = {
            'name': 'nagios-plugins-argo',
            'version': '0.1.11',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 6)']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_name_that_exists_and_new_version_sp_superuser(
            self
    ):
        data = {
            'name': 'nagios-plugins-argo',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(admin_models.Package.objects.all().count(), 5)
        package = admin_models.Package.objects.get(
            name='nagios-plugins-argo', version='0.1.7'
        )
        self.assertEqual(package.repos.all().count(), 1)
        self.assertTrue(self.repo2 in package.repos.all())

    def test_post_package_with_name_that_exists_and_new_version_sp_user(self):
        data = {
            'name': 'nagios-plugins-argo',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-argo', version='0.1.7'
        )

    def test_post_package_with_name_that_exists_and_new_version_tenant_superusr(
            self
    ):
        data = {
            'name': 'nagios-plugins-argo',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-argo', version='0.1.7'
        )

    def test_post_package_with_name_that_exists_and_new_version_tenant_user(
            self
    ):
        data = {
            'name': 'nagios-plugins-argo',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-argo', version='0.1.7'
        )

    def test_post_package_with_with_repo_without_tag_sp_superuser(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'YUM repo tag should be specified.'
        )

    def test_post_package_with_with_repo_without_tag_sp_user(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_repo_without_tag_tenant_superuser(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_repo_without_tag_tenant_user(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_nonexisting_repo_sp_superuser(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['nonexisting (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'YUM repo does not exist.')

    def test_post_package_with_with_nonexisting_repo_sp_user(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['nonexisting (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_nonexisting_repo_tenant_superuser(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['nonexisting (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_nonexisting_repo_tenant_user(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['nonexisting (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_nonexisting_tag_sp_superuser(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1 (nonexisting)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'OS tag does not exist.')

    def test_post_package_with_with_nonexisting_tag_sp_user(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1 (nonexisting)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_nonexisting_tag_tenant_superuser(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1 (nonexisting)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_nonexisting_tag_tenant_user(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'version': '1.0.0',
            'use_present_version': False,
            'repos': ['repo-1 (nonexisting)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_missing_data_key_sp_superuser(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: version')

    def test_post_package_with_with_missing_data_key_sp_user(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_missing_data_key_tenant_superuser(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_post_package_with_with_missing_data_key_tenant_user(self):
        data = {
            'name': 'nagios-plugins-activemq',
            'use_present_version': False,
            'repos': ['repo-1 (CentOS 7)']
        }
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add packages.'
        )

    def test_put_package_sp_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo2')
        self.assertEqual(package.version, '0.1.7')
        self.assertEqual(package.repos.all().count(), 1)
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.7'])

    def test_put_package_sp_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_tenant_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_tenant_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_present_version_sp_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': True,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo2')
        self.assertEqual(package.version, 'present')
        self.assertEqual(package.repos.all().count(), 1)
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', 'present'])

    def test_put_package_with_present_version_sp_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': True,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_present_version_tenant_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': True,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_present_version_tenant_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': True,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_new_repo_sp_superuser(self):
        repo = admin_models.YumRepo.objects.create(name='repo-3', tag=self.tag1)
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)', 'repo-3 (CentOS 6)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo2')
        self.assertEqual(package.version, '0.1.7')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo2 in package.repos.all())
        self.assertTrue(repo in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.7'])

    def test_put_package_with_new_repo_sp_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)', 'repo-3 (CentOS 6)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_new_repo_tenant_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)', 'repo-3 (CentOS 6)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_new_repo_tenant_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo2',
            'version': '0.1.7',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)', 'repo-3 (CentOS 6)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_already_existing_name_and_version_sp_sprusr(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-globus',
            'version': '0.1.5',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'Package with this name and version already exists.'
        )

    def test_put_package_with_already_existing_name_and_version_sp_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-globus',
            'version': '0.1.5',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package2.id)
        self.assertEqual(package.name, 'nagios-plugins-globus')
        self.assertEqual(package.version, '0.1.5')
        self.assertEqual(package.repos.all().count(), 1)
        self.assertTrue(self.repo2 in package.repos.all())

    def test_put_package_with_already_existing_name_and_version_ten_spusr(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-globus',
            'version': '0.1.5',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package2.id)
        self.assertEqual(package.name, 'nagios-plugins-globus')
        self.assertEqual(package.version, '0.1.5')
        self.assertEqual(package.repos.all().count(), 1)
        self.assertTrue(self.repo2 in package.repos.all())

    def test_put_package_with_already_existing_name_and_version_ten_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-globus',
            'version': '0.1.5',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package2.id)
        self.assertEqual(package.name, 'nagios-plugins-globus')
        self.assertEqual(package.version, '0.1.5')
        self.assertEqual(package.repos.all().count(), 1)
        self.assertTrue(self.repo2 in package.repos.all())

    def test_put_package_with_repo_without_tag_sp_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-1']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'detail': 'YUM repo tag should be specified.'}
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_repo_without_tag_sp_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-1']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_repo_without_tag_tenant_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-1']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_repo_without_tag_tenant_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-1']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_nonexisting_repo_sp_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['nonexisting (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'YUM repo does not exist.')
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_nonexisting_repo_sp_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['nonexisting (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_nonexisting_repo_tenant_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['nonexisting (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_nonexisting_repo_tenant_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['nonexisting (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_nonexisting_tag_sp_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-1 (nonexisting)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'OS tag does not exist.')
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_nonexisting_tag_sp_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-1 (nonexisting)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_nonexisting_tag_tenant_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-1 (nonexisting)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_nonexisting_tag_tenant_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-1 (nonexisting)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_missing_data_key_sp_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: version')
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_missing_data_key_sp_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_missing_data_key_tenant_superuser(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_missing_data_key_tenant_user(self):
        data = {
            'id': self.package1.id,
            'name': 'nagios-plugins-argo',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )
        package = admin_models.Package.objects.get(id=self.package1.id)
        self.assertEqual(package.name, 'nagios-plugins-argo')
        self.assertEqual(package.version, '0.1.11')
        self.assertEqual(package.repos.all().count(), 2)
        self.assertTrue(self.repo1 in package.repos.all())
        self.assertTrue(self.repo2 in package.repos.all())
        probe = admin_models.Probe.objects.get(name='ams-probe')
        self.assertEqual(probe.package, package)
        probe_history = admin_models.ProbeHistory.objects.filter(
            object_id=probe
        ).order_by('-date_created')
        self.assertEqual(probe_history.count(), 1)
        self.assertEqual(probe_history[0].package, probe.package)
        mt = admin_models.MetricTemplate.objects.get(name='argo.AMS-Check')
        self.assertEqual(mt.probekey, probe_history[0])
        mt_history = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(mt_history.count(), 1)
        self.assertEqual(mt_history[0].probekey, probe_history[0])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        self.assertEqual(metric.probeversion, probe_history[0].__str__())
        metric_history = poem_models.TenantHistory.objects.filter(
            object_repr=metric.__str__()
        ).order_by('-date_created')
        self.assertEqual(metric_history.count(), 1)
        serialized_data = \
            json.loads(metric_history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['probekey'], ['ams-probe', '0.1.11'])

    def test_put_package_with_nonexisting_package_sp_superuser(self):
        data = {
            'id': '999',
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Package does not exist.')

    def test_put_package_with_nonexisting_package_sp_user(self):
        data = {
            'id': '999',
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )

    def test_put_package_with_nonexisting_package_tenant_superuser(self):
        data = {
            'id': '999',
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )

    def test_put_package_with_nonexisting_package_tenant_user(self):
        data = {
            'id': '999',
            'name': 'nagios-plugins-argo',
            'version': '0.1.12',
            'use_present_version': False,
            'repos': ['repo-2 (CentOS 7)']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change packages.'
        )

    def test_delete_package_sp_superuser(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nagios-plugins-globus-0.1.5')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nagios-plugins-globus-0.1.5')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertRaises(
            admin_models.Package.DoesNotExist,
            admin_models.Package.objects.get,
            name='nagios-plugins-globus'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 3)

    def test_delete_package_sp_user(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nagios-plugins-globus-0.1.5')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-globus-0.1.5')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete packages.'
        )
        package = admin_models.Package.objects.get(name='nagios-plugins-globus')
        assert package
        self.assertEqual(admin_models.Package.objects.all().count(), 4)

    def test_delete_package_tenant_superuser(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nagios-plugins-globus-0.1.5')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'nagios-plugins-globus-0.1.5')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete packages.'
        )
        package = admin_models.Package.objects.get(name='nagios-plugins-globus')
        assert package
        self.assertEqual(admin_models.Package.objects.all().count(), 4)

    def test_delete_package_tenant_user(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nagios-plugins-globus-0.1.5')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'nagios-plugins-globus-0.1.5')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete packages.'
        )
        package = admin_models.Package.objects.get(name='nagios-plugins-globus')
        assert package
        self.assertEqual(admin_models.Package.objects.all().count(), 4)

    def test_delete_package_with_associated_probe_sp_superuser(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nagios-plugins-argo-0.1.11')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nagios-plugins-argo-0.1.11')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'You cannot delete package with associated probes.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)

    def test_delete_package_with_associated_probe_sp_user(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nagios-plugins-argo-0.1.11')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-argo-0.1.11')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)

    def test_delete_package_with_associated_probe_tenant_superuser(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nagios-plugins-argo-0.1.11')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'nagios-plugins-argo-0.1.11')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)

    def test_delete_package_with_associated_probe_tenant_user(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nagios-plugins-argo-0.1.11')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'nagios-plugins-argo-0.1.11')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)

    def test_delete_nonexisting_package_sp_superuser(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nonexisting-0.1.1')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting-0.1.1')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Package does not exist.')
        self.assertEqual(admin_models.Package.objects.all().count(), 4)

    def test_delete_nonexisting_package_sp_user(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nonexisting-0.1.1')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting-0.1.1')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)

    def test_delete_nonexisting_package_tenant_superuser(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nonexisting-0.1.1')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'nonexisting-0.1.1')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)

    def test_delete_nonexisting_package_tenant_user(self):
        self.assertEqual(admin_models.Package.objects.all().count(), 4)
        request = self.factory.delete(self.url + 'nonexisting-0.1.1')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'nonexisting-0.1.1')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete packages.'
        )
        self.assertEqual(admin_models.Package.objects.all().count(), 4)


class ListPackagesVersionsTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListPackagesVersions.as_view()
        self.url = '/api/v2/internal/packageversions/'
        self.user = CustUser.objects.create_user(username='testuser')

        with schema_context(get_public_schema_name()):
            tenant = Tenant.objects.create(
                name='public', schema_name=get_public_schema_name()
            )
            get_tenant_domain_model().objects.create(
                domain='public', tenant=tenant, is_primary=True
            )

        tag1 = admin_models.OSTag.objects.create(name='CentOS 6')
        tag2 = admin_models.OSTag.objects.create(name='CentOS 7')

        repo1 = admin_models.YumRepo.objects.create(
            name='repo-1', tag=tag1
        )
        repo2 = admin_models.YumRepo.objects.create(
            name='repo-2', tag=tag2
        )

        self.package1 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.7'
        )
        self.package1.repos.add(repo1, repo2)

        self.package2 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.11'
        )
        self.package2.repos.add(repo1, repo2)

        self.package3 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.12'
        )
        self.package3.repos.add(repo1, repo2)

        package4 = admin_models.Package.objects.create(
            name='nagios-plugins-fedcloud',
            version='0.5.0'
        )
        package4.repos.add(repo2)

        package5 = admin_models.Package.objects.create(
            name='nagios-plugins-http',
            use_present_version=True
        )
        package5.repos.add(repo1, repo2)

    def test_forbidden_if_not_authenticated(self):
        request = self.factory.get(self.url + 'nagios-plugins-argo')
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_package_versions_for_given_package_name(self):
        request = self.factory.get(self.url + 'nagios-plugins-argo')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nagios-plugins-argo')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.package3.id,
                    'name': 'nagios-plugins-argo',
                    'version': '0.1.12',
                    'use_present_version': False,
                    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
                },
                {
                    'id': self.package2.id,
                    'name': 'nagios-plugins-argo',
                    'version': '0.1.11',
                    'use_present_version': False,
                    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
                },
                {
                    'id': self.package1.id,
                    'name': 'nagios-plugins-argo',
                    'version': '0.1.7',
                    'use_present_version': False,
                    'repos': ['repo-1 (CentOS 6)', 'repo-2 (CentOS 7)']
                }
            ]
        )

    def test_get_package_versions_package_not_found(self):
        request = self.factory.get(self.url + 'nonexisting-package')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting-package')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Package not found.')
