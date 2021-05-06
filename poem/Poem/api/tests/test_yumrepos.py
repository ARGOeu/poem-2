from Poem.api import views_internal as views
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from rest_framework import status
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory
from tenant_schemas.utils import schema_context, get_public_schema_name

from .utils_test import encode_data


class ListYumReposAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListYumRepos.as_view()
        self.url = '/api/v2/internal/yumrepos/'
        self.tenant_user = CustUser.objects.create_user(username='testuser')
        self.tenant_superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )

        with schema_context(get_public_schema_name()):
            self.super_tenant = Tenant.objects.create(
                name='public', domain_url='public',
                schema_name=get_public_schema_name()
            )
            self.user = CustUser.objects.create_user(username='testuser')
            self.superuser = CustUser.objects.create_user(
                username='poem', is_superuser=True
            )

        self.tag1 = admin_models.OSTag.objects.create(name='CentOS 6')
        self.tag2 = admin_models.OSTag.objects.create(name='CentOS 7')

        self.repo1 = admin_models.YumRepo.objects.create(
            name='repo-1',
            tag=self.tag1,
            content='content1=content1\ncontent2=content2',
            description='Repo 1 description.'
        )

        self.repo2 = admin_models.YumRepo.objects.create(
            name='repo-2',
            tag=self.tag2,
            content='content1=content1\ncontent2=content2',
            description='Repo 2 description.'
        )

    def test_get_list_of_yum_repos_sp_superuser(self):
        request = self.factory.get(self.url)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.repo1.id,
                    'name': 'repo-1',
                    'tag': 'CentOS 6',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Repo 1 description.'
                },
                {
                    'id': self.repo2.id,
                    'name': 'repo-2',
                    'tag': 'CentOS 7',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Repo 2 description.'
                }
            ]
        )

    def test_get_list_of_yum_repos_sp_user(self):
        request = self.factory.get(self.url)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.repo1.id,
                    'name': 'repo-1',
                    'tag': 'CentOS 6',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Repo 1 description.'
                },
                {
                    'id': self.repo2.id,
                    'name': 'repo-2',
                    'tag': 'CentOS 7',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Repo 2 description.'
                }
            ]
        )

    def test_get_list_of_yum_repos_tenant_superuser(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.repo1.id,
                    'name': 'repo-1',
                    'tag': 'CentOS 6',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Repo 1 description.'
                },
                {
                    'id': self.repo2.id,
                    'name': 'repo-2',
                    'tag': 'CentOS 7',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Repo 2 description.'
                }
            ]
        )

    def test_get_list_of_yum_repos_tenant_user(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.repo1.id,
                    'name': 'repo-1',
                    'tag': 'CentOS 6',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Repo 1 description.'
                },
                {
                    'id': self.repo2.id,
                    'name': 'repo-2',
                    'tag': 'CentOS 7',
                    'content': 'content1=content1\ncontent2=content2',
                    'description': 'Repo 2 description.'
                }
            ]
        )

    def test_get_yum_repo_by_name_sp_superuser(self):
        request = self.factory.get(self.url + 'repo-1/centos6')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'repo-1', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'id': self.repo1.id,
                'name': 'repo-1',
                'tag': 'CentOS 6',
                'content': 'content1=content1\ncontent2=content2',
                'description': 'Repo 1 description.'
            }
        )

    def test_get_yum_repo_by_name_sp_user(self):
        request = self.factory.get(self.url + 'repo-1/centos6')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'repo-1', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'id': self.repo1.id,
                'name': 'repo-1',
                'tag': 'CentOS 6',
                'content': 'content1=content1\ncontent2=content2',
                'description': 'Repo 1 description.'
            }
        )

    def test_get_yum_repo_by_name_tenant_superuser(self):
        request = self.factory.get(self.url + 'repo-1/centos6')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'repo-1', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'id': self.repo1.id,
                'name': 'repo-1',
                'tag': 'CentOS 6',
                'content': 'content1=content1\ncontent2=content2',
                'description': 'Repo 1 description.'
            }
        )

    def test_get_yum_repo_by_name_tenant_user(self):
        request = self.factory.get(self.url + 'repo-1/centos6')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'repo-1', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'id': self.repo1.id,
                'name': 'repo-1',
                'tag': 'CentOS 6',
                'content': 'content1=content1\ncontent2=content2',
                'description': 'Repo 1 description.'
            }
        )

    def test_get_yum_repo_in_case_of_nonexisting_name_sp_superuser(self):
        request = self.factory.get(self.url + 'nonexisting/centos6')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_yum_repo_in_case_of_nonexisting_name_sp_user(self):
        request = self.factory.get(self.url + 'nonexisting/centos6')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_yum_repo_in_case_of_nonexisting_name_tenant_superuser(self):
        request = self.factory.get(self.url + 'nonexisting/centos6')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'nonexisting', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_yum_repo_in_case_of_nonexisting_name_tenant_user(self):
        request = self.factory.get(self.url + 'nonexisting/centos6')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'nonexisting', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_yum_repo_sp_superuser(self):
        data = {
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        repo = admin_models.YumRepo.objects.get(name='repo-3')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(
            repo.content,
            'content1=content1\ncontent2=content2'
        )
        self.assertEqual(repo.description, 'Repo 3 description')

    def test_post_yum_repo_sp_user(self):
        data = {
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_post_yum_repo_tenant_superuser(self):
        data = {
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_post_yum_repo_tenant_user(self):
        data = {
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_post_yum_repo_with_name_and_tag_that_already_exist_sp_sprusr(self):
        data = {
            'name': 'repo-1',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Another description.'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'YUM repo with this name and tag already exists.'
        )

    def test_post_yum_repo_with_name_and_tag_that_already_exist_sp_user(self):
        data = {
            'name': 'repo-1',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Another description.'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )

    def test_post_yum_repo_with_name_and_tag_that_already_exist_tn_sprusr(self):
        data = {
            'name': 'repo-1',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Another description.'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )

    def test_post_yum_repo_with_name_and_tag_that_already_exist_tn_user(self):
        data = {
            'name': 'repo-1',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Another description.'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )

    def test_put_yum_repo_sp_superuser(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-new-1',
            'tag': 'CentOS 7',
            'content': 'content3=content3\ncontent4=content4',
            'description': 'Another description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-new-1')
        self.assertEqual(repo.tag, self.tag2)
        self.assertEqual(repo.content, 'content3=content3\ncontent4=content4')
        self.assertEqual(repo.description, 'Another description.')

    def test_put_yum_repo_sp_user(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-new-1',
            'tag': 'CentOS 7',
            'content': 'content3=content3\ncontent4=content4',
            'description': 'Another description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_tenant_superuser(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-new-1',
            'tag': 'CentOS 7',
            'content': 'content3=content3\ncontent4=content4',
            'description': 'Another description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_tenant_user(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-new-1',
            'tag': 'CentOS 7',
            'content': 'content3=content3\ncontent4=content4',
            'description': 'Another description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_post_yum_repo_with_nonexisting_tag_sp_superuser(self):
        data = {
            'name': 'repo-3',
            'tag': 'nonexisting',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'OS tag does not exist.')
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_post_yum_repo_with_nonexisting_tag_sp_user(self):
        data = {
            'name': 'repo-3',
            'tag': 'nonexisting',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_post_yum_repo_with_nonexisting_tag_tenant_superuser(self):
        data = {
            'name': 'repo-3',
            'tag': 'nonexisting',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_post_yum_repo_with_nonexisting_tag_tenant_user(self):
        data = {
            'name': 'repo-3',
            'tag': 'nonexisting',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_post_yum_repo_with_missing_data_key_sp_superuser(self):
        data = {
            'name': 'repo-3',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: tag')
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_post_yum_repo_with_missing_data_key_sp_user(self):
        data = {
            'name': 'repo-3',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_post_yum_repo_with_missing_data_key_tenant_superuser(self):
        data = {
            'name': 'repo-3',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_post_yum_repo_with_missing_data_key_tenant_user(self):
        data = {
            'name': 'repo-3',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Repo 3 description'
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add YUM repos.'
        )
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-3'
        )

    def test_put_yum_repo_with_existing_name_and_tag_sp_superuser(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'tag': 'CentOS 7',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Existing repo-2'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'YUM repo with this name and tag already exists.'
        )

    def test_put_yum_repo_with_existing_name_and_tag_sp_user(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'tag': 'CentOS 7',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Existing repo-2'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )

    def test_put_yum_repo_with_existing_name_and_tag_tenant_superuser(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'tag': 'CentOS 7',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Existing repo-2'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )

    def test_put_yum_repo_with_existing_name_and_tag_tenant_user(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'tag': 'CentOS 7',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Existing repo-2'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )

    def test_put_yum_repo_with_existing_name_but_different_tag_sp_sprusr(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Existing repo-2'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-2')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Existing repo-2')

    def test_put_yum_repo_with_existing_name_but_different_tag_sp_user(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Existing repo-2'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_with_existing_name_but_different_tag_tn_spruser(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Existing repo-2'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_with_existing_name_but_different_tag_tn_user(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-2',
            'tag': 'CentOS 6',
            'content': 'content1=content1\ncontent2=content2',
            'description': 'Existing repo-2'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_with_nonexisting_tag_sp_superuser(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-3',
            'tag': 'nonexisting',
            'content': 'content3=content3\ncontent3=content3',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'OS tag does not exist.')
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_with_nonexisting_tag_sp_user(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-3',
            'tag': 'nonexisting',
            'content': 'content3=content3\ncontent3=content3',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_with_nonexisting_tag_tenant_superuser(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-3',
            'tag': 'nonexisting',
            'content': 'content3=content3\ncontent3=content3',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_with_nonexisting_tag_tenant_user(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-3',
            'tag': 'nonexisting',
            'content': 'content3=content3\ncontent3=content3',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_with_nonexisting_repo_sp_superuser(self):
        data = {
            'id': 999,
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'YUM repo does not exist.')

    def test_put_yum_repo_with_nonexisting_repo_sp_user(self):
        data = {
            'id': 999,
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )

    def test_put_yum_repo_with_nonexisting_repo_tenant_superuser(self):
        data = {
            'id': 999,
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )

    def test_put_yum_repo_with_nonexisting_repo_tenant_user(self):
        data = {
            'id': 999,
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )

    def test_put_yum_repo_with_missing_data_key_sp_superuser(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: content')
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_with_missing_data_key_sp_user(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.super_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_with_missing_data_key_tenant_superuser(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_put_yum_repo_with_missing_data_key_tenant_user(self):
        data = {
            'id': self.repo1.id,
            'name': 'repo-3',
            'tag': 'CentOS 6',
            'description': 'New repo description.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change YUM repos.'
        )
        repo = admin_models.YumRepo.objects.get(id=self.repo1.id)
        self.assertEqual(repo.name, 'repo-1')
        self.assertEqual(repo.tag, self.tag1)
        self.assertEqual(repo.content, 'content1=content1\ncontent2=content2')
        self.assertEqual(repo.description, 'Repo 1 description.')

    def test_delete_yum_repo(self):
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 2)
        request = self.factory.delete(self.url + 'repo-1/centos6')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'repo-1', 'centos6')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(admin_models.YumRepo.objects.all().count(), 1)
        self.assertRaises(
            admin_models.YumRepo.DoesNotExist,
            admin_models.YumRepo.objects.get,
            name='repo-1'
        )

    def test_delete_yum_repo_without_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_yum_repo_nonexisting_name(self):
        request = self.factory.delete(self.url + 'nonexisting/centos7')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting', 'centos7')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'YUM repo not found.'})


class ListOSTagsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListOSTags.as_view()
        self.url = '/api/v2/internal/ostags/'
        self.user = CustUser.objects.create(username='testuser')

        admin_models.OSTag.objects.create(name='CentOS 6')
        admin_models.OSTag.objects.create(name='CentOS 7')

    def test_get_tags(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            [r for r in response.data],
            [
                'CentOS 6',
                'CentOS 7',
            ]
        )
