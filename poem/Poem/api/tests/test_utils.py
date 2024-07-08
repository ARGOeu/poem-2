import datetime
import json
from unittest.mock import patch

import factory.django
from Poem.api.internal_views.utils import sync_webapi, \
    get_tenant_resources, sync_tags_webapi, WebApiException
from Poem.helpers.history_helpers import create_comment
from Poem.helpers.history_helpers import serialize_metric
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.poem_super_admin.models import WebAPIKey
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django.db.models.signals import pre_save
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import get_public_schema_name

from .test_views import mock_db_for_metrics_tests
from .utils_test import mocked_web_api_request, MockResponse


def mocked_put_response(*args, **kwargs):
    return MockResponse({
        "data": [
            {
                "name": "metric1",
                "tags": [
                    "tag1",
                    "tag2"
                ]
            }
        ]
    }, 200)


def mocked_put_response_not_ok(*args, **kwargs):
    return MockResponse(
        {
            "status": {
                "message": "Bad Request",
                "code": "400"
            },
            "errors": [
                {
                    "message": "Bad Request",
                    "code": "400",
                    "details": "There has been an error"
                }
            ]
        }, 400
    )


def mocked_put_response_not_ok_no_msg(*args, **kwargs):
    return MockResponse(None, 500)


class SyncWebApiTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        ct_mp = ContentType.objects.get_for_model(poem_models.MetricProfiles)
        WebAPIKey.objects.create(
            name='WEB-API-TENANT',
            token='mocked_token'
        )

        self.mp1 = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.mp2 = poem_models.MetricProfiles.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.mp1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'metricinstances': [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.mp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.mp1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=ct_mp
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.mp2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'metricinstances': [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['APEL', 'org.apel.APEL-Sync']
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.mp2.id,
            serialized_data=json.dumps(data),
            object_repr=self.mp2.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=ct_mp
        )

        self.aggr1 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.aggr2 = poem_models.Aggregation.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.tp1 = poem_models.ThresholdsProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

        self.tp2 = poem_models.ThresholdsProfiles.objects.create(
            name='ANOTHER-PROFILE',
            apiid='12341234-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='EGI'
        )

    @patch('requests.get')
    def test_sync_webapi_metricprofiles(self, func):
        func.side_effect = mocked_web_api_request
        self.assertEqual(poem_models.MetricProfiles.objects.all().count(), 2)
        sync_webapi('metric_profiles', poem_models.MetricProfiles, "TENANT")
        self.assertEqual(poem_models.MetricProfiles.objects.all().count(), 2)
        self.assertEqual(
            poem_models.MetricProfiles.objects.get(name='TEST_PROFILE'),
            self.mp1
        )
        self.assertRaises(
            poem_models.MetricProfiles.DoesNotExist,
            poem_models.MetricProfiles.objects.get,
            name='ANOTHER-PROFILE'
        )
        self.assertEqual(
            poem_models.TenantHistory.objects.filter(
                object_id=self.mp2.id
            ).count(), 0
        )
        self.assertTrue(
            poem_models.MetricProfiles.objects.get(name='NEW_PROFILE')
        )
        history = poem_models.TenantHistory.objects.filter(
            object_repr='NEW_PROFILE'
        )
        self.assertEqual(history.count(), 1)
        self.assertEqual(history[0].comment, 'Initial version.')
        serialized_data = json.loads(history[0].serialized_data)[0]['fields']
        self.assertEqual(serialized_data['name'], 'NEW_PROFILE')
        self.assertEqual(
            serialized_data['apiid'], '11110000-aaaa-kkkk-aaaa-aaeekkccnnee'
        )
        self.assertEqual(
            serialized_data['metricinstances'],
            [['dg.3GBridge', 'eu.egi.cloud.Swift-CRUD']]
        )

    @patch('requests.get')
    def test_sync_webapi_aggregationprofiles(self, func):
        func.side_effect = mocked_web_api_request
        self.assertEqual(poem_models.Aggregation.objects.all().count(), 2)
        sync_webapi('aggregation_profiles', poem_models.Aggregation, "TENANT")
        self.assertEqual(poem_models.Aggregation.objects.all().count(), 2)
        self.assertEqual(
            poem_models.Aggregation.objects.get(name='TEST_PROFILE'), self.aggr1
        )
        self.assertRaises(
            poem_models.Aggregation.DoesNotExist,
            poem_models.Aggregation.objects.get,
            name='ANOTHER-PROFILE'
        )
        self.assertTrue(poem_models.Aggregation.objects.get(name='NEW_PROFILE'))

    @patch('requests.get')
    def test_sync_webapi_thresholdsprofile(self, func):
        func.side_effect = mocked_web_api_request
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        sync_webapi(
            'thresholds_profiles', poem_models.ThresholdsProfiles, "TENANT"
        )
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.all().count(), 2
        )
        self.assertEqual(
            poem_models.ThresholdsProfiles.objects.get(name='TEST_PROFILE'),
            self.tp1
        )
        self.assertRaises(
            poem_models.ThresholdsProfiles.DoesNotExist,
            poem_models.ThresholdsProfiles.objects.get,
            name='ANOTHER-PROFILE'
        )


class SyncWebApiTagsTests(TenantTestCase):
    def setUp(self) -> None:
        self.tenant.name = "TENANT"
        self.tenant.save()

        mock_db_for_metrics_tests()

        WebAPIKey.objects.create(
            name='WEB-API-ADMIN',
            token='mocked_token'
        )

    @patch("requests.put")
    def test_sync_tags(self, mock_put):
        with self.settings(
            WEBAPI_METRICSTAGS="https://metric.tags.com"
        ):
            mock_put.side_effect = mocked_put_response

            sync_tags_webapi()

            mock_put.assert_called_with(
                "https://metric.tags.com",
                headers={
                    "x-api-key": "mocked_token",
                    "Accept": "application/json"
                },
                data=json.dumps([
                    {
                        "name": "argo.AMSPublisher-Check",
                        "tags": [
                            "internal",
                            "test_tag1"
                        ]
                    },
                    {
                        "name": "hr.srce.CertLifetime-Local",
                        "tags": [
                            "internal"
                        ]
                    },
                    {
                        "name": "org.apel.APEL-Pub",
                        "tags": []
                    },
                    {
                        "name": "test.AMS-Check",
                        "tags": [
                            "test_tag1",
                            "test_tag2"
                        ]
                    },
                    {
                        "name": "test.EMPTY-metric",
                        "tags": []
                    }
                ])
            )

    @patch("requests.put")
    def test_sync_tags_with_error(self, mock_put):
        with self.settings(
            WEBAPI_METRICSTAGS="https://metric.tags.com"
        ):
            mock_put.side_effect = mocked_put_response_not_ok

            with self.assertRaises(WebApiException) as context:
                sync_tags_webapi()

            mock_put.assert_called_with(
                "https://metric.tags.com",
                headers={
                    "x-api-key": "mocked_token",
                    "Accept": "application/json"
                },
                data=json.dumps([
                    {
                        "name": "argo.AMSPublisher-Check",
                        "tags": [
                            "internal",
                            "test_tag1"
                        ]
                    },
                    {
                        "name": "hr.srce.CertLifetime-Local",
                        "tags": [
                            "internal"
                        ]
                    },
                    {
                        "name": "org.apel.APEL-Pub",
                        "tags": []
                    },
                    {
                        "name": "test.AMS-Check",
                        "tags": [
                            "test_tag1",
                            "test_tag2"
                        ]
                    },
                    {
                        "name": "test.EMPTY-metric",
                        "tags": []
                    }
                ])
            )

            self.assertEqual(
                context.exception.__str__(),
                "Error syncing metric tags: 400 BAD REQUEST: "
                "There has been an error"
            )

    @patch("requests.put")
    def test_sync_tags_with_error_without_msg(self, mock_put):
        with self.settings(
            WEBAPI_METRICSTAGS="https://metric.tags.com"
        ):
            mock_put.side_effect = mocked_put_response_not_ok_no_msg

            with self.assertRaises(WebApiException) as context:
                sync_tags_webapi()

            mock_put.assert_called_with(
                "https://metric.tags.com",
                headers={
                    "x-api-key": "mocked_token",
                    "Accept": "application/json"
                },
                data=json.dumps([
                    {
                        "name": "argo.AMSPublisher-Check",
                        "tags": [
                            "internal",
                            "test_tag1"
                        ]
                    },
                    {
                        "name": "hr.srce.CertLifetime-Local",
                        "tags": [
                            "internal"
                        ]
                    },
                    {
                        "name": "org.apel.APEL-Pub",
                        "tags": []
                    },
                    {
                        "name": "test.AMS-Check",
                        "tags": [
                            "test_tag1",
                            "test_tag2"
                        ]
                    },
                    {
                        "name": "test.EMPTY-metric",
                        "tags": []
                    }
                ])
            )

            self.assertEqual(
                context.exception.__str__(),
                "Error syncing metric tags: 500 SERVER ERROR"
            )


@factory.django.mute_signals(pre_save)
class BasicResourceInfoTests(TenantTestCase):
    def setUp(self):
        user = CustUser.objects.create_user(username='testuser')

        mtype1 = admin_models.MetricTemplateType.objects.create(name='Active')
        mtype2 = admin_models.MetricTemplateType.objects.create(name='Passive')

        ct = ContentType.objects.get_for_model(poem_models.Metric)

        tag1 = admin_models.OSTag.objects.create(name='CentOS 6')
        tag2 = admin_models.OSTag.objects.create(name='CentOS 7')

        repo1 = admin_models.YumRepo.objects.create(name='repo-1', tag=tag1)
        repo2 = admin_models.YumRepo.objects.create(name='repo-2', tag=tag2)

        package1 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.7'
        )
        package1.repos.add(repo1)

        package2 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.8'
        )
        package2.repos.add(repo1, repo2)

        package3 = admin_models.Package.objects.create(
            name='nagios-plugins-argo',
            version='0.1.11'
        )
        package3.repos.add(repo2)

        probe1 = admin_models.Probe.objects.create(
            name='ams-probe',
            package=package1,
            description='Probe is inspecting AMS service by trying to publish '
                        'and consume randomly generated messages.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probeversion1 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=user.username,
        )

        probe1.package = package2
        probe1.comment = 'Newer version.'
        probe1.save()

        probeversion2 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=user.username
        )

        probe1.package = package3
        probe1.comment = 'Newest version.'
        probe1.save()

        admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=user.username
        )

        probe2 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            package=package3,
            description='Probe is inspecting AMS publisher.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        probeversion4 = admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=probe2.package,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=user.username
        )

        metrictemplate1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=mtype1,
            probekey=probeversion1,
            description='Some description of argo.AMS-Check metric template.',
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        metrictemplate2 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=mtype2,
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate1,
            name=metrictemplate1.name,
            mtype=metrictemplate1.mtype,
            probekey=metrictemplate1.probekey,
            parent=metrictemplate1.parent,
            description=metrictemplate1.description,
            probeexecutable=metrictemplate1.probeexecutable,
            config=metrictemplate1.config,
            attribute=metrictemplate1.attribute,
            dependency=metrictemplate1.dependency,
            flags=metrictemplate1.flags,
            parameter=metrictemplate1.parameter,
            date_created=datetime.datetime.now(),
            version_user=user.username,
            version_comment='Initial version.',
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate2,
            name=metrictemplate2.name,
            mtype=metrictemplate2.mtype,
            description=metrictemplate2.description,
            probekey=metrictemplate2.probekey,
            parent=metrictemplate2.parent,
            probeexecutable=metrictemplate2.probeexecutable,
            config=metrictemplate2.config,
            attribute=metrictemplate2.attribute,
            dependency=metrictemplate2.dependency,
            flags=metrictemplate2.flags,
            parameter=metrictemplate2.parameter,
            date_created=datetime.datetime.now(),
            version_user=user.username,
            version_comment='Initial version.',
        )

        metrictemplate1.probekey = probeversion2
        metrictemplate1.config = '["maxCheckAttempts 4", "timeout 70", ' \
                                 '"path /usr/libexec/argo-monitoring/", ' \
                                 '"interval 5", "retryInterval 3"]'
        metrictemplate1.save()

        admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate1,
            name=metrictemplate1.name,
            mtype=metrictemplate1.mtype,
            description=metrictemplate1.description,
            probekey=metrictemplate1.probekey,
            probeexecutable=metrictemplate1.probeexecutable,
            config=metrictemplate1.config,
            attribute=metrictemplate1.attribute,
            dependency=metrictemplate1.dependency,
            flags=metrictemplate1.flags,
            parameter=metrictemplate1.parameter,
            date_created=datetime.datetime.now(),
            version_user=user.username,
            version_comment=create_comment(metrictemplate1)
        )

        metrictemplate3 = admin_models.MetricTemplate.objects.create(
            name='argo.AMSPublisher-Check',
            mtype=mtype1,
            probekey=probeversion4,
            probeexecutable='["ams-publisher-probe"]',
            config='["interval 180", "maxCheckAttempts 1", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"retryInterval 1", "timeout 120"]',
            parameter='["-s /var/run/argo-nagios-ams-publisher/sock"]',
            flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate3,
            name=metrictemplate3.name,
            mtype=metrictemplate3.mtype,
            description=metrictemplate3.description,
            probekey=metrictemplate3.probekey,
            parent=metrictemplate3.parent,
            probeexecutable=metrictemplate3.probeexecutable,
            config=metrictemplate3.config,
            attribute=metrictemplate3.attribute,
            dependency=metrictemplate3.dependency,
            flags=metrictemplate3.flags,
            parameter=metrictemplate3.parameter,
            date_created=datetime.datetime.now(),
            version_user=user.username,
            version_comment=create_comment(metrictemplate3)
        )

        group = poem_models.GroupOfMetrics.objects.create(name='TEST')

        metric1 = poem_models.Metric.objects.create(
            name=metrictemplate1.name,
            group=group,
            probeversion=metrictemplate1.probekey.__str__(),
            config=metrictemplate1.config
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric1.id,
            object_repr=metric1.__str__(),
            serialized_data=serialize_metric(metric1),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=user.username
        )

        metric2 = poem_models.Metric.objects.create(
            name=metrictemplate2.name,
            group=group,
            probeversion=metrictemplate2.probekey.__str__(),
            config=metrictemplate2.config
        )

        poem_models.TenantHistory.objects.create(
            object_id=metric2.id,
            object_repr=metric2.__str__(),
            serialized_data=serialize_metric(metric2),
            content_type=ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=user.username
        )

    def test_get_resource_info(self):
        data = get_tenant_resources('test')
        self.assertEqual(data, {'metrics': 2, 'probes': 1})

    def test_get_resourece_info_for_super_poem_tenant(self):
        data = get_tenant_resources(get_public_schema_name())
        self.assertEqual(data, {'metric_templates': 3, 'probes': 2})
