from collections import OrderedDict
from unittest.mock import patch

from Poem.api import views_internal as views
from Poem.poem import models as poem_models
from Poem.users.models import CustUser
from rest_framework import status
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from .utils_test import mocked_func


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
		force_authenticate(request, user=self.superuser)
		response = self.view(request, 'nonexisting')
		self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

	@patch('Poem.api.internal_views.reports.sync_webapi')
	def test_get_report_if_wrong_name_regular_user(self, func):
		func.side_effect = mocked_func
		request = self.factory.get(self.url + 'nonexisting')
		force_authenticate(request, user=self.user)
		response = self.view(request, 'nonexisting')
		self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

	@patch('Poem.api.internal_views.reports.sync_webapi')
	def test_get_report_if_wrong_name_limited_user(self, func):
		func.side_effect = mocked_func
		request = self.factory.get(self.url + 'nonexisting')
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
