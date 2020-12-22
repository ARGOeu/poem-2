import datetime
import json
from unittest.mock import patch, call

import requests
from Poem.api.models import MyAPIKey
from Poem.helpers.history_helpers import create_comment, update_comment
from Poem.helpers.metrics_helpers import import_metrics, update_metrics, \
    update_metrics_in_profiles, get_metrics_in_profiles, \
    delete_metrics_from_profile
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django.core.management import call_command
from django.db import connection
from django.test.testcases import TransactionTestCase
from tenant_schemas.test.cases import TenantTestCase
from tenant_schemas.utils import get_tenant_model, get_public_schema_name, \
    schema_context

from .utils_test import mocked_func, mocked_web_api_metric_profile, \
    mocked_web_api_metric_profile_put, mocked_web_api_metric_profiles, \
    mocked_web_api_metric_profiles_empty, \
    mocked_web_api_metric_profiles_wrong_token

ALLOWED_TEST_DOMAIN = '.test.com'


class HistoryHelpersTests(TenantTestCase):
    def setUp(self):
        tag = admin_models.OSTag.objects.create(name='CentOS 6')
        self.repo = admin_models.YumRepo.objects.create(name='repo-1', tag=tag)

        self.package1 = admin_models.Package.objects.create(
            name='package-1',
            version='1.0.0'
        )
        self.package1.repos.add(self.repo)

        package2 = admin_models.Package.objects.create(
            name='package-1',
            version='1.0.1'
        )
        package2.repos.add(self.repo)

        package3 = admin_models.Package.objects.create(
            name='package-1',
            version='2.0.0'
        )

        self.probe1 = admin_models.Probe.objects.create(
            name='probe-1',
            package=self.package1,
            description='Some description.',
            comment='Some comment.',
            repository='https://repository.url',
            docurl='https://doc.url',
            user='testuser',
            datetime=datetime.datetime.now()
        )

        self.ct_metric = ContentType.objects.get_for_model(poem_models.Metric)
        self.ct_mp = ContentType.objects.get_for_model(
            poem_models.MetricProfiles
        )
        self.ct_aggr = ContentType.objects.get_for_model(
            poem_models.Aggregation
        )
        self.ct_tp = ContentType.objects.get_for_model(
            poem_models.ThresholdsProfiles
        )

        self.active = admin_models.MetricTemplateType.objects.create(
            name='Active'
        )
        self.metric_active = poem_models.MetricType.objects.create(
            name='Active'
        )

        probe_history1 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            version_comment='Initial version.',
            version_user='testuser'
        )

        self.probe1.package = package2
        self.probe1.comment = 'New version.'
        self.probe1.save()

        self.probe_history2 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user='testuser'
        )

        self.probe1.package = package3
        self.probe1.comment = 'Newest version.'
        self.probe1.save()

        self.probe_history3 = admin_models.ProbeHistory.objects.create(
            object_id=self.probe1,
            name=self.probe1.name,
            package=self.probe1.package,
            description=self.probe1.description,
            comment=self.probe1.comment,
            repository=self.probe1.repository,
            docurl=self.probe1.docurl,
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user='testuser'
        )

        self.metrictag1 = admin_models.MetricTags.objects.create(
            name='test_tag1'
        )
        self.metrictag2 = admin_models.MetricTags.objects.create(
            name='test_tag2'
        )
        self.metrictag3 = admin_models.MetricTags.objects.create(
            name='test_tag3'
        )

        self.mt1 = admin_models.MetricTemplate.objects.create(
            name='metric-template-1',
            description='Description of metric-template-1.',
            parent='["parent"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependency='["dependency-key1 dependency-value1", '
                       '"dependency-key2 dependency-value2"]',
            flags='["flags-key flags-value"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.active,
            probekey=probe_history1
        )
        self.mt1.tags.add(self.metrictag1, self.metrictag2)

        mth1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            parent=self.mt1.parent,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user='testuser'
        )
        mth1.tags.add(self.metrictag1, self.metrictag2)

        self.mt1.probekey = self.probe_history2
        self.mt1.config = '["maxCheckAttempts 3", "timeout 70", ' \
                          '"path $USER", "interval 5", "retryInterval 3"]'
        self.mt1.save()

        mth2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt1,
            name=self.mt1.name,
            mtype=self.mt1.mtype,
            probekey=self.mt1.probekey,
            description=self.mt1.description,
            parent=self.mt1.parent,
            probeexecutable=self.mt1.probeexecutable,
            config=self.mt1.config,
            attribute=self.mt1.attribute,
            dependency=self.mt1.dependency,
            flags=self.mt1.flags,
            files=self.mt1.files,
            parameter=self.mt1.parameter,
            fileparameter=self.mt1.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='[{"changed": {"fields": ["config"], '
                            '"object": ["timeout"]}}, {"changed": {"fields": '
                            '["probekey"]}}]',
            version_user='testuser'
        )
        mth2.tags.add(self.metrictag1, self.metrictag2)

        self.mt2 = admin_models.MetricTemplate.objects.create(
            name='metric-template-3',
            description='Description of metric-template-3.',
            parent='["parent"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependency='["dependency-key1 dependency-value1", '
                       '"dependency-key2 dependency-value2"]',
            flags='["flags-key flags-value"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.active,
            probekey=probe_history1
        )
        self.mt2.tags.add(self.metrictag1)

        mth3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt2,
            name=self.mt2.name,
            mtype=self.mt2.mtype,
            probekey=self.mt2.probekey,
            description=self.mt2.description,
            parent=self.mt2.parent,
            probeexecutable=self.mt2.probeexecutable,
            config=self.mt2.config,
            attribute=self.mt2.attribute,
            dependency=self.mt2.dependency,
            flags=self.mt2.flags,
            files=self.mt2.files,
            parameter=self.mt2.parameter,
            fileparameter=self.mt2.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user='testuser'
        )
        mth3.tags.add(self.metrictag1)

        self.metric1 = poem_models.Metric.objects.create(
            name='metric-1',
            description='Description of metric-1.',
            parent='["parent"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependancy='["dependency-key1 dependency-value1", '
                       '"dependency-key2 dependency-value2"]',
            flags='["flags-key flags-value"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.metric_active,
            probekey=probe_history1
        )
        self.metric1.tags.add(self.metrictag1, self.metrictag2)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct_metric
        )

        poem_models.GroupOfMetricProfiles.objects.create(name='TEST')
        poem_models.GroupOfMetricProfiles.objects.create(name='TEST2')

        self.mp1 = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='TEST'
        )

        data = json.loads(serializers.serialize(
            'json', [self.mp1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'metricinstances': [
                ('AMGA', 'org.nagios.SAML-SP'),
                ('APEL', 'org.apel.APEL-Pub'),
                ('APEL', 'org.apel.APEL-Sync')
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.mp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.mp1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct_mp
        )

        poem_models.GroupOfAggregations.objects.create(name='TEST')
        poem_models.GroupOfAggregations.objects.create(name='TEST2')

        self.aggr1 = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='TEST'
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.aggr1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'endpoint_group': 'sites',
            'metric_operation': 'AND',
            'profile_operation': 'AND',
            'metric_profile': 'TEST_PROFILE',
            'groups': [
                {
                    'name': 'Group1',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'AMGA',
                            'operation': 'OR'
                        },
                        {
                            'name': 'APEL',
                            'operation': 'OR'
                        }
                    ]
                },
                {
                    'name': 'Group2',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'VOMS',
                            'operation': 'OR'
                        },
                        {
                            'name': 'argo.api',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.aggr1.id,
            serialized_data=json.dumps(data),
            object_repr=self.aggr1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct_aggr
        )

        self.tp1 = poem_models.ThresholdsProfiles.objects.create(
            name='TEST_PROFILE',
            apiid='00000000-oooo-kkkk-aaaa-aaeekkccnnee',
            groupname='TEST'
        )

        data = json.loads(
            serializers.serialize(
                'json', [self.tp1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            )
        )
        data[0]['fields'].update({
            'rules': [
                {
                    'host': 'hostFoo',
                    'metric': 'metricA',
                    'thresholds': 'freshness=1s;10;9:;0;25 entries=1;3;0:2;10'
                }
            ]
        })

        poem_models.TenantHistory.objects.create(
            object_id=self.tp1.id,
            serialized_data=json.dumps(data),
            object_repr=self.tp1.__str__(),
            comment='Initial version.',
            user='testuser',
            content_type=self.ct_tp
        )

    def test_create_comment_for_metric_template(self):
        self.mt1.name = 'metric-template-2'
        self.mt1.description = 'New description for metric-template-2.'
        self.mt1.probekey = self.probe_history3
        self.mt1.parent = ''
        self.mt1.probeexecutable = '["new-probeexecutable"]'
        self.mt1.dependency = '["dependency-key1 dependency-value1"]'
        self.mt1.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        self.mt1.save()
        self.mt1.tags.remove(self.metrictag1)
        self.mt1.tags.add(self.metrictag3)
        comment = create_comment(self.mt1)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"deleted": {"fields": ["dependency"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"added": {"fields": ["tags"], "object": ["test_tag3"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag1"]}}',
                '{"added": {"fields": ["probeexecutable"]}}',
                '{"changed": {"fields": ["description", "name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_create_comment_for_metric_template_if_initial(self):
        mt = admin_models.MetricTemplate.objects.create(
            name='metric-template-2',
            description='Description for metric-template-2.',
            probekey=self.probe_history2,
            probeexecutable='["new-probeexecutable"]',
            config='["maxCheckAttempts 4", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 4"]',
            attribute='["attribute-key attribute-value"]',
            dependency='["dependency-key1 dependency-value1"]',
            flags='["flags-key flags-value", "flags-key1 flags-value2"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.active
        )
        mt.tags.add(self.metrictag1)
        comment = create_comment(mt)
        self.assertEqual(comment, 'Initial version.')

    def test_update_comment_for_metric_template(self):
        self.mt1.name = 'metric-template-2'
        self.mt1.parent = ''
        self.mt1.probeexecutable = '["new-probeexecutable"]'
        self.mt1.dependency = '["dependency-key1 dependency-value1"]'
        self.mt1.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        self.mt1.save()
        self.mt1.tags.add(self.metrictag3)
        comment = update_comment(self.mt1)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], "object": ["timeout"]}}',
                '{"deleted": {"fields": ["dependency"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"added": {"fields": ["tags"], "object": ["test_tag3"]}}',
                '{"added": {"fields": ["probeexecutable"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_do_not_update_comment_for_metric_template_if_initial(self):
        self.mt2.name = 'metric-template-4'
        self.mt2.description = 'Description for metric-template-4.'
        self.mt2.parent = ''
        self.mt2.probeexecutable = '["new-probeexecutable"]'
        self.mt2.dependency = '["dependency-key1 dependency-value1"]'
        self.mt2.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        self.mt2.save()
        self.mt2.tags.add(self.metrictag3)
        comment = update_comment(self.mt2)
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_probe(self):
        package = admin_models.Package.objects.create(
            name='package',
            version='2.0.2'
        )
        package.repos.add(self.repo)
        self.probe1.name = 'probe-2'
        self.probe1.package = package
        self.probe1.description = 'Some new description.'
        self.probe1.comment = 'Newer version.'
        self.probe1.repository = 'https://repository2.url'
        self.probe1.docurl = 'https://doc2.url',
        self.probe1.save()
        comment = create_comment(self.probe1)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["comment", "description", "docurl", '
                '"name", "package", "repository"]}}'
            }
        )

    def test_update_comment_for_probe(self):
        package = admin_models.Package.objects.create(
            name='package',
            version='2.0.2'
        )
        package.repos.add(self.repo)
        self.probe1.name = 'probe-2'
        self.probe1.package = package
        self.probe1.save()
        comment = update_comment(self.probe1)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["comment", "name", "package"]}}'
            }
        )

    def test_do_not_update_comment_for_probe_if_initial(self):
        probe2 = admin_models.Probe.objects.create(
            name='probe-3',
            package=self.package1,
            description='Some description.',
            comment='Initial version.',
            repository='https://repository.url',
            docurl='https://doc.url',
            user='testuser',
            datetime=datetime.datetime.now()
        )
        admin_models.ProbeHistory.objects.create(
            object_id=probe2,
            name=probe2.name,
            package=probe2.package,
            description=probe2.description,
            comment=probe2.comment,
            repository=probe2.repository,
            docurl=probe2.docurl,
            version_comment='Initial version.',
            version_user='testuser'
        )
        probe2.comment = 'Some comment.'
        probe2.save()
        comment = update_comment(probe2)
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_probe_if_initial(self):
        package = admin_models.Package.objects.create(
            name='package',
            version='1.0.2'
        )
        package.repos.add(self.repo)
        probe2 = admin_models.Probe.objects.create(
            name='probe-2',
            package=package,
            description='Some new description.',
            comment='Newer version.',
            repository='https://repository2.url',
            docurl='https://doc2.url',
            user='testuser',
            datetime=datetime.datetime.now()
        )
        comment = create_comment(probe2)
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_metric(self):
        metric = poem_models.Metric.objects.get(
            id=self.metric1.id
        )
        metric.name = 'metric-2'
        metric.description = 'Description for metric-2.'
        metric.probekey = self.probe_history2
        metric.probeexecutable = '["new-probeexecutable"]'
        metric.config = '["maxCheckAttempts 3", "timeout 60",' \
                        ' "path $USER", "interval 5", "retryInterval 3"]'
        metric.attribute = '["attribute-key attribute-value"]'
        metric.dependancy = '["dependency-key1 dependency-value1"]'
        metric.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        metric.files = '["files-key files-value"]'
        metric.parameter = '["parameter-key parameter-value"]'
        metric.fileparameter = '["fileparameter-key fileparameter-value"]'
        metric.mtype = self.metric_active
        metric.parent = ''
        metric.save()
        serialized_data = serializers.serialize(
            'json', [metric],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        comment = create_comment(self.metric1, self.ct_metric,
                                 serialized_data)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"deleted": {"fields": ["dependancy"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"added": {"fields": ["probeexecutable"]}}',
                '{"changed": {"fields": ["description", "name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_create_comment_for_metric_if_field_deleted_from_model(self):
        mt = poem_models.Metric.objects.get(
            id=self.metric1.id
        )
        mt.name = 'metric-2'
        mt.description = 'Description of metric-1.'
        mt.probekey = self.probe_history2
        mt.probeexecutable = '["new-probeexecutable"]'
        mt.config = '["maxCheckAttempts 4", "timeout 60",' \
                    ' "path $USER", "interval 5", "retryInterval 3"]'
        mt.attribute = '["attribute-key attribute-value"]'
        mt.dependancy = '["dependency-key1 dependency-value1"]'
        mt.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        mt.files = '["files-key files-value"]'
        mt.parameter = '["parameter-key parameter-value"]'
        mt.mtype = self.metric_active
        mt.parent = ''
        mt.save()
        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        # let's say fileparameter field no longer exists in the model
        dict_serialized = json.loads(serialized_data)
        del dict_serialized[0]['fields']['fileparameter']
        new_serialized_data = json.dumps(dict_serialized)
        comment = create_comment(self.metric1, self.ct_metric,
                                 new_serialized_data)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts"]}}',
                '{"deleted": {"fields": ["dependancy"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"added": {"fields": ["probeexecutable"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_create_comment_for_metric_if_field_added_to_model(self):
        mt = poem_models.Metric.objects.get(
            id=self.metric1.id
        )
        mt.name = 'metric-2'
        mt.description = 'Description of metric-1.'
        mt.probekey = self.probe_history2
        mt.probeexecutable = '["new-probeexecutable"]'
        mt.config = '["maxCheckAttempts 4", "timeout 60",' \
                    ' "path $USER", "interval 5", "retryInterval 4"]'
        mt.attribute = '["attribute-key attribute-value"]'
        mt.dependancy = '["dependency-key1 dependency-value1"]'
        mt.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        mt.files = '["files-key files-value"]'
        mt.parameter = '["parameter-key parameter-value"]'
        mt.fileparameter = '["fileparameter-key fileparameter-value"]'
        mt.mtype = self.metric_active
        mt.parent = ''
        mt.save()
        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        # let's say mock_field was added to model
        dict_serialized = json.loads(serialized_data)
        dict_serialized[0]['fields']['mock_field'] = 'mock_value'
        new_serialized_data = json.dumps(dict_serialized)
        comment = create_comment(self.metric1, self.ct_metric,
                                 new_serialized_data)
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "retryInterval"]}}',
                '{"deleted": {"fields": ["dependancy"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"added": {"fields": ["mock_field", "probeexecutable"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_create_comment_for_metric_if_initial(self):
        mt = poem_models.Metric.objects.create(
            name='metric-template-2',
            description='Description for metric-2.',
            probekey=self.probe_history2,
            probeexecutable='["new-probeexecutable"]',
            config='["maxCheckAttempts 4", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 4"]',
            attribute='["attribute-key attribute-value"]',
            dependancy='["dependency-key1 dependency-value1"]',
            flags='["flags-key flags-value", "flags-key1 flags-value2"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.metric_active
        )
        serialized_data = serializers.serialize(
            'json', [mt],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        comment = create_comment(mt, self.ct_metric, serialized_data)
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_metric_if_group_was_none(self):
        group = poem_models.GroupOfMetrics.objects.create(name='EGI')
        m = self.metric1
        m.group = group
        m.save()
        serialized_data = serializers.serialize(
            'json', [m],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
        comment = create_comment(m, self.ct_metric, serialized_data)
        self.assertEqual(comment, '[{"added": {"fields": ["group"]}}]')

    def test_create_comment_for_metricprofile(self):
        self.mp1.name = 'TEST_PROFILE2',
        self.mp1.groupname = 'TEST2'
        self.mp1.save()
        data = json.loads(serializers.serialize(
            'json', [self.mp1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'metricinstances': [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['ARC-CE', 'org.nordugrid.ARC-CE-IGTF']
            ]
        })
        comment = create_comment(self.mp1, self.ct_mp, json.dumps(data))
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["groupname", "name"]}}',
                '{"added": {"fields": ["metricinstances"], '
                '"object": ["ARC-CE", "org.nordugrid.ARC-CE-IGTF"]}}',
                '{"deleted": {"fields": ["metricinstances"], '
                '"object": ["APEL", "org.apel.APEL-Sync"]}}'
            }
        )

    def test_create_comment_for_metricprofile_if_initial(self):
        mp = poem_models.MetricProfiles.objects.create(
            name='TEST_PROFILE2',
            groupname='TEST',
            apiid='10000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        data = json.loads(serializers.serialize(
            'json', [mp],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'metricinstances': [
                ['AMGA', 'org.nagios.SAML-SP'],
                ['APEL', 'org.apel.APEL-Pub'],
                ['ARC-CE', 'org.nordugrid.ARC-CE-IGTF']
            ]
        })
        comment = create_comment(mp, self.ct_mp, json.dumps(data))
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_aggregation_profile(self):
        self.aggr1.name = 'TEST_PROFILE2'
        self.aggr1.groupname = 'TEST2'
        data = json.loads(serializers.serialize(
            'json', [self.aggr1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'OR',
            'metric_profile': 'TEST_PROFILE2',
            'groups': [
                {
                    'name': 'Group1a',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'AMGA',
                            'operation': 'OR'
                        },
                        {
                            'name': 'APEL',
                            'operation': 'OR'
                        }
                    ]
                },
                {
                    'name': 'Group2',
                    'operation': 'OR',
                    'services': [
                        {
                            'name': 'argo.api',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })
        comment = create_comment(self.aggr1, self.ct_aggr, json.dumps(data))
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["endpoint_group", "groupname", '
                '"metric_operation", "metric_profile", "name", '
                '"profile_operation"]}}',
                '{"deleted": {"fields": ["groups"], "object": ["Group1"]}}',
                '{"added": {"fields": ["groups"], "object": ["Group1a"]}}',
                '{"changed": {"fields": ["groups"], "object": ["Group2"]}}'
            }
        )
        self.aggr1.save()

    def test_create_comment_for_aggregationprofile_if_initial(self):
        aggr = poem_models.Aggregation.objects.create(
            name='TEST_PROFILE2',
            groupname='TEST',
            apiid='10000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        data = json.loads(serializers.serialize(
            'json', [aggr],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'endpoint_group': 'servicegroups',
            'metric_operation': 'OR',
            'profile_operation': 'OR',
            'metric_profile': 'TEST_PROFILE2',
            'groups': [
                {
                    'name': 'Group1a',
                    'operation': 'AND',
                    'services': [
                        {
                            'name': 'AMGA',
                            'operation': 'OR'
                        },
                        {
                            'name': 'APEL',
                            'operation': 'OR'
                        }
                    ]
                }
            ]
        })
        comment = create_comment(aggr, self.ct_aggr, json.dumps(data))
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_thresholds_profile(self):
        self.tp1.name = 'TEST_PROFILE2'
        self.tp1.groupname = 'TEST2'
        self.tp1.save()
        data = json.loads(serializers.serialize(
            'json', [self.tp1],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'rules': [
                {
                    'host': 'hostFoo',
                    'metric': 'metricA',
                    'thresholds': 'freshness=1s;10;9:;0;25'
                },
                {
                    'host': 'hostBar',
                    'endpoint_group': 'TEST-SITE-51',
                    'metric': 'httpd.ResponseTime',
                    'thresholds': 'response=20ms;0:500;499:1000'
                },
                {
                    'metric': 'httpd.ResponseTime',
                    'thresholds': 'response=20ms;0:300;299:1000'
                }
            ]
        })
        comment = create_comment(self.tp1, self.ct_tp, json.dumps(data))
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["groupname", "name"]}}',
                '{"changed": {"fields": ["rules"], "object": ["metricA"]}}',
                '{"added": {"fields": ["rules"], '
                '"object": ["httpd.ResponseTime"]}}',
            }
        )

    def test_create_comment_for_thresholds_profile_if_initial(self):
        tp = poem_models.ThresholdsProfiles.objects.create(
            name='TEST_PROFILE2',
            groupname='TEST',
            apiid='10000000-oooo-kkkk-aaaa-aaeekkccnnee'
        )
        data = json.loads(serializers.serialize(
            'json', [tp],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        ))
        data[0]['fields'].update({
            'rules': [
                {
                    'host': 'hostBar',
                    'endpoint_group': 'TEST-SITE-51',
                    'metric': 'httpd.ResponseTime',
                    'thresholds': 'response=20ms;0:500;499:1000'
                },
                {
                    'metric': 'httpd.ResponseTime',
                    'thresholds': 'response=20ms;0:300;299:1000'
                }
            ]
        })
        comment = create_comment(tp, self.ct_tp, json.dumps(data))
        self.assertEqual(comment, 'Initial version.')


class MetricsHelpersTests(TransactionTestCase):
    """
    Using TransactionTestCase because of handling of IntegrityError. The extra
    setup steps are taken from TenantTestCase.
    """
    @classmethod
    def add_allowed_test_domain(cls):

        # ALLOWED_HOSTS is a special setting of Django setup_test_environment
        # so we can't modify it with helpers
        if ALLOWED_TEST_DOMAIN not in settings.ALLOWED_HOSTS:
            settings.ALLOWED_HOSTS += [ALLOWED_TEST_DOMAIN]

    @classmethod
    def remove_allowed_test_domain(cls):
        if ALLOWED_TEST_DOMAIN in settings.ALLOWED_HOSTS:
            settings.ALLOWED_HOSTS.remove(ALLOWED_TEST_DOMAIN)

    def tearDown(self):
        connection.set_schema_to_public()
        self.tenant.delete()

        self.remove_allowed_test_domain()
        cursor = connection.cursor()
        cursor.execute('DROP SCHEMA IF EXISTS test CASCADE')

    @classmethod
    def sync_shared(cls):
        call_command('migrate_schemas',
                     schema_name=get_public_schema_name(),
                     interactive=False,
                     verbosity=0)

    def setUp(self):
        self.sync_shared()
        self.add_allowed_test_domain()
        tenant_domain = 'tenant.test.com'
        self.tenant = get_tenant_model()(domain_url=tenant_domain,
                                         schema_name='test',
                                         name='Test')
        self.tenant.save(verbosity=0)

        connection.set_tenant(self.tenant)

        for schema in [self.tenant.schema_name, get_public_schema_name()]:
            with schema_context(schema):
                if schema == get_public_schema_name():
                    Tenant.objects.create(
                        name='public', domain_url='public',
                        schema_name=get_public_schema_name()
                    )

        self.user = CustUser.objects.create_user(username='testuser')

        self.mt_active = admin_models.MetricTemplateType.objects.create(
            name='Active'
        )
        self.mt_passive = admin_models.MetricTemplateType.objects.create(
            name='Passive'
        )

        self.mtag1 = admin_models.MetricTags.objects.create(name='test_tag1')
        self.mtag2 = admin_models.MetricTags.objects.create(name='test_tag2')
        self.mtag3 = admin_models.MetricTags.objects.create(name='test_tag3')

        self.m_active = poem_models.MetricType.objects.create(name='Active')
        self.m_passive = poem_models.MetricType.objects.create(name='Passive')

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

        package4 = admin_models.Package.objects.create(
            name='nagios-plugins-http',
            version='2.2.2'
        )
        package4.repos.add(repo1, repo2)

        package5 = admin_models.Package.objects.create(
            name='nagios-plugins-fedcloud',
            version='0.5.2'
        )
        package5.repos.add(repo1)

        package6 = admin_models.Package.objects.create(
            name='test_package_1',
            version='1.1.0'
        )
        package6.repos.add(repo1, repo2)

        package7 = admin_models.Package.objects.create(
            name='test_package_1',
            version='1.2.0'
        )
        package7.repos.add(repo1, repo2)

        package8 = admin_models.Package.objects.create(
            name='test_package_2',
            version='2.0.0'
        )
        package8.repos.add(repo1, repo2)

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

        self.probeversion1_1 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username,
        )

        probe1.package = package2
        probe1.comment = 'Newer version.'
        probe1.save()

        self.probeversion1_2 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=self.user.username
        )

        probe1.package = package3
        probe1.comment = 'Newest version.'
        probe1.save()

        self.probeversion1_3 = admin_models.ProbeHistory.objects.create(
            object_id=probe1,
            name=probe1.name,
            package=probe1.package,
            description=probe1.description,
            comment=probe1.comment,
            repository=probe1.repository,
            docurl=probe1.docurl,
            date_created=datetime.datetime.now(),
            version_comment='[{"changed": {"fields": ["package", "comment"]}}]',
            version_user=self.user.username
        )

        probe2 = admin_models.Probe.objects.create(
            name='check_http',
            package=package4,
            description='This plugin tests the HTTP service on the specified '
                        'host.',
            comment='Initial version',
            repository='https://nagios-plugins.org',
            docurl='http://nagios-plugins.org/doc/man/check_http.html'
        )

        probeversion2 = admin_models.ProbeHistory.objects.create(
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

        probe3 = admin_models.Probe.objects.create(
            name='novaprobe',
            package=package5,
            description='Probe uses OpenStack Nova interface.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-fedcloud',
            docurl='https://wiki.egi.eu/wiki/Cloud_SAM_tests'
        )

        probeversion3 = admin_models.ProbeHistory.objects.create(
            object_id=probe3,
            name=probe3.name,
            package=probe3.package,
            description=probe3.description,
            comment=probe3.comment,
            repository=probe3.repository,
            docurl=probe3.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe4 = admin_models.Probe.objects.create(
            name='swiftprobe',
            package=package5,
            description='Probe uses OpenStack Swift interface.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-fedcloud',
            docurl='https://github.com/ARGOeu/nagios-plugins-fedcloud/blob/'
                   'master/README.md'
        )

        probeversion4 = admin_models.ProbeHistory.objects.create(
            object_id=probe4,
            name=probe4.name,
            package=probe4.package,
            description=probe4.description,
            comment=probe4.comment,
            repository=probe4.repository,
            docurl=probe4.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe5 = admin_models.Probe.objects.create(
            name='ams-publisher-probe',
            package=package1,
            description='Probe is inspecting AMS publisher.',
            comment='Initial version.',
            repository='https://github.com/ARGOeu/nagios-plugins-argo',
            docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
                   'README.md'
        )

        self.probeversion5_1 = admin_models.ProbeHistory.objects.create(
            object_id=probe5,
            name=probe5.name,
            package=probe5.package,
            description=probe5.description,
            comment=probe5.comment,
            repository=probe5.repository,
            docurl=probe5.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe5.package = package2
        probe5.comment = 'Newer version.'
        probe5.save()

        self.probeversion5_2 = admin_models.ProbeHistory.objects.create(
            object_id=probe5,
            name=probe5.name,
            package=probe5.package,
            description=probe5.description,
            comment=probe5.comment,
            repository=probe5.repository,
            docurl=probe5.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newer version.',
            version_user=self.user.username
        )

        probe5.package = package3
        probe5.comment = 'Newest version.'
        probe5.save()

        self.probeversion5_3 = admin_models.ProbeHistory.objects.create(
            object_id=probe5,
            name=probe5.name,
            package=probe5.package,
            description=probe5.description,
            comment=probe5.comment,
            repository=probe5.repository,
            docurl=probe5.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newest version.',
            version_user=self.user.username
        )

        probe6 = admin_models.Probe.objects.create(
            name='test-probe',
            package=package6,
            description='Some description.',
            comment='Initial version.',
            repository='https://repo.com',
            docurl='https://documentation.com'
        )

        probeversion6_1 = admin_models.ProbeHistory.objects.create(
            object_id=probe6,
            name=probe6.name,
            package=probe6.package,
            description=probe6.description,
            comment=probe6.comment,
            repository=probe6.repository,
            docurl=probe6.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe6.package = package7
        probe6.comment = 'Newer version.'
        probe6.save()

        probeversion6_2 = admin_models.ProbeHistory.objects.create(
            object_id=probe6,
            name=probe6.name,
            package=probe6.package,
            description=probe6.description,
            comment=probe6.comment,
            repository=probe6.repository,
            docurl=probe6.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Newer version.',
            version_user=self.user.username
        )

        probe7 = admin_models.Probe.objects.create(
            name='test-probe-2',
            package=package8,
            description='Description for the probe.',
            comment='Initial version.',
            repository='https://probe-repo.com',
            docurl='https://probe-documentation.com'
        )

        admin_models.ProbeHistory.objects.create(
            object_id=probe7,
            name=probe7.name,
            package=probe7.package,
            description=probe7.description,
            comment=probe7.comment,
            repository=probe7.repository,
            docurl=probe7.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user=self.user.username
        )

        probe7.package = package6
        probe7.description = 'Description for the probe, which was changed.'
        probe7.comment = 'Changed version.'
        probe7.save()

        probeversion7_2 = admin_models.ProbeHistory.objects.create(
            object_id=probe7,
            name=probe7.name,
            package=probe7.package,
            description=probe7.description,
            comment=probe7.comment,
            repository=probe7.repository,
            docurl=probe7.docurl,
            date_created=datetime.datetime.now(),
            version_comment='Changed version.',
            version_user=self.user.username
        )

        self.metrictemplate1 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check',
            mtype=self.mt_active,
            probekey=self.probeversion1_1,
            description='Some description of argo.AMS-Check metric template.',
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        self.metrictemplate1.tags.add(self.mtag1, self.mtag2)

        self.mt1_history1 = admin_models.MetricTemplateHistory.objects.create(
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
            files=self.metrictemplate1.files,
            parameter=self.metrictemplate1.parameter,
            fileparameter=self.metrictemplate1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )
        self.mt1_history1.tags.add(self.mtag1, self.mtag2)

        self.metrictemplate1.probekey = self.probeversion1_2
        self.metrictemplate1.config = '["maxCheckAttempts 4", "timeout 70", ' \
                                      '"path /usr/libexec/argo-monitoring/", ' \
                                      '"interval 5", "retryInterval 3"]'
        self.metrictemplate1.save()
        self.metrictemplate1.tags.add(self.mtag3)

        self.mt1_history2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate1,
            name=self.metrictemplate1.name,
            mtype=self.metrictemplate1.mtype,
            description=self.metrictemplate1.description,
            probekey=self.metrictemplate1.probekey,
            probeexecutable=self.metrictemplate1.probeexecutable,
            config=self.metrictemplate1.config,
            attribute=self.metrictemplate1.attribute,
            dependency=self.metrictemplate1.dependency,
            flags=self.metrictemplate1.flags,
            files=self.metrictemplate1.files,
            parameter=self.metrictemplate1.parameter,
            fileparameter=self.metrictemplate1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment=create_comment(self.metrictemplate1)
        )
        self.mt1_history2.tags.add(self.mtag1, self.mtag2, self.mtag3)

        self.metrictemplate1.probekey = self.probeversion1_3
        self.metrictemplate1.save()

        self.mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate1,
            name=self.metrictemplate1.name,
            mtype=self.metrictemplate1.mtype,
            description=self.metrictemplate1.description,
            probekey=self.metrictemplate1.probekey,
            probeexecutable=self.metrictemplate1.probeexecutable,
            config=self.metrictemplate1.config,
            attribute=self.metrictemplate1.attribute,
            dependency=self.metrictemplate1.dependency,
            flags=self.metrictemplate1.flags,
            files=self.metrictemplate1.files,
            parameter=self.metrictemplate1.parameter,
            fileparameter=self.metrictemplate1.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment=create_comment(self.metrictemplate1)
        )
        self.mt1_history3.tags.add(self.mtag1, self.mtag2, self.mtag3)

        self.metrictemplate2 = admin_models.MetricTemplate.objects.create(
            name='org.nagios.CertLifetime',
            mtype=self.mt_active,
            probekey=probeversion2,
            probeexecutable='check_http',
            config='["maxCheckAttempts 2", "timeout 60", '
                   '"path $USER1$", "interval 240", "retryInterval 30"]',
            attribute='["NAGIOS_HOST_CERT -J", "NAGIOS_HOST_KEY -K"]',
            parameter='["-C 30", "--sni "]',
            flags='["OBSESS 1"]'
        )
        self.metrictemplate2.tags.add(self.mtag2)

        mt2_history1 = admin_models.MetricTemplateHistory.objects.create(
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
            files=self.metrictemplate2.files,
            parameter=self.metrictemplate2.parameter,
            fileparameter=self.metrictemplate2.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )
        mt2_history1.tags.add(self.mtag2)

        self.metrictemplate3 = admin_models.MetricTemplate.objects.create(
            name='eu.egi.cloud.OpenStack-VM',
            mtype=self.mt_active,
            probekey=probeversion3,
            probeexecutable='novaprobe.py',
            config='["maxCheckAttempts 2", "timeout 300", '
                   '"path /usr/libexec/argo-monitoring/probes/fedcloud", '
                   '"interval 60", "retryInterval 15"]',
            attribute='["OIDC_ACCESS_TOKEN --access-token", '
                      '"OS_APPDB_IMAGE --appdb-image", '
                      '"OS_KEYSTONE_URL --endpoint", "X509_USER_PROXY --cert"]',
            dependency='["hr.srce.GridProxy-Valid 0", '
                       '"org.nagios.Keystone-TCP 1"]',
            parameter='["-v "]',
            flags='["VO 1", "NOHOSTNAME 1", "OBSESS 1"]'
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate3,
            name=self.metrictemplate3.name,
            mtype=self.metrictemplate3.mtype,
            probekey=self.metrictemplate3.probekey,
            description=self.metrictemplate3.description,
            parent=self.metrictemplate3.parent,
            probeexecutable=self.metrictemplate3.probeexecutable,
            config=self.metrictemplate3.config,
            attribute=self.metrictemplate3.attribute,
            dependency=self.metrictemplate3.dependency,
            flags=self.metrictemplate3.flags,
            files=self.metrictemplate3.files,
            parameter=self.metrictemplate3.parameter,
            fileparameter=self.metrictemplate3.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user='testuser'
        )

        self.metrictemplate4 = admin_models.MetricTemplate.objects.create(
            name='eu.egi.cloud.OpenStack-Swift',
            mtype=self.mt_active,
            probekey=probeversion4,
            probeexecutable='swiftprobe.py',
            config='["maxCheckAttempts 2", "timeout 300", '
                   '"path /usr/libexec/argo-monitoring/probes/fedcloud", '
                   '"interval 60", "retryInterval 15"]',
            attribute='["OS_KEYSTONE_URL --endpoint", '
                      '"OIDC_ACCESS_TOKEN --access-token"]',
            dependency='["hr.srce.GridProxy-Valid 0", '
                       '"org.nagios.Keystone-TCP 1"]',
            flags='["NOHOSTNAME 1", "OBSESS 1"]'
        )
        self.metrictemplate4.tags.add(self.mtag3)

        mt4_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate4,
            name=self.metrictemplate4.name,
            mtype=self.metrictemplate4.mtype,
            probekey=self.metrictemplate4.probekey,
            description=self.metrictemplate4.description,
            parent=self.metrictemplate4.parent,
            probeexecutable=self.metrictemplate4.probeexecutable,
            config=self.metrictemplate4.config,
            attribute=self.metrictemplate4.attribute,
            dependency=self.metrictemplate4.dependency,
            flags=self.metrictemplate4.flags,
            files=self.metrictemplate4.files,
            parameter=self.metrictemplate4.parameter,
            fileparameter=self.metrictemplate4.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user='testuser'
        )
        mt4_history1.tags.add(self.mtag3)

        self.metrictemplate5 = admin_models.MetricTemplate.objects.create(
            name='org.apel.APEL-Pub',
            flags='["OBSESS 1", "PASSIVE 1"]',
            mtype=self.mt_passive
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate5,
            name=self.metrictemplate5.name,
            mtype=self.metrictemplate5.mtype,
            description=self.metrictemplate5.description,
            probekey=self.metrictemplate5.probekey,
            probeexecutable=self.metrictemplate5.probeexecutable,
            config=self.metrictemplate5.config,
            attribute=self.metrictemplate5.attribute,
            dependency=self.metrictemplate5.dependency,
            flags=self.metrictemplate5.flags,
            files=self.metrictemplate5.files,
            parameter=self.metrictemplate5.parameter,
            fileparameter=self.metrictemplate5.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )

        self.metrictemplate6 = admin_models.MetricTemplate.objects.create(
            name='org.nagios.CertLifetime2',
            mtype=self.mt_active,
            probekey=probeversion2,
            probeexecutable='check_http',
            config='["maxCheckAttempts 4", "timeout 70", '
                   '"path $USER1$", "interval 240", "retryInterval 30"]',
            attribute='["NAGIOS_HOST_CERT -J", "NAGIOS_HOST_KEY -K"]',
            parameter='["-C 30", "--sni "]',
            flags='["OBSESS 1"]'
        )
        self.metrictemplate6.tags.add(self.mtag1, self.mtag2)

        mt6_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate6,
            name=self.metrictemplate6.name,
            mtype=self.metrictemplate6.mtype,
            description=self.metrictemplate6.description,
            probekey=self.metrictemplate6.probekey,
            probeexecutable=self.metrictemplate6.probeexecutable,
            config=self.metrictemplate6.config,
            attribute=self.metrictemplate6.attribute,
            dependency=self.metrictemplate6.dependency,
            flags=self.metrictemplate6.flags,
            files=self.metrictemplate6.files,
            parameter=self.metrictemplate6.parameter,
            fileparameter=self.metrictemplate6.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )
        mt6_history1.tags.add(self.mtag1, self.mtag2)

        self.metrictemplate7 = admin_models.MetricTemplate.objects.create(
            name='eu.egi.sec.ARC-CE-result',
            flags='["OBSESS 0", "PASSIVE 1", "VO 1"]',
            mtype=self.mt_passive,
            parent='eu.egi.sec.ARC-CE-submit'
        )

        admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate7,
            name=self.metrictemplate7.name,
            mtype=self.metrictemplate7.mtype,
            description=self.metrictemplate7.description,
            probekey=self.metrictemplate7.probekey,
            probeexecutable=self.metrictemplate7.probeexecutable,
            config=self.metrictemplate7.config,
            attribute=self.metrictemplate7.attribute,
            dependency=self.metrictemplate7.dependency,
            flags=self.metrictemplate7.flags,
            files=self.metrictemplate7.files,
            parameter=self.metrictemplate7.parameter,
            fileparameter=self.metrictemplate7.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )

        self.metrictemplate8 = admin_models.MetricTemplate.objects.create(
            name='argo.AMSPublisher-Check',
            mtype=self.mt_active,
            probekey=self.probeversion5_1,
            description='Some description of publisher metric.',
            probeexecutable='ams-publisher-probe',
            config='["maxCheckAttempts 1", "timeout 120",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 180", "retryInterval 1"]',
            parameter='["-s /var/run/argo-nagios-ams-publisher/sock"]',
            flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
        )
        self.metrictemplate8.tags.add(self.mtag1)

        self.mt8_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate8,
            name=self.metrictemplate8.name,
            mtype=self.metrictemplate8.mtype,
            probekey=self.metrictemplate8.probekey,
            description=self.metrictemplate8.description,
            probeexecutable=self.metrictemplate8.probeexecutable,
            config=self.metrictemplate8.config,
            attribute=self.metrictemplate8.attribute,
            dependency=self.metrictemplate8.dependency,
            flags=self.metrictemplate8.flags,
            files=self.metrictemplate8.files,
            parameter=self.metrictemplate8.parameter,
            fileparameter=self.metrictemplate8.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )
        self.mt8_history1.tags.add(self.mtag1)

        self.metrictemplate8.probekey = self.probeversion5_2
        self.metrictemplate8.save()

        self.mt8_history2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate8,
            name=self.metrictemplate8.name,
            mtype=self.metrictemplate8.mtype,
            probekey=self.metrictemplate8.probekey,
            description=self.metrictemplate8.description,
            probeexecutable=self.metrictemplate8.probeexecutable,
            config=self.metrictemplate8.config,
            attribute=self.metrictemplate8.attribute,
            dependency=self.metrictemplate8.dependency,
            flags=self.metrictemplate8.flags,
            files=self.metrictemplate8.files,
            parameter=self.metrictemplate8.parameter,
            fileparameter=self.metrictemplate8.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newer version.'
        )
        self.mt8_history2.tags.add(self.mtag1)

        self.metrictemplate8.probekey = self.probeversion5_3
        self.metrictemplate8.parameter = ''
        self.metrictemplate8.save()
        self.metrictemplate8.tags.remove(self.mtag1)
        self.metrictemplate8.tags.add(self.mtag2)

        self.mt8_history3 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate8,
            name=self.metrictemplate8.name,
            mtype=self.metrictemplate8.mtype,
            probekey=self.metrictemplate8.probekey,
            description=self.metrictemplate8.description,
            probeexecutable=self.metrictemplate8.probeexecutable,
            config=self.metrictemplate8.config,
            attribute=self.metrictemplate8.attribute,
            dependency=self.metrictemplate8.dependency,
            flags=self.metrictemplate8.flags,
            files=self.metrictemplate8.files,
            parameter=self.metrictemplate8.parameter,
            fileparameter=self.metrictemplate8.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newest version.',
        )
        self.mt8_history3.tags.add(self.mtag2)

        self.metrictemplate9 = admin_models.MetricTemplate.objects.create(
            name='argo.AMS-Check-Old',
            mtype=self.mt_active,
            probekey=self.probeversion1_1,
            description='Some description of argo.AMS-Check metric template.',
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 3"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )

        self.mt9_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate9,
            name=self.metrictemplate9.name,
            mtype=self.metrictemplate9.mtype,
            probekey=self.metrictemplate9.probekey,
            description=self.metrictemplate9.description,
            probeexecutable=self.metrictemplate9.probeexecutable,
            config=self.metrictemplate9.config,
            attribute=self.metrictemplate9.attribute,
            dependency=self.metrictemplate9.dependency,
            flags=self.metrictemplate9.flags,
            files=self.metrictemplate9.files,
            parameter=self.metrictemplate9.parameter,
            fileparameter=self.metrictemplate9.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.',
        )

        metrictemplate10 = admin_models.MetricTemplate.objects.create(
            name='test.Metric-Template',
            mtype=self.mt_active,
            probekey=probeversion6_1,
            description='Metric template for testing probe.',
            probeexecutable='["test-probe"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /path", "interval 5", "retryInterval 3"]'
        )
        metrictemplate10.tags.add(self.mtag1)

        mt10_history1 = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate10,
            name=metrictemplate10.name,
            mtype=metrictemplate10.mtype,
            probekey=metrictemplate10.probekey,
            description=metrictemplate10.description,
            probeexecutable=metrictemplate10.probeexecutable,
            config=metrictemplate10.config,
            attribute=metrictemplate10.attribute,
            dependency=metrictemplate10.dependency,
            flags=metrictemplate10.flags,
            files=metrictemplate10.files,
            parameter=metrictemplate10.parameter,
            fileparameter=metrictemplate10.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )
        mt10_history1.tags.add(self.mtag1)

        metrictemplate10.probekey = probeversion6_2
        metrictemplate10.save()

        self.mt10_history2 = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate10,
            name=metrictemplate10.name,
            mtype=metrictemplate10.mtype,
            probekey=metrictemplate10.probekey,
            description=metrictemplate10.description,
            probeexecutable=metrictemplate10.probeexecutable,
            config=metrictemplate10.config,
            attribute=metrictemplate10.attribute,
            dependency=metrictemplate10.dependency,
            flags=metrictemplate10.flags,
            files=metrictemplate10.files,
            parameter=metrictemplate10.parameter,
            fileparameter=metrictemplate10.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Newer version.'
        )
        mt10_history1.tags.add(self.mtag1)

        metrictemplate11 = admin_models.MetricTemplate.objects.create(
            name='test.MetricTemplate',
            mtype=self.mt_active,
            probekey=probeversion7_2,
            description='Metric template for something.',
            probeexecutable='["test-probe-2"]',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path /path", "interval 5", "retryInterval 3"]',
            attribute='["attribute1 lower", "attribute2 bigger"]',
            dependency='["depend none"]',
            parameter='["-y yes", "-n no"]',
            flags='["OBSESS 1"]',
            parent='["test.Metric-Template"]'
        )
        metrictemplate11.tags.add(self.mtag1, self.mtag2)

        admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate11,
            name=metrictemplate11.name,
            mtype=metrictemplate11.mtype,
            probekey=metrictemplate11.probekey,
            description=metrictemplate11.description,
            probeexecutable=metrictemplate11.probeexecutable,
            config=metrictemplate11.config,
            attribute=metrictemplate11.attribute,
            dependency=metrictemplate11.dependency,
            flags=metrictemplate11.flags,
            files=metrictemplate11.files,
            parameter=metrictemplate11.parameter,
            fileparameter=metrictemplate11.fileparameter,
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment='Initial version.'
        )
        mt10_history1.tags.add(self.mtag1, self.mtag2)

        self.group = poem_models.GroupOfMetrics.objects.create(
            name=self.tenant.name.upper()
        )
        self.ct = ContentType.objects.get_for_model(poem_models.Metric)

        self.metric1 = poem_models.Metric.objects.create(
            name='argo.AMS-Check',
            group=self.group,
            mtype=self.m_active,
            probekey=self.probeversion1_2,
            description='Some description of argo.AMS-Check metric template.',
            probeexecutable='["ams-probe"]',
            config='["maxCheckAttempts 4", "timeout 60",'
                   ' "path /usr/libexec/argo-monitoring/probes/argo",'
                   ' "interval 5", "retryInterval 2"]',
            attribute='["argo.ams_TOKEN --token"]',
            flags='["OBSESS 1"]',
            parameter='["--project EGI"]'
        )
        self.metric1.tags.add(self.mtag1, self.mtag2, self.mtag3)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            serialized_data=serializers.serialize(
                'json', [self.metric1],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            object_repr=self.metric1.__str__(),
            content_type=self.ct,
            comment='Initial version.',
            user='testuser'
        )

        self.metric2 = poem_models.Metric.objects.create(
            name=self.metrictemplate2.name,
            group=self.group,
            mtype=self.m_active,
            description=self.metrictemplate2.description,
            probekey=self.metrictemplate2.probekey,
            probeexecutable=self.metrictemplate2.probeexecutable,
            config=self.metrictemplate2.config,
            attribute=self.metrictemplate2.attribute,
            dependancy=self.metrictemplate2.dependency,
            flags=self.metrictemplate2.flags,
            files=self.metrictemplate2.files,
            parameter=self.metrictemplate2.parameter,
            fileparameter=self.metrictemplate2.fileparameter,
        )
        self.metric2.tags.add(self.mtag2)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric2.id,
            object_repr=self.metric2.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric2],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.metric3 = poem_models.Metric.objects.create(
            name=self.metrictemplate4.name,
            group=self.group,
            mtype=self.m_active,
            description=self.metrictemplate4.description,
            probekey=self.metrictemplate4.probekey,
            probeexecutable=self.metrictemplate4.probeexecutable,
            config='["maxCheckAttempts 3", "timeout 300", '
                   '"path /usr/libexec/argo-monitoring/probes/fedcloud", '
                   '"interval 80", "retryInterval 15"]',
            attribute=self.metrictemplate4.attribute,
            dependancy=self.metrictemplate4.dependency,
            flags=self.metrictemplate4.flags,
            files=self.metrictemplate4.files,
            parameter=self.metrictemplate4.parameter,
            fileparameter=self.metrictemplate4.fileparameter
        )
        self.metric3.tags.add(self.mtag3)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric3.id,
            object_repr=self.metric3.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric3],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.metric4 = poem_models.Metric.objects.create(
            name=self.metrictemplate5.name,
            group=self.group,
            mtype=self.m_passive,
            description=self.metrictemplate5.description,
            probekey=self.metrictemplate5.probekey,
            probeexecutable=self.metrictemplate5.probeexecutable,
            config=self.metrictemplate5.config,
            attribute=self.metrictemplate5.attribute,
            dependancy=self.metrictemplate5.dependency,
            flags=self.metrictemplate5.flags,
            files=self.metrictemplate5.files,
            parameter=self.metrictemplate5.parameter,
            fileparameter=self.metrictemplate5.fileparameter,
        )

        poem_models.TenantHistory.objects.create(
            object_id=self.metric4.id,
            object_repr=self.metric4.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric4],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

        self.metric5 = poem_models.Metric.objects.create(
            name=metrictemplate10.name,
            group=self.group,
            mtype=self.m_active,
            description=metrictemplate10.description,
            probekey=metrictemplate10.probekey,
            probeexecutable=metrictemplate10.probeexecutable,
            config=metrictemplate10.config,
            attribute=metrictemplate10.attribute,
            dependancy=metrictemplate10.dependency,
            flags=metrictemplate10.flags,
            files=metrictemplate10.files,
            parameter=metrictemplate10.parameter,
            fileparameter=metrictemplate10.fileparameter,
        )
        self.metric5.tags.add(self.mtag1, self.mtag2)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric5.id,
            object_repr=self.metric5.__str__(),
            serialized_data=serializers.serialize(
                'json', [self.metric5],
                use_natural_foreign_keys=True,
                use_natural_primary_keys=True
            ),
            content_type=self.ct,
            date_created=datetime.datetime.now(),
            comment='Initial version.',
            user=self.user.username
        )

    def test_import_active_metrics_successfully(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['eu.egi.cloud.OpenStack-VM', 'org.nagios.CertLifetime2'],
            self.tenant, self.user
        )
        self.assertEqual(
            success, ['eu.egi.cloud.OpenStack-VM', 'org.nagios.CertLifetime2']
        )
        self.assertEqual(warning, [])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 7)
        metric1 = poem_models.Metric.objects.get(
            name='eu.egi.cloud.OpenStack-VM'
        )
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        metric2 = poem_models.Metric.objects.get(
            name='org.nagios.CertLifetime2'
        )
        history2 = poem_models.TenantHistory.objects.filter(
            object_id=metric2.id
        ).order_by('-date_created')
        serialized_data2 = json.loads(history2[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metrictemplate3.name)
        self.assertEqual(metric1.mtype, self.m_active)
        self.assertEqual(len(metric1.tags.all()), 0)
        self.assertEqual(metric1.group, self.group)
        self.assertEqual(metric1.description, self.metrictemplate3.description)
        self.assertEqual(metric1.probekey, self.metrictemplate3.probekey)
        self.assertEqual(
            metric1.probeexecutable, self.metrictemplate3.probeexecutable
        )
        self.assertEqual(metric1.config, self.metrictemplate3.config)
        self.assertEqual(metric1.attribute, self.metrictemplate3.attribute)
        self.assertEqual(metric1.dependancy, self.metrictemplate3.dependency)
        self.assertEqual(metric1.flags, self.metrictemplate3.flags)
        self.assertEqual(metric1.files, self.metrictemplate3.files)
        self.assertEqual(metric1.parameter, self.metrictemplate3.parameter)
        self.assertEqual(
            metric1.fileparameter, self.metrictemplate3.fileparameter
        )
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(serialized_data1['mtype'][0], metric1.mtype.name)
        self.assertEqual(serialized_data1['tags'], [])
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(serialized_data1['description'], metric1.description)
        self.assertEqual(
            serialized_data1['probekey'],
            [metric1.probekey.name, metric1.probekey.package.version]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'], metric1.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(serialized_data1['attribute'], metric1.attribute)
        self.assertEqual(serialized_data1['dependancy'], metric1.dependancy)
        self.assertEqual(serialized_data1['flags'], metric1.flags)
        self.assertEqual(serialized_data1['files'], metric1.files)
        self.assertEqual(serialized_data1['parameter'], metric1.parameter)
        self.assertEqual(
            serialized_data1['fileparameter'], metric1.fileparameter
        )
        self.assertEqual(history2.count(), 1)
        self.assertEqual(metric2.name, self.metrictemplate6.name)
        self.assertEqual(metric2.mtype, self.m_active)
        self.assertEqual(len(metric2.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric2.tags.all())
        self.assertTrue(self.mtag2 in metric2.tags.all())
        self.assertEqual(metric2.group, self.group)
        self.assertEqual(metric2.description, self.metrictemplate6.description)
        self.assertEqual(metric2.probekey, self.metrictemplate6.probekey)
        self.assertEqual(
            metric2.probeexecutable, self.metrictemplate6.probeexecutable
        )
        self.assertEqual(metric2.config, self.metrictemplate6.config)
        self.assertEqual(metric2.attribute, self.metrictemplate6.attribute)
        self.assertEqual(metric2.dependancy, self.metrictemplate6.dependency)
        self.assertEqual(metric2.flags, self.metrictemplate6.flags)
        self.assertEqual(metric2.files, self.metrictemplate6.files)
        self.assertEqual(metric2.parameter, self.metrictemplate6.parameter)
        self.assertEqual(
            metric2.fileparameter, self.metrictemplate6.fileparameter
        )
        self.assertEqual(serialized_data2['name'], metric2.name)
        self.assertEqual(serialized_data2['mtype'][0], metric2.mtype.name)
        self.assertEqual(
            serialized_data2['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data2['group'][0], metric2.group.name)
        self.assertEqual(serialized_data2['description'], metric2.description)
        self.assertEqual(
            serialized_data2['probekey'],
            [metric2.probekey.name, metric2.probekey.package.version]
        )
        self.assertEqual(
            serialized_data2['probeexecutable'], metric2.probeexecutable
        )
        self.assertEqual(serialized_data2['config'], metric2.config)
        self.assertEqual(serialized_data2['attribute'], metric2.attribute)
        self.assertEqual(serialized_data2['dependancy'], metric2.dependancy)
        self.assertEqual(serialized_data2['flags'], metric2.flags)
        self.assertEqual(serialized_data2['files'], metric2.files)
        self.assertEqual(serialized_data2['parameter'], metric2.parameter)
        self.assertEqual(
            serialized_data2['fileparameter'], metric2.fileparameter
        )

    def test_import_passive_metric_successfully(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['eu.egi.sec.ARC-CE-result'], self.tenant, self.user
        )
        self.assertEqual(success, ['eu.egi.sec.ARC-CE-result'])
        self.assertEqual(warning, [])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        metric1 = poem_models.Metric.objects.get(
            name='eu.egi.sec.ARC-CE-result'
        )
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metrictemplate7.name)
        self.assertEqual(metric1.mtype, self.m_passive)
        self.assertEqual(len(metric1.tags.all()), 0)
        self.assertEqual(metric1.group, self.group)
        self.assertEqual(metric1.description, self.metrictemplate7.description)
        self.assertEqual(metric1.probekey, self.metrictemplate7.probekey)
        self.assertEqual(
            metric1.probeexecutable, self.metrictemplate7.probeexecutable
        )
        self.assertEqual(metric1.config, self.metrictemplate7.config)
        self.assertEqual(metric1.attribute, self.metrictemplate7.attribute)
        self.assertEqual(metric1.dependancy, self.metrictemplate7.dependency)
        self.assertEqual(metric1.flags, self.metrictemplate7.flags)
        self.assertEqual(metric1.files, self.metrictemplate7.files)
        self.assertEqual(metric1.parameter, self.metrictemplate7.parameter)
        self.assertEqual(
            metric1.fileparameter, self.metrictemplate7.fileparameter
        )
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(serialized_data1['mtype'][0], metric1.mtype.name)
        self.assertEqual(serialized_data1['tags'], [])
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(serialized_data1['description'], metric1.description)
        self.assertEqual(serialized_data1['probekey'], None)
        self.assertEqual(
            serialized_data1['probeexecutable'], metric1.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(serialized_data1['attribute'], metric1.attribute)
        self.assertEqual(serialized_data1['dependancy'], metric1.dependancy)
        self.assertEqual(serialized_data1['flags'], metric1.flags)
        self.assertEqual(serialized_data1['files'], metric1.files)
        self.assertEqual(serialized_data1['parameter'], metric1.parameter)
        self.assertEqual(
            serialized_data1['fileparameter'], metric1.fileparameter
        )

    def test_import_active_metric_with_warning(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['argo.AMSPublisher-Check'], self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, ['argo.AMSPublisher-Check'])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        metric1 = poem_models.Metric.objects.get(
            name='argo.AMSPublisher-Check'
        )
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.mt8_history2.name)
        self.assertEqual(metric1.mtype, self.m_active)
        self.assertEqual(len(metric1.tags.all()), 1)
        self.assertTrue(self.mtag1 in metric1.tags.all())
        self.assertEqual(metric1.group, self.group)
        self.assertEqual(metric1.description, self.mt8_history2.description)
        self.assertEqual(metric1.probekey, self.mt8_history2.probekey)
        self.assertEqual(
            metric1.probeexecutable, self.mt8_history2.probeexecutable
        )
        self.assertEqual(metric1.config, self.mt8_history2.config)
        self.assertEqual(metric1.attribute, self.mt8_history2.attribute)
        self.assertEqual(metric1.dependancy, self.mt8_history2.dependency)
        self.assertEqual(metric1.flags, self.mt8_history2.flags)
        self.assertEqual(metric1.files, self.mt8_history2.files)
        self.assertEqual(metric1.parameter, self.mt8_history2.parameter)
        self.assertEqual(
            metric1.fileparameter, self.mt8_history2.fileparameter
        )
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(serialized_data1['mtype'][0], metric1.mtype.name)
        self.assertEqual(serialized_data1['tags'], [['test_tag1']])
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(serialized_data1['description'], metric1.description)
        self.assertEqual(
            serialized_data1['probekey'],
            [metric1.probekey.name, metric1.probekey.package.version]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'], metric1.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(serialized_data1['attribute'], metric1.attribute)
        self.assertEqual(serialized_data1['dependancy'], metric1.dependancy)
        self.assertEqual(serialized_data1['flags'], metric1.flags)
        self.assertEqual(serialized_data1['files'], metric1.files)
        self.assertEqual(serialized_data1['parameter'], metric1.parameter)
        self.assertEqual(
            serialized_data1['fileparameter'], metric1.fileparameter
        )

    def test_import_active_metric_if_package_already_exists_with_diff_version(
            self
    ):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['test.Metric-Template', 'test.MetricTemplate'],
            self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, [])
        self.assertEqual(error, ['test.Metric-Template'])
        self.assertEqual(unavailable, ['test.MetricTemplate'])
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        metric1 = poem_models.Metric.objects.get(name='test.Metric-Template')
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metric5.name)
        self.assertEqual(metric1.mtype, self.metric5.mtype)
        self.assertEqual(metric1.tags, self.metric5.tags)
        self.assertEqual(metric1.group, self.metric5.group)
        self.assertEqual(metric1.description, self.metric5.description)
        self.assertEqual(metric1.probekey, self.metric5.probekey)
        self.assertEqual(
            metric1.probeexecutable, self.metric5.probeexecutable
        )
        self.assertEqual(metric1.config, self.metric5.config)
        self.assertEqual(metric1.attribute, self.metric5.attribute)
        self.assertEqual(metric1.dependancy, self.metric5.dependancy)
        self.assertEqual(metric1.flags, self.metric5.flags)
        self.assertEqual(metric1.files, self.metric5.files)
        self.assertEqual(metric1.parameter, self.metric5.parameter)
        self.assertEqual(
            metric1.fileparameter, self.metric5.fileparameter
        )
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(serialized_data1['mtype'][0], metric1.mtype.name)
        self.assertEqual(
            serialized_data1['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(serialized_data1['description'], metric1.description)
        self.assertEqual(
            serialized_data1['probekey'],
            [metric1.probekey.name, metric1.probekey.package.version]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'], metric1.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(serialized_data1['attribute'], metric1.attribute)
        self.assertEqual(serialized_data1['dependancy'], metric1.dependancy)
        self.assertEqual(serialized_data1['flags'], metric1.flags)
        self.assertEqual(serialized_data1['files'], metric1.files)
        self.assertEqual(serialized_data1['parameter'], metric1.parameter)
        self.assertEqual(
            serialized_data1['fileparameter'], metric1.fileparameter
        )
        poem_models.Metric.objects.get(name='argo.AMS-Check')
        poem_models.Metric.objects.get(name='org.nagios.CertLifetime')
        poem_models.Metric.objects.get(name='eu.egi.cloud.OpenStack-Swift')
        poem_models.Metric.objects.get(name='org.apel.APEL-Pub')
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.MetricTemplate'
        )

    def test_import_active_metrics_with_error(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['argo.AMS-Check', 'org.nagios.CertLifetime'],
            self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, [])
        self.assertEqual(error, ['argo.AMS-Check', 'org.nagios.CertLifetime'])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metric1.name)
        self.assertEqual(metric1.mtype, self.metric1.mtype)
        self.assertEqual(metric1.tags, self.metric1.tags)
        self.assertEqual(metric1.group, self.metric1.group)
        self.assertEqual(metric1.description, self.metric1.description)
        self.assertEqual(metric1.probekey, self.metric1.probekey)
        self.assertEqual(
            metric1.probeexecutable, self.metric1.probeexecutable
        )
        self.assertEqual(metric1.config, self.metric1.config)
        self.assertEqual(metric1.attribute, self.metric1.attribute)
        self.assertEqual(metric1.dependancy, self.metric1.dependancy)
        self.assertEqual(metric1.flags, self.metric1.flags)
        self.assertEqual(metric1.files, self.metric1.files)
        self.assertEqual(metric1.parameter, self.metric1.parameter)
        self.assertEqual(
            metric1.fileparameter, self.metric1.fileparameter
        )
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(serialized_data1['mtype'][0], metric1.mtype.name)
        self.assertEqual(
            serialized_data1['tags'],
            [['test_tag1'], ['test_tag2'], ['test_tag3']]
        )
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(serialized_data1['description'], metric1.description)
        self.assertEqual(
            serialized_data1['probekey'],
            [metric1.probekey.name, metric1.probekey.package.version]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'], metric1.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(serialized_data1['attribute'], metric1.attribute)
        self.assertEqual(serialized_data1['dependancy'], metric1.dependancy)
        self.assertEqual(serialized_data1['flags'], metric1.flags)
        self.assertEqual(serialized_data1['files'], metric1.files)
        self.assertEqual(serialized_data1['parameter'], metric1.parameter)
        self.assertEqual(
            serialized_data1['fileparameter'], metric1.fileparameter
        )
        metric2 = poem_models.Metric.objects.get(
            name='org.nagios.CertLifetime'
        )
        history2 = poem_models.TenantHistory.objects.filter(
            object_id=metric2.id
        ).order_by('-date_created')
        serialized_data2 = json.loads(history2[0].serialized_data)[0]['fields']
        self.assertEqual(history2.count(), 1)
        self.assertEqual(metric2.name, self.metric2.name)
        self.assertEqual(metric2.mtype, self.metric2.mtype)
        self.assertEqual(metric2.tags, self.metric2.tags)
        self.assertEqual(metric2.group, self.metric2.group)
        self.assertEqual(metric2.description, self.metric2.description)
        self.assertEqual(metric2.probekey, self.metric2.probekey)
        self.assertEqual(
            metric2.probeexecutable, self.metric2.probeexecutable
        )
        self.assertEqual(metric2.config, self.metric2.config)
        self.assertEqual(metric2.attribute, self.metric2.attribute)
        self.assertEqual(metric2.dependancy, self.metric2.dependancy)
        self.assertEqual(metric2.flags, self.metric2.flags)
        self.assertEqual(metric2.files, self.metric2.files)
        self.assertEqual(metric2.parameter, self.metric2.parameter)
        self.assertEqual(
            metric2.fileparameter, self.metric2.fileparameter
        )
        self.assertEqual(serialized_data2['name'], metric2.name)
        self.assertEqual(serialized_data2['mtype'][0], metric2.mtype.name)
        self.assertEqual(serialized_data2['tags'], [['test_tag2']])
        self.assertEqual(serialized_data2['group'][0], metric2.group.name)
        self.assertEqual(serialized_data2['description'], metric2.description)
        self.assertEqual(
            serialized_data2['probekey'],
            [metric2.probekey.name, metric2.probekey.package.version]
        )
        self.assertEqual(
            serialized_data2['probeexecutable'], metric2.probeexecutable
        )
        self.assertEqual(serialized_data2['config'], metric2.config)
        self.assertEqual(serialized_data2['attribute'], metric2.attribute)
        self.assertEqual(serialized_data2['dependancy'], metric2.dependancy)
        self.assertEqual(serialized_data2['flags'], metric2.flags)
        self.assertEqual(serialized_data2['files'], metric2.files)
        self.assertEqual(serialized_data2['parameter'], metric2.parameter)
        self.assertEqual(
            serialized_data2['fileparameter'], metric2.fileparameter
        )

    def test_import_metric_older_version_than_tenants_package(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        success, warning, error, unavailable = import_metrics(
            ['argo.AMS-Check-Old'], self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, [])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, ['argo.AMS-Check-Old'])
        self.assertEqual(poem_models.Metric.objects.all().count(), 5)
        poem_models.Metric.objects.get(name='argo.AMS-Check')
        poem_models.Metric.objects.get(name='org.nagios.CertLifetime')
        poem_models.Metric.objects.get(name='eu.egi.cloud.OpenStack-Swift')
        poem_models.Metric.objects.get(name='org.apel.APEL-Pub')
        poem_models.Metric.objects.get(name='test.Metric-Template')
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='argo.AMS-Check-Old'
        )

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_active_metrics(self, mock_update):
        mock_update.return_value = []
        metrictemplate = admin_models.MetricTemplate.objects.get(
            id=self.metrictemplate1.id
        )
        metrictemplate.name = 'argo.AMS-Check-new'
        metrictemplate.mtype = self.mt_active
        metrictemplate.description = 'New description for the metric.'
        metrictemplate.probekey = self.probeversion1_2
        metrictemplate.parent = 'argo.AMS-Check'
        metrictemplate.probeexecutable = 'ams-probe'
        metrictemplate.config = \
            '["maxCheckAttempts 4", "timeout 70", ' \
            '"path /usr/libexec/argo-monitoring/probes/argo", ' \
            '"interval 6", "retryInterval 4"]'
        metrictemplate.attribute = '[argo.ams_TOKEN2 --token]'
        metrictemplate.dependency = '["dep-key dep-val"]'
        metrictemplate.parameter = '["par-key par-val"]'
        metrictemplate.flags = '["flag-key flag-val"]'
        metrictemplate.files = '["file-key file-val"]'
        metrictemplate.fileparameter = '["fp-key fp-val"]'
        metrictemplate.save()
        metrictemplate.tags.remove(self.mtag2)
        update_metrics(
            metrictemplate, 'argo.AMS-Check', self.probeversion1_2
        )
        mock_update.assert_called_once()
        mock_update.assert_has_calls([
            call('argo.AMS-Check', 'argo.AMS-Check-new')
        ])
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 1)
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(metric.mtype.name, metrictemplate.mtype.name)
        self.assertEqual(len(metric.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag3 in metric.tags.all())
        self.assertEqual(metric.probekey, metrictemplate.probekey)
        self.assertEqual(metric.description, metrictemplate.description)
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, metrictemplate.parent)
        self.assertEqual(metric.probeexecutable, metrictemplate.probeexecutable)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 2"]'
        )
        self.assertEqual(metric.attribute, metrictemplate.attribute)
        self.assertEqual(metric.dependancy, metrictemplate.dependency)
        self.assertEqual(metric.flags, metrictemplate.flags)
        self.assertEqual(metric.files, metrictemplate.files)
        self.assertEqual(metric.parameter, metrictemplate.parameter)
        self.assertEqual(metric.fileparameter, metrictemplate.fileparameter)
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag3']]
        )
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(
            serialized_data['probekey'],
            [metric.probekey.name, metric.probekey.package.version]
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

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_passive_metrics(self, mock_update):
        mock_update.return_value = []
        metrictemplate = admin_models.MetricTemplate.objects.get(
            id=self.metrictemplate5.id
        )
        metrictemplate.name = 'org.apel.APEL-Pub-new'
        metrictemplate.mtype = self.mt_passive
        metrictemplate.description = 'Added description for ' \
                                     'org.apel.APEL-Pub-new.'
        metrictemplate.probekey = None
        metrictemplate.parent = ''
        metrictemplate.probeexecutable = ''
        metrictemplate.config = ''
        metrictemplate.attribute = ''
        metrictemplate.dependency = ''
        metrictemplate.parameter = ''
        metrictemplate.flags = '["PASSIVE 1"]'
        metrictemplate.files = ''
        metrictemplate.fileparameter = ''
        metrictemplate.save()
        metrictemplate.tags.add(self.mtag1)
        update_metrics(metrictemplate, 'org.apel.APEL-Pub', None)
        mock_update.assert_called_once()
        mock_update.assert_has_calls([
            call('org.apel.APEL-Pub', 'org.apel.APEL-Pub-new')
        ])
        metric = poem_models.Metric.objects.get(id=self.metric4.id)
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 1)
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(metric.mtype.name, metrictemplate.mtype.name)
        self.assertEqual(len(metric.tags.all()), 1)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertEqual(metric.probekey, metrictemplate.probekey)
        self.assertEqual(metric.description, metrictemplate.description)
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, metrictemplate.parent)
        self.assertEqual(metric.probeexecutable,
                         metrictemplate.probeexecutable)
        self.assertEqual(metric.config, '')
        self.assertEqual(metric.attribute, metrictemplate.attribute)
        self.assertEqual(metric.dependancy, metrictemplate.dependency)
        self.assertEqual(metric.flags, metrictemplate.flags)
        self.assertEqual(metric.files, metrictemplate.files)
        self.assertEqual(metric.parameter, metrictemplate.parameter)
        self.assertEqual(metric.fileparameter, metrictemplate.fileparameter)
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(serialized_data['tags'], [['test_tag1']])
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(serialized_data['probekey'], None)
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
        self.assertEqual(serialized_data['fileparameter'],
                         metric.fileparameter)

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_metrics_from_metrictemplatehistory_instance(
            self, mock_update
    ):
        mock_update.return_value = []
        metrictemplate = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.metrictemplate1,
            name='argo.AMS-Check-new',
            mtype=self.mt_active,
            description='New description for the metric.',
            probekey=self.probeversion1_2,
            parent='argo.AMS-Check',
            probeexecutable='ams-probe',
            config='["maxCheckAttempts 4", "timeout 70", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 6", "retryInterval 4"]',
            attribute='[argo.ams_TOKEN2 --token]',
            dependency='["dep-key dep-val"]',
            parameter='["par-key par-val"]',
            flags='["flag-key flag-val"]',
            files='["file-key file-val"]',
            fileparameter='["fp-key fp-val"]',
            date_created=datetime.datetime.now(),
            version_user=self.user.username,
            version_comment=create_comment(self.metrictemplate1)
        )
        metrictemplate.tags.add(self.mtag1, self.mtag2)
        update_metrics(
            metrictemplate, 'argo.AMS-Check', self.probeversion1_2
        )
        mock_update.assert_called_once()
        mock_update.assert_has_calls([
            call('argo.AMS-Check', 'argo.AMS-Check-new')
        ])
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 1)
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(metric.mtype.name, metrictemplate.mtype.name)
        self.assertEqual(len(metric.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag2 in metric.tags.all())
        self.assertEqual(metric.probekey, metrictemplate.probekey)
        self.assertEqual(metric.description, metrictemplate.description)
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, metrictemplate.parent)
        self.assertEqual(metric.probeexecutable, metrictemplate.probeexecutable)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 2"]'
        )
        self.assertEqual(metric.attribute, metrictemplate.attribute)
        self.assertEqual(metric.dependancy, metrictemplate.dependency)
        self.assertEqual(metric.flags, metrictemplate.flags)
        self.assertEqual(metric.files, metrictemplate.files)
        self.assertEqual(metric.parameter, metrictemplate.parameter)
        self.assertEqual(metric.fileparameter, metrictemplate.fileparameter)
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(
            serialized_data['probekey'],
            [metric.probekey.name, metric.probekey.package.version]
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

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_metrics_if_different_metrictemplate_version(
            self, mock_update
    ):
        mock_update.side_effect = mocked_func
        metrictemplate = admin_models.MetricTemplate.objects.get(
            id=self.metrictemplate1.id
        )
        metrictemplate.name = 'argo.AMS-Check'
        metrictemplate.mtype = self.mt_active
        metrictemplate.description = 'New description for the metric.'
        metrictemplate.probekey = self.probeversion1_3
        metrictemplate.parent = 'argo.AMS-Check'
        metrictemplate.probeexecutable = 'ams-probe'
        metrictemplate.config = \
            '["maxCheckAttempts 4", "timeout 70", ' \
            '"path /usr/libexec/argo-monitoring/probes/argo", ' \
            '"interval 6", "retryInterval 4"]'
        metrictemplate.attribute = '["argo.ams_TOKEN2 --token"]'
        metrictemplate.dependency = '["dep-key dep-val"]'
        metrictemplate.parameter = '["par-key par-val"]'
        metrictemplate.flags = '["flag-key flag-val"]'
        metrictemplate.files = '["file-key file-val"]'
        metrictemplate.fileparameter = '["fp-key fp-val"]'
        metrictemplate.save()
        metrictemplate.tags.remove(self.mtag2)
        update_metrics(
            metrictemplate, 'argo.AMS-Check', self.probeversion1_2,
            user='testuser'
        )
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 2)
        self.assertEqual(metric_versions[0].user, 'testuser')
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(len(metric.tags.all()), 2)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag3 in metric.tags.all())
        self.assertEqual(metric.mtype.name, metrictemplate.mtype.name)
        self.assertEqual(metric.probekey, metrictemplate.probekey)
        self.assertEqual(metric.description, metrictemplate.description)
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.parent, metrictemplate.parent)
        self.assertEqual(metric.probeexecutable, metrictemplate.probeexecutable)
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 2"]'
        )
        self.assertEqual(metric.attribute, metrictemplate.attribute)
        self.assertEqual(metric.dependancy, metrictemplate.dependency)
        self.assertEqual(metric.flags, metrictemplate.flags)
        self.assertEqual(metric.files, metrictemplate.files)
        self.assertEqual(metric.parameter, metrictemplate.parameter)
        self.assertEqual(metric.fileparameter, metrictemplate.fileparameter)
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metric.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag3']]
        )
        self.assertEqual(serialized_data['description'], metric.description)
        self.assertEqual(
            serialized_data['probekey'],
            [metric.probekey.name, metric.probekey.package.version]
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
        self.assertFalse(mock_update.called)

    def test_update_metrics_if_metric_template_different_name(self):
        self.metrictemplate1.name = 'argo.AMS-Check-new'
        self.metrictemplate1.probekey = self.probeversion1_3
        self.metrictemplate1.save()
        update_metrics(
            self.metrictemplate1, 'argo.AMS-Check', self.probeversion1_2
        )
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        self.assertEqual(metric.name, 'argo.AMS-Check-new')
        self.assertEqual(len(metric.tags.all()), 3)
        self.assertTrue(self.mtag1 in metric.tags.all())
        self.assertTrue(self.mtag2 in metric.tags.all())
        self.assertTrue(self.mtag3 in metric.tags.all())
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(
            metric.description,
            'Some description of argo.AMS-Check metric template.'
        )
        self.assertEqual(metric.probekey, self.probeversion1_3)
        self.assertEqual(metric.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 2"]'
        )
        self.assertEqual(metric.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(metric.dependancy, '')
        self.assertEqual(metric.flags, '["OBSESS 1"]')
        self.assertEqual(metric.files, '')
        self.assertEqual(metric.parameter, '["--project EGI"]')
        self.assertEqual(metric.fileparameter, '')

    @patch('Poem.helpers.metrics_helpers.requests.put')
    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_update_metrics_in_profiles(self, mock_key, mock_get, mock_put):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_get.side_effect = mocked_web_api_metric_profiles
            msgs = update_metrics_in_profiles('metric1', 'new.metric1')
            mock_put.assert_called_once()
            mock_put.assert_called_with(
                'https://mock.api.url/11111111-2222-3333-4444-555555555555',
                headers={'Accept': 'application/json', 'x-api-key': 'mock_key'},
                data=json.dumps(
                    {
                        "id": "11111111-2222-3333-4444-555555555555",
                        "name": "PROFILE1",
                        "description": "First profile",
                        "services": [
                            {
                                "service": "service1",
                                "metrics": [
                                    "new.metric1",
                                    "metric2"
                                ]
                            },
                            {
                                "service": "service2",
                                "metrics": [
                                    "metric3",
                                    "metric4"
                                ]
                            }
                        ]
                    }
                )
            )
            self.assertEqual(msgs, [])

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_update_metrics_in_profiles_wrong_token(self, mock_key, mock_get):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='wrong_key')
            mock_get.side_effect = mocked_web_api_metric_profiles_wrong_token
            msgs = update_metrics_in_profiles('metric1', 'new.metric1')
            self.assertEqual(
                msgs,
                [
                    'TEST: Error trying to update metric in metric profiles: '
                    '401 Client Error: Unauthorized.'
                    '\nPlease update metric profiles manually.'
                ]
            )

    def test_update_metrics_in_profiles_nonexisting_key(self):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            msgs = update_metrics_in_profiles('metric1', 'new.metric1')
            self.assertEqual(
                msgs,
                [
                    'TEST: No "WEB-API" key in the DB!\n'
                    'Please update metric profiles manually.'
                ]
            )

    @patch('Poem.helpers.metrics_helpers.requests.put')
    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_update_metrics_in_profiles_if_response_empty(
            self, mock_key, mock_get, mock_put
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_get.side_effect = mocked_web_api_metric_profiles_empty
            msgs = update_metrics_in_profiles('metric1', 'new.metric1')
            self.assertEqual(msgs, [])
            self.assertFalse(mock_put.called)

    @patch('Poem.helpers.metrics_helpers.requests.put')
    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_update_metrics_in_profiles_if_same_name(
            self, mock_key, mock_get, mock_put
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_get.side_effect = mocked_web_api_metric_profiles
            msgs = update_metrics_in_profiles('metric1', 'metric1')
            self.assertEqual(msgs, [])
            self.assertFalse(mock_put.called)

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_get_metrics_in_profiles(self, mock_key, mock_get):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_get.side_effect = mocked_web_api_metric_profiles
            metrics = get_metrics_in_profiles('test')
            mock_get.assert_called_once()
            mock_get.assert_called_with(
                'https://mock.api.url',
                headers={'Accept': 'application/json', 'x-api-key': 'mock_key'},
                timeout=180
            )
            self.assertEqual(
                metrics,
                {
                    'metric1': ['PROFILE1'],
                    'metric2': ['PROFILE1', 'PROFILE2'],
                    'metric3': ['PROFILE1', 'PROFILE2'],
                    'metric4': ['PROFILE1'],
                    'metric5': ['PROFILE2'],
                    'metric7': ['PROFILE2']
                }
            )

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_get_metrics_in_profiles_wrong_token(self, mock_key, mock_get):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='wrong_key')
            mock_get.side_effect = mocked_web_api_metric_profiles_wrong_token
            self.assertRaises(
                requests.exceptions.HTTPError,
                get_metrics_in_profiles,
                'test'
            )

    def test_get_metrics_in_profiles_nonexisting_key(self):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            with self.assertRaises(Exception) as context:
                get_metrics_in_profiles('test')
            self.assertEqual(
                str(context.exception),
                'Error fetching WEB API data: API key not found.'
            )

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_get_metrics_in_profiles_if_response_empty(
            self, mock_key, mock_get
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_get.side_effect = mocked_web_api_metric_profiles_empty
            metrics = get_metrics_in_profiles('test')
            mock_get.assert_called_once_with(
                'https://mock.api.url',
                headers={'Accept': 'application/json', 'x-api-key': 'mock_key'},
                timeout=180
            )
            self.assertEqual(metrics, {})

    @patch('Poem.helpers.metrics_helpers.requests.put')
    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.poem_models.MetricProfiles.objects.'
           'get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_delete_metrics_from_profiles(
            self, mock_key, mock_profile, mock_get, mock_put
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url/'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='mock_key')
            mock_profile.return_value = poem_models.MetricProfiles(
                name='PROFILE1', apiid='11111111-2222-3333-4444-555555555555',
                description='First profile', groupname='TEST'
            )
            mock_get.side_effect = mocked_web_api_metric_profile
            mock_put.side_effect = mocked_web_api_metric_profile_put
            delete_metrics_from_profile(
                profile='PROFILE1', metrics=['metric3', 'metric4']
            )
            mock_get.assert_called_once_with(
                'https://mock.api.url/11111111-2222-3333-4444-555555555555',
                headers={'Accept': 'application/json', 'x-api-key': 'mock_key'},
                timeout=180
            )
            data = {
                "id": "11111111-2222-3333-4444-555555555555",
                "name": "PROFILE1",
                "description": "First profile",
                "services": [
                    {
                        "service": "service1",
                        "metrics": [
                            "metric1",
                            "metric2"
                        ]
                    }
                ]
            }
            mock_put.assert_called_once_with(
                'https://mock.api.url/11111111-2222-3333-4444-555555555555',
                headers={'Accept': 'application/json', 'x-api-key': 'mock_key'},
                data=json.dumps(data)
            )

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.poem_models.MetricProfiles.objects.'
           'get')
    @patch('Poem.helpers.metrics_helpers.MyAPIKey.objects.get')
    def test_delete_metrics_from_profiles_wrong_token(
            self, mock_key, mock_profile, mock_get
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url/'):
            mock_key.return_value = MyAPIKey(name='WEB-API', token='wrong_key')
            mock_profile.return_value = poem_models.MetricProfiles(
                name='PROFILE1', apiid='11111111-2222-3333-4444-555555555555',
                description='First profile', groupname='TEST'
            )
            mock_get.side_effect = mocked_web_api_metric_profiles_wrong_token
            self.assertRaises(
                requests.exceptions.HTTPError,
                delete_metrics_from_profile,
                profile='PROFILE1', metrics=['metric3', 'metric4']
            )
            mock_get.assert_called_once_with(
                'https://mock.api.url/11111111-2222-3333-4444-555555555555',
                headers={'Accept': 'application/json',
                         'x-api-key': 'wrong_key'},
                timeout=180
            )

    @patch(
        'Poem.helpers.metrics_helpers.poem_models.MetricProfiles.objects.get'
    )
    def test_delete_metrics_from_profiles_nonexisting_key(self, mock_profile):
        mock_profile.return_value = poem_models.MetricProfiles(
            name='PROFILE1', apiid='11111111-2222-3333-4444-555555555555',
            description='First profile', groupname='TEST'
        )
        with self.assertRaises(Exception) as context:
            delete_metrics_from_profile(
                profile='PROFILE1', metrics=['metric3', 'metric4']
            )
        self.assertEqual(
            str(context.exception),
            'Error deleting metric from profile: API key not found.'
        )

    def test_delete_metrics_from_profiles_missing_profile(self):
        with self.assertRaises(Exception) as context:
            delete_metrics_from_profile(
                profile='PROFILE1', metrics=['metric3', 'metric4']
            )
        self.assertEqual(
            str(context.exception),
            'Error deleting metric from profile: Profile not found.'
        )
