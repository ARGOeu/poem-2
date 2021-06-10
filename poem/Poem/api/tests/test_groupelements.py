import datetime
import json

from Poem.api import views_internal as views
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from rest_framework import status
from rest_framework.test import force_authenticate
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.test.client import TenantRequestFactory

from .utils_test import encode_data


class ListMetricsInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricsInGroup.as_view()
        self.url = '/api/v2/internal/metricsgroup/'
        self.user = CustUser.objects.create_user(username='testuser')
        self.superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )

        self.group = poem_models.GroupOfMetrics.objects.create(name='EGI')
        group2 = poem_models.GroupOfMetrics.objects.create(name='delete')

        mtype1 = poem_models.MetricType.objects.create(name='Active')
        mtype2 = poem_models.MetricType.objects.create(name='Passive')

        tag = admin_models.OSTag.objects.create(name='CentOS 6')
        repo = admin_models.YumRepo.objects.create(name='repo-1', tag=tag)

        package1 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.7'
        )
        package1.repos.add(repo)

        package2 = admin_models.Package.objects.create(
            name='nagios-plugins-check_ssl_cert',
            version='1.84.0'
        )
        package2.repos.add(repo)

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            package=package1,
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md',
            user='testuser',
            datetime=datetime.datetime.now()
        )

        probe2 = admin_models.Probe.objects.create(
            name='check_ssl_cert',
            package=package2,
            description='A Nagios plugin to check an X.509 certificate.',
            comment='Initial version.',
            repository='https://github.com/matteocorti/check_ssl_cert',
            docurl='https://github.com/matteocorti/check_ssl_cert/blob/master'
                   '/README.md'
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

        pv2 = admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=probe2.package,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            version_comment='Initial version.',
            version_user=self.user.username
        )

        self.metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probekey=pv1,
            group=self.group,
        )

        self.metric2 = poem_models.Metric.objects.create(
            name='org.apel.APEL-Pub',
            group=self.group,
            mtype=mtype2,
        )

        self.metric3 = poem_models.Metric.objects.create(
            name='eu.egi.CertValidity',
            probekey=pv2,
            mtype=mtype1
        )

        self.metric4 = poem_models.Metric.objects.create(
            name='delete.metric',
            group=group2,
            mtype=mtype2
        )

        self.ct = ContentType.objects.get_for_model(poem_models.Metric)

        self.ver1 = poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric1.__str__(),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.ver2 = poem_models.TenantHistory.objects.create(
            object_id=self.metric2.id,
            serialized_data=serializers.serialize(
                'json', [self.metric2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric2.__str__(),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.ver3 = poem_models.TenantHistory.objects.create(
            object_id=self.metric3.id,
            serialized_data=serializers.serialize(
                'json', [self.metric3],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric3.__str__(),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.ver4 = poem_models.TenantHistory.objects.create(
            object_id=self.metric4.id,
            serialized_data=serializers.serialize(
                'json', [self.metric4],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric4.__str__(),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

    def test_get_metrics_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'EGI')
        self.assertEqual(
            response.data,
            {'result': ['argo.AMS-Check', 'org.apel.APEL-Pub']}
        )

    def test_get_metrics_in_group_regular_user(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(
            response.data,
            {'result': ['argo.AMS-Check', 'org.apel.APEL-Pub']}
        )

    def test_get_metric_without_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data, {'result': ['eu.egi.CertValidity']}
        )

    def test_get_metric_without_group_regular_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data, {'result': ['eu.egi.CertValidity']}
        )

    def test_get_metric_group_with_no_autorization(self):
        request = self.factory.get(self.url + 'EGI')
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_metrics_with_nonexisting_group(self):
        request = self.factory.get(self.url + 'bla')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'bla')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_metrics_with_nonexisting_group_regular_user(self):
        request = self.factory.get(self.url + 'bla')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'bla')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_metrics_in_group(self):
        data = {'name': 'EGI',
                'items': ['argo.AMS-Check', 'eu.egi.CertValidity']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        metric2 = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ver1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id,
            content_type=self.ct
        )
        ver2 = poem_models.TenantHistory.objects.filter(
            object_id=metric2.id,
            content_type=self.ct
        )
        self.assertEqual(ver1.count(), 1)
        self.assertEqual(ver2.count(), 2)
        self.assertEqual(metric1.group.name, 'EGI')
        self.assertEqual(metric2.group.name, 'EGI')
        self.assertEqual(
            json.loads(ver2[0].serialized_data)[0]['fields']['group'][0],
            'EGI'
        )
        self.assertEqual(ver2[0].comment,
                         '[{"added": {"fields": ["group"]}}]')
        self.assertEqual(
            json.loads(ver1[0].serialized_data)[0]['fields']['group'][0],
            'EGI'
        )

    def test_add_metrics_in_group_regular_user(self):
        data = {'name': 'EGI',
                'items': ['argo.AMS-Check', 'eu.egi.CertValidity']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        metric2 = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of metrics.'
        )
        ver1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id,
            content_type=self.ct
        )
        ver2 = poem_models.TenantHistory.objects.filter(
            object_id=metric2.id,
            content_type=self.ct
        )
        self.assertEqual(ver1.count(), 1)
        self.assertEqual(ver2.count(), 1)
        self.assertEqual(metric1.group.name, 'EGI')
        self.assertEqual(metric2.group, None)

    def test_remove_metric_from_group(self):
        self.metric3.group = self.group
        self.metric3.save()
        data = {'name': 'EGI',
                'items': ['eu.egi.CertValidity']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        metric2 = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(metric1.group, None)
        self.assertEqual(metric2.group.name, 'EGI')

    def test_remove_metric_from_group_regular_user(self):
        self.metric3.group = self.group
        self.metric3.save()
        data = {'name': 'EGI',
                'items': ['eu.egi.CertValidity']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        metric2 = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of metrics.'
        )
        self.assertEqual(metric1.group.name, 'EGI')
        self.assertEqual(metric2.group.name, 'EGI')

    def test_change_nonexisting_group(self):
        data = {'name': 'nonexisting',
                'items': ['argo.AMS-Check', 'eu.egi.CertValidity']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        metric2 = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of metrics does not exist.'
        )
        ver1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id,
            content_type=self.ct
        )
        ver2 = poem_models.TenantHistory.objects.filter(
            object_id=metric2.id,
            content_type=self.ct
        )
        self.assertEqual(ver1.count(), 1)
        self.assertEqual(ver2.count(), 1)
        self.assertEqual(metric1.group.name, 'EGI')
        self.assertEqual(metric2.group, None)

    def test_change_nonexisting_group_regular_user(self):
        data = {'name': 'nonexisting',
                'items': ['argo.AMS-Check', 'eu.egi.CertValidity']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        metric2 = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of metrics.'
        )
        ver1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id,
            content_type=self.ct
        )
        ver2 = poem_models.TenantHistory.objects.filter(
            object_id=metric2.id,
            content_type=self.ct
        )
        self.assertEqual(ver1.count(), 1)
        self.assertEqual(ver2.count(), 1)
        self.assertEqual(metric1.group.name, 'EGI')
        self.assertEqual(metric2.group, None)

    def test_post_metric_group_without_metrics(self):
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        data = {'name': 'new_name',
                'items': []}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 3)

    def test_post_metric_group_without_metrics_regular_user(self):
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        data = {'name': 'new_name',
                'items': []}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of metrics.'
        )
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)

    def test_post_metric_group_with_metrics(self):
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        data = {'name': 'new_name',
                'items': ['eu.egi.CertValidity']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 3)
        metric = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(metric.group.name, 'new_name')

    def test_post_metric_group_with_metrics_regular_user(self):
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        data = {'name': 'new_name',
                'items': ['eu.egi.CertValidity']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of metrics.'
        )
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        metric = poem_models.Metric.objects.get(name='eu.egi.CertValidity')
        self.assertEqual(metric.group, None)

    def test_post_metrics_group_with_name_that_already_exists(self):
        data = {'name': 'EGI',
                'items': [self.metric1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'Group of metrics with this name already exists.'}
        )

    def test_post_metrics_group_with_name_that_already_exists_regular_usr(self):
        data = {'name': 'EGI',
                'items': [self.metric1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of metrics.'
        )

    def test_delete_metric_group(self):
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 1)
        self.assertRaises(
            poem_models.GroupOfMetrics.DoesNotExist,
            poem_models.GroupOfMetrics.objects.get,
            name='delete'
        )
        metric = poem_models.Metric.objects.get(name='delete.metric')
        self.assertEqual(metric.group, None)

    def test_delete_metric_group_regular_user(self):
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of metrics.'
        )
        self.assertEqual(poem_models.GroupOfMetrics.objects.all().count(), 2)
        self.assertTrue(
            'delete' in poem_models.GroupOfMetrics.objects.all().values_list(
                'name', flat=True
            )
        )
        metric = poem_models.Metric.objects.get(name='delete.metric')
        self.assertEqual(metric.group.name, 'delete')

    def test_delete_nonexisting_metric_group(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(len(poem_models.GroupOfMetrics.objects.all()), 2)

    def test_delete_nonexisting_metric_group_regular_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of metrics.'
        )
        self.assertEqual(len(poem_models.GroupOfMetrics.objects.all()), 2)

    def test_delete_metric_group_without_specifying_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(poem_models.GroupOfMetrics.objects.all()), 2)

    def test_delete_metric_group_without_specifying_name_regular_user(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of metrics.'
        )
        self.assertEqual(len(poem_models.GroupOfMetrics.objects.all()), 2)


class ListAggregationsInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAggregationsInGroup.as_view()
        self.url = '/api/v2/internal/aggregationsgroup/'
        self.user = CustUser.objects.create_user(username='testuser')
        self.superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )

        self.aggr1 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.aggr2 = poem_models.Aggregation.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        self.aggr3 = poem_models.Aggregation.objects.create(
            name='DELETE_PROFILE',
            apiid='12341234-hhhh-kkkk-aaaa-aaeekkccnnee',
            groupname='delete'
        )

        self.group = poem_models.GroupOfAggregations.objects.create(name='EGI')
        group2 = poem_models.GroupOfAggregations.objects.create(name='delete')
        self.group.aggregations.add(self.aggr1)
        group2.aggregations.add(self.aggr3)

    def test_get_aggregations_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'EGI')
        self.assertEqual(response.data, {'result': ['TEST_PROFILE']})

    def test_get_aggregations_in_group_regular_user(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(response.data, {'result': ['TEST_PROFILE']})

    def test_get_aggregations_in_case_no_authorization(self):
        request = self.factory.get(self.url + 'EGI')
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_aggregation_without_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data, {'result': ['ANOTHER-PROFILE']})

    def test_get_aggregation_without_group_regular_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data, {'result': ['ANOTHER-PROFILE']})

    def test_add_aggregation_profile_in_group(self):
        self.assertEqual(self.group.aggregations.count(), 1)
        data = {'name': 'EGI',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, 'EGI')
        self.assertEqual(aggr2.groupname, 'EGI')
        self.assertEqual(self.group.aggregations.count(), 2)

    def test_add_aggregation_profile_in_group_regular_user(self):
        self.assertEqual(self.group.aggregations.count(), 1)
        data = {'name': 'EGI',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of aggregations.'
        )
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, 'EGI')
        self.assertEqual(aggr2.groupname, '')
        self.assertEqual(self.group.aggregations.count(), 1)

    def test_remove_aggregation_profile_from_group(self):
        self.group.aggregations.add(self.aggr2)
        self.assertEqual(self.group.aggregations.count(), 2)
        data = {
            'name': 'EGI',
            'items': ['ANOTHER-PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, '')
        self.assertEqual(aggr2.groupname, 'EGI')
        self.assertEqual(self.group.aggregations.count(), 1)

    def test_remove_aggregation_profile_from_group_regular_user(self):
        self.group.aggregations.add(self.aggr2)
        self.assertEqual(self.group.aggregations.count(), 2)
        data = {
            'name': 'EGI',
            'items': ['ANOTHER-PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of aggregations.'
        )
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, 'EGI')
        self.assertEqual(aggr2.groupname, '')
        self.assertEqual(self.group.aggregations.count(), 2)

    def test_change_nonexisting_group_of_aggregations(self):
        self.assertEqual(self.group.aggregations.count(), 1)
        data = {'name': 'nonexisting',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of aggregations does not exist.'
        )
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, 'EGI')
        self.assertEqual(aggr2.groupname, '')
        self.assertEqual(self.group.aggregations.count(), 1)

    def test_change_nonexisting_group_of_aggregations_regular_user(self):
        self.assertEqual(self.group.aggregations.count(), 1)
        data = {'name': 'nonexisting',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of aggregations.'
        )
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, 'EGI')
        self.assertEqual(aggr2.groupname, '')
        self.assertEqual(self.group.aggregations.count(), 1)

    def test_post_aggregation_group_without_aggregation(self):
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': []}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 3
        )
        group = poem_models.GroupOfAggregations.objects.get(name='new_name')
        self.assertEqual(group.aggregations.count(), 0)

    def test_post_aggregation_group_without_aggregation_regular_user(self):
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': []}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of aggregations.'
        )
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        self.assertRaises(
            poem_models.GroupOfAggregations.DoesNotExist,
            poem_models.GroupOfAggregations.objects.get,
            name='new_name'
        )

    def test_post_aggregation_group_with_aggregation(self):
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': ['ANOTHER-PROFILE']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 3
        )
        group = poem_models.GroupOfAggregations.objects.get(name='new_name')
        self.assertEqual(group.aggregations.count(), 1)
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, 'EGI')
        self.assertEqual(aggr2.groupname, 'new_name')

    def test_post_aggregation_group_with_aggregation_regular_user(self):
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': ['ANOTHER-PROFILE']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of aggregations.'
        )
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        self.assertRaises(
            poem_models.GroupOfAggregations.DoesNotExist,
            poem_models.GroupOfAggregations.objects.get,
            name='new_name'
        )
        aggr1 = poem_models.Aggregation.objects.get(name='TEST_PROFILE')
        aggr2 = poem_models.Aggregation.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(aggr1.groupname, 'EGI')
        self.assertEqual(aggr2.groupname, '')

    def test_post_aggregation_group_with_name_that_already_exists(self):
        data = {'name': 'EGI',
                'items': [self.aggr1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'Group of aggregations with this name already exists.'}
        )

    def test_post_aggregation_group_with_name_that_already_exists_regular(self):
        data = {'name': 'EGI',
                'items': [self.aggr1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of aggregations.'
        )

    def test_delete_aggregation_group(self):
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 1
        )
        self.assertRaises(
            poem_models.GroupOfAggregations.DoesNotExist,
            poem_models.GroupOfAggregations.objects.get,
            name='delete'
        )
        aggr = poem_models.Aggregation.objects.get(name='DELETE_PROFILE')
        self.assertEqual(aggr.groupname, '')

    def test_delete_aggregation_group_regular_user(self):
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of aggregations.'
        )
        self.assertEqual(
            poem_models.GroupOfAggregations.objects.all().count(), 2
        )
        self.assertTrue(
            'delete' in
            poem_models.GroupOfAggregations.objects.all().values_list(
                'name', flat=True
            )
        )
        aggr = poem_models.Aggregation.objects.get(name='DELETE_PROFILE')
        self.assertEqual(aggr.groupname, 'delete')

    def test_delete_nonexisting_aggregation_group(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(len(poem_models.GroupOfAggregations.objects.all()), 2)

    def test_delete_nonexisting_aggregation_group_regular_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of aggregations.'
        )
        self.assertEqual(len(poem_models.GroupOfAggregations.objects.all()), 2)

    def test_delete_aggregation_group_without_specifying_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(poem_models.GroupOfAggregations.objects.all()), 2)

    def test_delete_aggregation_group_without_specifying_name_regular_usr(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of aggregations.'
        )
        self.assertEqual(len(poem_models.GroupOfAggregations.objects.all()), 2)


class ListMetricProfilesInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricProfilesInGroup.as_view()
        self.url = '/api/v2/internal/metricprofilesgroup/'
        self.user = CustUser.objects.create_user(username='testuser')
        self.superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )

        self.mp1 = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.mp2 = poem_models.MetricProfiles.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        self.mp3 = poem_models.MetricProfiles.objects.create(
            name='DELETE_PROFILE',
            apiid='12341234-hhhh-kkkk-aaaa-aaeekkccnnee',
            groupname='delete'
        )

        self.group = poem_models.GroupOfMetricProfiles.objects.create(
            name='EGI'
        )
        group2 = poem_models.GroupOfMetricProfiles.objects.create(name='delete')

        self.group.metricprofiles.add(self.mp1)
        group2.metricprofiles.add(self.mp3)

    def test_get_metric_profiles_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'EGI')
        self.assertEqual(response.data, {'result': ['TEST_PROFILE']})

    def test_get_metric_profiles_in_group_regular_user(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(response.data, {'result': ['TEST_PROFILE']})

    def test_get_metric_profiles_in_group_in_case_no_authorization(self):
        request = self.factory.get(self.url + 'EGI')
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_metric_profiles_without_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.data, {'result': ['ANOTHER-PROFILE']})

    def test_get_metric_profiles_without_group_regular_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.data, {'result': ['ANOTHER-PROFILE']})

    def test_add_metric_profile_in_group(self):
        self.assertEqual(self.group.metricprofiles.count(), 1)
        data = {'name': 'EGI',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, 'EGI')
        self.assertEqual(mp2.groupname, 'EGI')
        self.assertEqual(self.group.metricprofiles.count(), 2)

    def test_add_metric_profile_in_group_regular_user(self):
        self.assertEqual(self.group.metricprofiles.count(), 1)
        data = {'name': 'EGI',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of metric profiles.'
        )
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, 'EGI')
        self.assertEqual(mp2.groupname, '')
        self.assertEqual(self.group.metricprofiles.count(), 1)

    def test_remove_metric_profile_from_group(self):
        self.group.metricprofiles.add(self.mp2)
        self.mp2.groupname='EGI'
        self.mp2.save()
        self.assertEqual(self.group.metricprofiles.all().count(), 2)
        data = {
            'name': 'EGI',
            'items': ['ANOTHER-PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, '')
        self.assertEqual(mp2.groupname, 'EGI')
        self.assertEqual(self.group.metricprofiles.count(), 1)

    def test_remove_metric_profile_from_group_regular_user(self):
        self.group.metricprofiles.add(self.mp2)
        self.mp2.groupname = 'EGI'
        self.mp2.save()
        self.assertEqual(self.group.metricprofiles.all().count(), 2)
        data = {
            'name': 'EGI',
            'items': ['ANOTHER-PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of metric profiles.'
        )
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, 'EGI')
        self.assertEqual(mp2.groupname, 'EGI')
        self.assertEqual(self.group.metricprofiles.count(), 2)

    def test_change_nonexisting_group_of_metric_profiles(self):
        self.assertEqual(self.group.metricprofiles.count(), 1)
        data = {'name': 'nonexisting',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Group of metric profiles does not exist.'
        )
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, 'EGI')
        self.assertEqual(mp2.groupname, '')
        self.assertEqual(self.group.metricprofiles.count(), 1)

    def test_change_nonexisting_group_of_metric_profiles_regular_user(self):
        self.assertEqual(self.group.metricprofiles.count(), 1)
        data = {'name': 'nonexisting',
                'items': ['TEST_PROFILE', 'ANOTHER-PROFILE']}
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of metric profiles.'
        )
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, 'EGI')
        self.assertEqual(mp2.groupname, '')
        self.assertEqual(self.group.metricprofiles.count(), 1)

    def test_post_metric_profile_group_without_metric_profile(self):
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': []}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 3
        )
        group = poem_models.GroupOfMetricProfiles.objects.get(name='new_name')
        self.assertEqual(group.metricprofiles.count(), 0)

    def test_post_metric_profile_group_without_metric_profile_regular_usr(self):
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': []}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of metric profiles.'
        )
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        self.assertRaises(
            poem_models.GroupOfMetricProfiles.DoesNotExist,
            poem_models.GroupOfMetricProfiles.objects.get,
            name='new_name'
        )

    def test_post_metric_profile_group_with_metric_profile(self):
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': ['ANOTHER-PROFILE']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 3
        )
        group = poem_models.GroupOfMetricProfiles.objects.get(name='new_name')
        self.assertEqual(group.metricprofiles.count(), 1)
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, 'EGI')
        self.assertEqual(mp2.groupname, 'new_name')

    def test_post_metric_profile_group_with_metric_profile_regular_user(self):
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        data = {'name': 'new_name',
                'items': ['ANOTHER-PROFILE']}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of metric profiles.'
        )
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        self.assertRaises(
            poem_models.GroupOfMetricProfiles.DoesNotExist,
            poem_models.GroupOfMetricProfiles.objects.get,
            name='new_name'
        )
        mp1 = poem_models.MetricProfiles.objects.get(name='TEST_PROFILE')
        mp2 = poem_models.MetricProfiles.objects.get(name='ANOTHER-PROFILE')
        self.assertEqual(mp1.groupname, 'EGI')
        self.assertEqual(mp2.groupname, '')

    def test_post_metric_profile_group_with_name_that_already_exists(self):
        data = {'name': 'EGI',
                'items': [self.mp1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'Metric profiles group with this name already exists.'}
        )

    def test_post_metric_profile_group_with_name_that_already_exists_rglr(self):
        data = {'name': 'EGI',
                'items': [self.mp1.name]}
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of metric profiles.'
        )
        self.assertEqual(
            len(poem_models.GroupOfMetricProfiles.objects.all()), 2
        )

    def test_delete_metric_profile_group(self):
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 1
        )
        self.assertRaises(
            poem_models.GroupOfMetrics.DoesNotExist,
            poem_models.GroupOfMetrics.objects.get,
            name='delete'
        )
        mp = poem_models.MetricProfiles.objects.get(name='DELETE_PROFILE')
        self.assertEqual(mp.groupname, '')

    def test_delete_metric_profile_group_regular_user(self):
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of metric profiles.'
        )
        self.assertEqual(
            poem_models.GroupOfMetricProfiles.objects.all().count(), 2
        )
        mp = poem_models.MetricProfiles.objects.get(name='DELETE_PROFILE')
        self.assertEqual(mp.groupname, 'delete')

    def test_delete_nonexisting_metric_profile_group(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_nonexisting_metric_profile_group_regular_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of metric profiles.'
        )

    def test_delete_metric_profile_group_without_specifying_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_metric_profile_group_without_specifying_name_rglr_usr(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of metric profiles.'
        )


class ListThresholdsProfilesInGroupAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListThresholdsProfilesInGroup.as_view()
        self.url = '/api/v2/internal/thresholdsprofilesgroup/'
        self.user = CustUser.objects.create_user(username='testuser')
        self.superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )

        self.tp1 = poem_models.ThresholdsProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.tp2 = poem_models.ThresholdsProfiles.objects.create(
            name='ANOTHER_PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee'
        )

        self.tp3 = poem_models.ThresholdsProfiles.objects.create(
            name='DELETE_PROFILE',
            apiid='12341234-hhhh-kkkk-aaaa-aaeekkccnnee',
            groupname='delete'
        )

        self.group = poem_models.GroupOfThresholdsProfiles.objects.create(
            name='EGI'
        )
        group2 = poem_models.GroupOfThresholdsProfiles.objects.create(
            name='delete'
        )
        self.group.thresholdsprofiles.add(self.tp1)
        group2.thresholdsprofiles.add(self.tp3)

    def test_get_thresholds_profiles_in_group(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'EGI')
        self.assertEqual(response.data, {'result': ['TEST_PROFILE']})

    def test_get_thresholds_profiles_in_group_regular_user(self):
        request = self.factory.get(self.url + 'EGI')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'EGI')
        self.assertEqual(response.data, {'result': ['TEST_PROFILE']})

    def test_get_thresholds_profiles_in_group_in_case_no_authorization(self):
        request = self.factory.get(self.url + 'EGI')
        response = self.view(request, 'EGI')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_thresholds_profiles_without_group(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.data, {'result': ['ANOTHER_PROFILE']})

    def test_get_thresholds_profiles_without_group_regular_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.data, {'result': ['ANOTHER_PROFILE']})

    def test_add_thresholds_profile_in_group(self):
        self.assertEqual(self.group.thresholdsprofiles.count(), 1)
        data = {
            'name': 'EGI',
            'items': ['TEST_PROFILE', 'ANOTHER_PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tp1 = poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE')
        tp2 = poem_models.ThresholdsProfiles.objects.get(name='ANOTHER_PROFILE')
        self.assertEqual(tp1.groupname, 'EGI')
        self.assertEqual(tp2.groupname, 'EGI')
        self.assertEqual(self.group.thresholdsprofiles.count(), 2)

    def test_add_thresholds_profile_in_group_regular_user(self):
        self.assertEqual(self.group.thresholdsprofiles.count(), 1)
        data = {
            'name': 'EGI',
            'items': ['TEST_PROFILE', 'ANOTHER_PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of thresholds '
            'profiles.'
        )
        tp1 = poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE')
        tp2 = poem_models.ThresholdsProfiles.objects.get(name='ANOTHER_PROFILE')
        self.assertEqual(tp1.groupname, 'EGI')
        self.assertEqual(tp2.groupname, '')
        self.assertEqual(self.group.thresholdsprofiles.count(), 1)

    def test_remove_thresholds_profile_from_group(self):
        self.group.thresholdsprofiles.add(self.tp2)
        self.assertEqual(self.group.thresholdsprofiles.all().count(), 2)
        data = {
            'name': 'EGI',
            'items': ['ANOTHER_PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tp1 = poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE')
        tp2 = poem_models.ThresholdsProfiles.objects.get(name='ANOTHER_PROFILE')
        self.assertEqual(tp1.groupname, '')
        self.assertEqual(tp2.groupname, 'EGI')
        self.assertEqual(self.group.thresholdsprofiles.count(), 1)

    def test_remove_thresholds_profile_from_group_regular_user(self):
        self.tp2.groupname = 'EGI'
        self.tp2.save()
        self.group.thresholdsprofiles.add(self.tp2)
        self.assertEqual(self.group.thresholdsprofiles.all().count(), 2)
        data = {
            'name': 'EGI',
            'items': ['ANOTHER_PROFILE']
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change groups of thresholds '
            'profiles.'
        )
        tp1 = poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE')
        tp2 = poem_models.ThresholdsProfiles.objects.get(name='ANOTHER_PROFILE')
        self.assertEqual(tp1.groupname, 'EGI')
        self.assertEqual(tp2.groupname, 'EGI')
        self.assertEqual(self.group.thresholdsprofiles.count(), 2)

    def test_post_thresholds_profile_group_without_tp(self):
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        data = {
            'name': 'new_group',
            'items': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 3
        )
        group = poem_models.GroupOfThresholdsProfiles.objects.get(
            name='new_group'
        )
        self.assertEqual(group.name, 'new_group')
        self.assertEqual(group.thresholdsprofiles.count(), 0)

    def test_post_thresholds_profile_group_without_tp_regular_user(self):
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        data = {
            'name': 'new_group',
            'items': []
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of thresholds profiles.'
        )
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        self.assertRaises(
            poem_models.GroupOfThresholdsProfiles.DoesNotExist,
            poem_models.GroupOfThresholdsProfiles.objects.get,
            name='new_group'
        )

    def test_post_thresholds_profile_group_with_tp(self):
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        data = {
            'name': 'new_group',
            'items': ['ANOTHER_PROFILE']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 3
        )
        group = poem_models.GroupOfThresholdsProfiles.objects.get(
            name='new_group'
        )
        self.assertEqual(group.name, 'new_group')
        self.assertEqual(group.thresholdsprofiles.count(), 1)
        tp1 = poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE')
        tp2 = poem_models.ThresholdsProfiles.objects.get(name='ANOTHER_PROFILE')
        self.assertEqual(tp1.groupname, 'EGI')
        self.assertEqual(tp2.groupname, 'new_group')

    def test_post_thresholds_profile_group_with_tp_regular_user(self):
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        data = {
            'name': 'new_group',
            'items': ['ANOTHER_PROFILE']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of thresholds profiles.'
        )
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        self.assertRaises(
            poem_models.GroupOfThresholdsProfiles.DoesNotExist,
            poem_models.GroupOfThresholdsProfiles.objects.get,
            name='new_group'
        )
        tp1 = poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE')
        tp2 = poem_models.ThresholdsProfiles.objects.get(name='ANOTHER_PROFILE')
        self.assertEqual(tp1.groupname, 'EGI')
        self.assertEqual(tp2.groupname, '')

    def test_post_thresholds_profile_group_with_name_that_already_exists(self):
        data = {
            'name': 'EGI',
            'items': ['TEST_PROFILE']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'Thresholds profiles group with this name already exists.'
        )

    def test_post_thresholds_profile_group_wh_name_that_already_exists_ru(self):
        data = {
            'name': 'EGI',
            'items': ['TEST_PROFILE']
        }
        request = self.factory.post(self.url, data, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add groups of thresholds profiles.'
        )

    def test_delete_thresholds_profile_group(self):
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 1
        )
        self.assertRaises(
            poem_models.GroupOfThresholdsProfiles.DoesNotExist,
            poem_models.GroupOfThresholdsProfiles.objects.get,
            name='delete'
        )
        tp = poem_models.ThresholdsProfiles.objects.get(name='DELETE_PROFILE')
        self.assertEqual(tp.groupname, '')

    def test_delete_thresholds_profile_group_regular_user(self):
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        request = self.factory.delete(self.url + 'delete')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'delete')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of thresholds '
            'profiles.'
        )
        self.assertEqual(
            poem_models.GroupOfThresholdsProfiles.objects.all().count(), 2
        )
        tp = poem_models.ThresholdsProfiles.objects.get(name='DELETE_PROFILE')
        self.assertEqual(tp.groupname, 'delete')

    def test_delete_nonexisting_thresholds_profile_group(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_nonexisting_thresholds_profile_group_regular_user(self):
        request = self.factory.delete(self.url + 'nonexisting')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of thresholds '
            'profiles.'
        )

    def test_delete_thresholds_profile_group_without_specifying_name(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_thresholds_profile_group_without_specifying_name_ru(self):
        request = self.factory.delete(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete groups of thresholds '
            'profiles.'
        )
