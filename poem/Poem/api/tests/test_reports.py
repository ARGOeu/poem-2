from collections import OrderedDict
from unittest.mock import patch

from Poem.api import views_internal as views
from Poem.poem import models as poem_models
from Poem.users.models import CustUser
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from rest_framework import status
from rest_framework.test import force_authenticate

from .utils_test import mocked_func, encode_data


class ListReportsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListReports.as_view()
        self.url = '/api/v2/internal/reports/'
        self.user = CustUser.objects.create_user(username='testuser')
        self.limited_user = CustUser.objects.create_user(username='limited')
        self.superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )

        self.report1 = poem_models.Reports.objects.create(
            name='Critical', apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            groupname='TENANT', description='Critical report'
        )

        self.report2 = poem_models.Reports.objects.create(
            name='ops-monitor', apiid='bue2xius-ubt0-62ap-9nbn-ieta0kao8loa',
        )

        group1 = poem_models.GroupOfReports.objects.create(name='TENANT')
        group2 = poem_models.GroupOfReports.objects.create(name='ARGO')
        self.group = poem_models.GroupOfReports.objects.create(name='TEST')

        group1.reports.add(self.report1)

        userprofile = poem_models.UserProfile.objects.create(user=self.user)
        userprofile.groupsofreports.add(group1)
        userprofile.groupsofreports.add(group2)

        poem_models.UserProfile.objects.create(user=self.limited_user)
        poem_models.UserProfile.objects.create(user=self.superuser)

    @patch('Poem.api.internal_views.reports.sync_webapi')
    def test_get_all_reports_superuser(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'Critical'),
                    ('description', 'Critical report'),
                    ('apiid', 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'),
                    ('groupname', 'TENANT')
                ]),
                OrderedDict([
                    ('name', 'ops-monitor'),
                    ('description', ''),
                    ('apiid', 'bue2xius-ubt0-62ap-9nbn-ieta0kao8loa'),
                    ('groupname', '')
                ])
            ]
        )

    @patch('Poem.api.internal_views.reports.sync_webapi')
    def test_get_all_reports_regular_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'Critical'),
                    ('description', 'Critical report'),
                    ('apiid', 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'),
                    ('groupname', 'TENANT')
                ]),
                OrderedDict([
                    ('name', 'ops-monitor'),
                    ('description', ''),
                    ('apiid', 'bue2xius-ubt0-62ap-9nbn-ieta0kao8loa'),
                    ('groupname', '')
                ])
            ]
        )

    @patch('Poem.api.internal_views.reports.sync_webapi')
    def test_get_all_reports_limited_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                OrderedDict([
                    ('name', 'Critical'),
                    ('description', 'Critical report'),
                    ('apiid', 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'),
                    ('groupname', 'TENANT')
                ]),
                OrderedDict([
                    ('name', 'ops-monitor'),
                    ('description', ''),
                    ('apiid', 'bue2xius-ubt0-62ap-9nbn-ieta0kao8loa'),
                    ('groupname', '')
                ])
            ]
        )

    @patch('Poem.api.internal_views.reports.sync_webapi')
    def test_get_report_by_name_superuser(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'Critical')
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'Critical')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('name', 'Critical'),
                ('description', 'Critical report'),
                ('apiid', 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'),
                ('groupname', 'TENANT')
            ])
        )

    @patch('Poem.api.internal_views.reports.sync_webapi')
    def test_get_report_by_name_regular_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'Critical')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'Critical')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('name', 'Critical'),
                ('description', 'Critical report'),
                ('apiid', 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'),
                ('groupname', 'TENANT')
            ])
        )

    @patch('Poem.api.internal_views.reports.sync_webapi')
    def test_get_report_by_name_limited_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'Critical')
        request.tenant = self.tenant
        force_authenticate(request, user=self.limited_user)
        response = self.view(request, 'Critical')
        self.assertEqual(
            response.data,
            OrderedDict([
                ('name', 'Critical'),
                ('description', 'Critical report'),
                ('apiid', 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'),
                ('groupname', 'TENANT')
            ])
        )

    @patch('Poem.api.internal_views.reports.sync_webapi')
    def test_get_report_if_wrong_name_superuser(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('Poem.api.internal_views.reports.sync_webapi')
    def test_get_report_if_wrong_name_regular_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('Poem.api.internal_views.reports.sync_webapi')
    def test_get_report_if_wrong_name_limited_user(self, func):
        func.side_effect = mocked_func
        request = self.factory.get(self.url + 'nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.limited_user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_report_superuser(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'ARGO',
            'description': 'Some description.'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(poem_models.Reports.objects.all().count(), 3)
        report = poem_models.Reports.objects.get(name='sla')
        self.assertEqual(report.name, 'sla')
        self.assertEqual(report.apiid, 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u')
        self.assertEqual(report.description, 'Some description.')
        self.assertEqual(report.groupname, 'ARGO')
        group = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group.reports.all().count(), 1)
        self.assertTrue(
            group.reports.filter(
                apiid='yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u'
            ).exists()
        )

    def test_post_report_regular_user(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'ARGO',
            'description': 'Some description.'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(poem_models.Reports.objects.all().count(), 3)
        report = poem_models.Reports.objects.get(name='sla')
        self.assertEqual(report.name, 'sla')
        self.assertEqual(report.apiid, 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u')
        self.assertEqual(report.description, 'Some description.')
        self.assertEqual(report.groupname, 'ARGO')
        group = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group.reports.all().count(), 1)
        self.assertTrue(
            group.reports.filter(
                apiid='yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u'
            ).exists()
        )

    def test_post_report_regular_user_wrong_group(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'TEST',
            'description': 'Some description.'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign reports to the given group.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)
        self.assertRaises(
            poem_models.Reports.DoesNotExist,
            poem_models.Reports.objects.get,
            name='sla'
        )
        group = poem_models.GroupOfReports.objects.get(name='TEST')
        self.assertEqual(group.reports.all().count(), 0)

    def test_post_report_limited_user(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'ARGO',
            'description': 'Some description.'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add reports.'
        )
        self.assertRaises(
            poem_models.Reports.DoesNotExist,
            poem_models.Reports.objects.get,
            name='sla'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)
        group = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group.reports.all().count(), 0)

    def test_post_report_nonexisting_group_superuser(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'nonexisting',
            'description': 'Some description.'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Group of reports not found.')
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)
        self.assertRaises(
            poem_models.Reports.DoesNotExist,
            poem_models.Reports.objects.get,
            name='sla'
        )

    def test_post_report_nonexisting_group_regular_user(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'nonexisting',
            'description': 'Some description.'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Group of reports not found.')
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)
        self.assertRaises(
            poem_models.Reports.DoesNotExist,
            poem_models.Reports.objects.get,
            name='sla'
        )

    def test_post_report_nonexisting_group_limited_user(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'nonexisting',
            'description': 'Some description.'
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add reports.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)
        self.assertRaises(
            poem_models.Reports.DoesNotExist,
            poem_models.Reports.objects.get,
            name='sla'
        )

    def test_post_report_without_description_superuser(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'ARGO',
            'description': ''
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(poem_models.Reports.objects.all().count(), 3)
        report = poem_models.Reports.objects.get(name='sla')
        self.assertEqual(report.apiid, 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u')
        self.assertEqual(report.description, '')
        self.assertEqual(report.groupname, 'ARGO')
        group = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group.reports.all().count(), 1)
        self.assertTrue(
            group.reports.filter(
                apiid='yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u'
            ).exists()
        )

    def test_post_report_without_description_regular_user(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'ARGO',
            'description': ''
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(poem_models.Reports.objects.all().count(), 3)
        report = poem_models.Reports.objects.get(name='sla')
        self.assertEqual(report.apiid, 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u')
        self.assertEqual(report.description, '')
        self.assertEqual(report.groupname, 'ARGO')
        group = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group.reports.all().count(), 1)
        self.assertTrue(
            group.reports.filter(
                apiid='yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u'
            ).exists()
        )

    def test_post_report_without_description_regular_user_wrong_group(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'TEST',
            'description': ''
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign reports to the given group.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)
        self.assertRaises(
            poem_models.Reports.DoesNotExist,
            poem_models.Reports.objects.get,
            name='sla'
        )
        group = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group.reports.all().count(), 0)

    def test_post_report_without_description_limited_user(self):
        data = {
            'apiid': 'yoohoo6t-1fwt-nf98-uem6-uc1zie9ahk8u',
            'name': 'sla',
            'groupname': 'ARGO',
            'description': ''
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add reports.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)
        self.assertRaises(
            poem_models.Reports.DoesNotExist,
            poem_models.Reports.objects.get,
            name='sla'
        )
        group = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group.reports.all().count(), 0)

    def test_post_report_invalid_data_superuser(self):
        data = {'name': 'sla'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'apiid: This field is required.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)

    def test_post_report_invalid_data_regular_user(self):
        data = {'name': 'sla'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'apiid: This field is required.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)

    def test_post_report_invalid_data_limited_user(self):
        data = {'name': 'sla'}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add reports.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)

    def test_put_report_superuser(self):
        data = {
            'name': 'CriticalTest',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'ARGO',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'CriticalTest')
        self.assertEqual(report.groupname, 'ARGO')
        self.assertEqual(report.description, 'Testing critical report.')
        group1 = poem_models.GroupOfReports.objects.get(name='TENANT')
        group2 = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group1.reports.all().count(), 0)
        self.assertEqual(group2.reports.all().count(), 1)
        self.assertTrue(
            group2.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_regular_user(self):
        data = {
            'name': 'CriticalTest',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'ARGO',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'CriticalTest')
        self.assertEqual(report.groupname, 'ARGO')
        self.assertEqual(report.description, 'Testing critical report.')
        group1 = poem_models.GroupOfReports.objects.get(name='TENANT')
        group2 = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group1.reports.all().count(), 0)
        self.assertEqual(group2.reports.all().count(), 1)
        self.assertTrue(
            group2.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_regular_user_wrong_group(self):
        data = {
            'name': 'CriticalTest',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'TEST',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign reports to the given group.'
        )
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'TENANT')
        self.assertEqual(report.description, 'Critical report')
        group1 = poem_models.GroupOfReports.objects.get(name='TENANT')
        group2 = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group1.reports.all().count(), 1)
        self.assertEqual(group2.reports.all().count(), 0)
        self.assertTrue(
            group1.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_regular_user_wrong_initial_group(self):
        report3 = poem_models.Reports.objects.create(
            name='ops-monitor-critical',
            apiid='juashu3i-533c-z9zi-lm6s-lei0ahlocei5',
            groupname='TEST'
        )
        self.group.reports.add(report3)
        data = {
            'name': 'CriticalTest',
            'apiid': 'juashu3i-533c-z9zi-lm6s-lei0ahlocei5',
            'groupname': 'ARGO',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change reports in this group.'
        )
        report = poem_models.Reports.objects.get(
            apiid='juashu3i-533c-z9zi-lm6s-lei0ahlocei5'
        )
        self.assertEqual(report.name, 'ops-monitor-critical')
        self.assertEqual(report.groupname, 'TEST')
        self.assertEqual(report.description, '')
        group1 = poem_models.GroupOfReports.objects.get(name='TEST')
        group2 = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group1.reports.all().count(), 1)
        self.assertEqual(group2.reports.all().count(), 0)
        self.assertTrue(
            group1.reports.filter(
                apiid='juashu3i-533c-z9zi-lm6s-lei0ahlocei5'
            ).exists()
        )

    def test_put_report_limited_user(self):
        data = {
            'name': 'CriticalTest',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'ARGO',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change reports.'
        )
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'TENANT')
        self.assertEqual(report.description, 'Critical report')
        group1 = poem_models.GroupOfReports.objects.get(name='TENANT')
        group2 = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group1.reports.all().count(), 1)
        self.assertEqual(group2.reports.all().count(), 0)
        self.assertTrue(
            group1.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_nonexisting_group_superuser(self):
        data = {
            'name': 'CriticalTest',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'nonexisting',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Given group of reports does not exist.'
        )
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'TENANT')
        self.assertEqual(report.description, 'Critical report')
        group = poem_models.GroupOfReports.objects.get(name='TENANT')
        self.assertEqual(group.reports.all().count(), 1)
        self.assertTrue(
            group.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_nonexisting_group_regular_user(self):
        data = {
            'name': 'CriticalTest',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'nonexisting',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Given group of reports does not exist.'
        )
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'TENANT')
        self.assertEqual(report.description, 'Critical report')
        group = poem_models.GroupOfReports.objects.get(name='TENANT')
        self.assertEqual(group.reports.all().count(), 1)
        self.assertTrue(
            group.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_nonexisting_group_limited_user(self):
        data = {
            'name': 'CriticalTest',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'nonexisting',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change reports.'
        )
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'TENANT')
        self.assertEqual(report.description, 'Critical report')
        group = poem_models.GroupOfReports.objects.get(name='TENANT')
        self.assertEqual(group.reports.all().count(), 1)
        self.assertTrue(
            group.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_without_description_superuser(self):
        data = {
            'name': 'Critical',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'ARGO',
            'description': ''
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'ARGO')
        self.assertEqual(report.description, '')
        group1 = poem_models.GroupOfReports.objects.get(name='TENANT')
        group2 = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group1.reports.all().count(), 0)
        self.assertEqual(group2.reports.all().count(), 1)
        self.assertTrue(
            group2.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_without_description_regular_user(self):
        data = {
            'name': 'Critical',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'ARGO',
            'description': ''
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'ARGO')
        self.assertEqual(report.description, '')
        group1 = poem_models.GroupOfReports.objects.get(name='TENANT')
        group2 = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group1.reports.all().count(), 0)
        self.assertEqual(group2.reports.all().count(), 1)
        self.assertTrue(
            group2.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_without_description_regular_user_wrong_group(self):
        data = {
            'name': 'Critical',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'TEST',
            'description': ''
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to assign reports to the given group.'
        )
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'TENANT')
        self.assertEqual(report.description, 'Critical report')
        group1 = poem_models.GroupOfReports.objects.get(name='TENANT')
        group2 = poem_models.GroupOfReports.objects.get(name='TEST')
        self.assertEqual(group1.reports.all().count(), 1)
        self.assertEqual(group2.reports.all().count(), 0)
        self.assertTrue(
            group1.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_without_description_limited_user(self):
        data = {
            'name': 'Critical',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'groupname': 'ARGO',
            'description': ''
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change reports.'
        )
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'TENANT')
        self.assertEqual(report.description, 'Critical report')
        group1 = poem_models.GroupOfReports.objects.get(name='TENANT')
        group2 = poem_models.GroupOfReports.objects.get(name='ARGO')
        self.assertEqual(group1.reports.all().count(), 1)
        self.assertEqual(group2.reports.all().count(), 0)
        self.assertTrue(
            group1.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_without_apiid_superuser(self):
        data = {
            'name': 'Critical',
            'apiid': '',
            'groupname': 'ARGO',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Apiid field undefined!')

    def test_put_report_without_apiid_regular_user(self):
        data = {
            'name': 'Critical',
            'apiid': '',
            'groupname': 'ARGO',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Apiid field undefined!')

    def test_put_report_without_apiid_regular_user_wrong_group(self):
        data = {
            'name': 'Critical',
            'apiid': '',
            'groupname': 'TEST',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Apiid field undefined!')

    def test_put_report_without_apiid_limited_user(self):
        data = {
            'name': 'Critical',
            'apiid': '',
            'groupname': 'TEST',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change reports.'
        )

    def test_put_report_with_missing_key_in_request_data_superuser(self):
        data = {
            'name': 'Critical',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: groupname')
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'TENANT')
        self.assertEqual(report.description, 'Critical report')
        group = poem_models.GroupOfReports.objects.get(name='TENANT')
        self.assertEqual(group.reports.all().count(), 1)
        self.assertTrue(
            group.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_with_missing_key_in_request_data_regular_user(self):
        data = {
            'name': 'Critical',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Missing data key: groupname')
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'TENANT')
        self.assertEqual(report.description, 'Critical report')
        group = poem_models.GroupOfReports.objects.get(name='TENANT')
        self.assertEqual(group.reports.all().count(), 1)
        self.assertTrue(
            group.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_put_report_with_missing_key_in_request_data_limited_user(self):
        data = {
            'name': 'Critical',
            'apiid': 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i',
            'description': 'Testing critical report.'
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change reports.'
        )
        report = poem_models.Reports.objects.get(
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        self.assertEqual(report.name, 'Critical')
        self.assertEqual(report.groupname, 'TENANT')
        self.assertEqual(report.description, 'Critical report')
        group = poem_models.GroupOfReports.objects.get(name='TENANT')
        self.assertEqual(group.reports.all().count(), 1)
        self.assertTrue(
            group.reports.filter(
                apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
            ).exists()
        )

    def test_delete_report_superuser(self):
        request = self.factory.delete(
            self.url + 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.Reports.objects.all().count(), 1)
        self.assertRaises(
            poem_models.Reports.DoesNotExist,
            poem_models.Reports.objects.get,
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )

    def test_delete_report_regular_user(self):
        request = self.factory.delete(
            self.url + 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.Reports.objects.all().count(), 1)
        self.assertRaises(
            poem_models.Reports.DoesNotExist,
            poem_models.Reports.objects.get,
            apiid='yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )

    def test_delete_report_regular_user_wrong_group(self):
        request = self.factory.delete(
            self.url + 'bue2xius-ubt0-62ap-9nbn-ieta0kao8loa'
        )
        force_authenticate(request, user=self.user)
        response = self.view(request, 'bue2xius-ubt0-62ap-9nbn-ieta0kao8loa')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete reports assigned to this '
            'group.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)

    def test_delete_report_limited_user(self):
        request = self.factory.delete(
            self.url + 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i'
        )
        force_authenticate(request, user=self.limited_user)
        response = self.view(request, 'yee9chel-5o4u-l4j4-410b-eipi3ohrah5i')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete reports.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)

    def test_delete_report_with_wrong_apiid_superuser(self):
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Report not found')
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)

    def test_delete_report_with_wrong_apiid_regular_user(self):
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'Report not found')
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)

    def test_delete_report_with_wrong_apiid_limited_user(self):
        request = self.factory.delete(self.url + 'wrong_id')
        force_authenticate(request, user=self.limited_user)
        response = self.view(request, 'wrong_id')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete reports.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)

    def test_delete_report_without_specifying_apiid_superuser(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Report not specified!')
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)

    def test_delete_report_without_specifying_apiid_regular_user(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Report not specified!')
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)

    def test_delete_report_without_specifying_apiid_limited_user(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.limited_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete reports.'
        )
        self.assertEqual(poem_models.Reports.objects.all().count(), 2)
