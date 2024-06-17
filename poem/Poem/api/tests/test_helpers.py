import datetime
import json
from unittest.mock import patch, call

import factory
import requests
from Poem.helpers.history_helpers import create_comment, update_comment, \
    serialize_metric
from Poem.helpers.metrics_helpers import import_metrics, update_metrics, \
    update_metrics_in_profiles, get_metrics_in_profiles, \
    delete_metrics_from_profile, update_metric_in_schema, sync_metrics
from Poem.helpers.tenant_helpers import CombinedTenant
from Poem.helpers.versioned_comments import new_comment
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.poem_super_admin.models import WebAPIKey
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django.core.management import call_command
from django.db import connection
from django.db.models.signals import pre_save
from django.test.testcases import TransactionTestCase
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import get_tenant_model, get_public_schema_name, \
    schema_context, get_tenant_domain_model

from .utils_test import mocked_func, mocked_web_api_metric_profile, \
    mocked_web_api_metric_profile_put, mocked_web_api_metric_profiles, \
    mocked_web_api_metric_profiles_empty, \
    mocked_web_api_metric_profiles_wrong_token, mocked_web_api_data_feed, \
    mocked_web_api_data_feed_wrong_token

ALLOWED_TEST_DOMAIN = '.test.com'


def mock_db(tenant, tenant2=False):
    for schema in [tenant.schema_name, get_public_schema_name()]:
        with schema_context(schema):
            if schema == get_public_schema_name():
                tenant1 = Tenant.objects.create(
                    name='public', schema_name=get_public_schema_name()
                )
                get_tenant_domain_model().objects.create(
                    domain='public', tenant=tenant1, is_primary=True
                )

                if tenant2:
                    tenant2 = Tenant(name='test2', schema_name='test2')
                    tenant2.save(verbosity=0)
                    get_tenant_domain_model().objects.create(
                        domain='test2', tenant=tenant2, is_primary=True
                    )

    user = CustUser.objects.create_user(username='testuser')

    active = admin_models.MetricTemplateType.objects.create(name='Active')
    passive = admin_models.MetricTemplateType.objects.create(name='Passive')

    mtag1 = admin_models.MetricTags.objects.create(name='test_tag1')
    mtag2 = admin_models.MetricTags.objects.create(name='test_tag2')
    mtag3 = admin_models.MetricTags.objects.create(name='test_tag3')
    mtag4 = admin_models.MetricTags.objects.create(name="internal")

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

    package9 = admin_models.Package.objects.create(
        name="argo-probe-argo-tools",
        version="0.1.1"
    )
    package9.repos.add(repo2)

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

    probeversion1_1 = admin_models.ProbeHistory.objects.create(
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

    probeversion1_2 = admin_models.ProbeHistory.objects.create(
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

    probeversion1_3 = admin_models.ProbeHistory.objects.create(
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
        version_user=user.username
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
        version_user=user.username
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
        version_user=user.username
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

    probeversion5_1 = admin_models.ProbeHistory.objects.create(
        object_id=probe5,
        name=probe5.name,
        package=probe5.package,
        description=probe5.description,
        comment=probe5.comment,
        repository=probe5.repository,
        docurl=probe5.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user=user.username
    )

    probe5.package = package2
    probe5.comment = 'Newer version.'
    probe5.save()

    probeversion5_2 = admin_models.ProbeHistory.objects.create(
        object_id=probe5,
        name=probe5.name,
        package=probe5.package,
        description=probe5.description,
        comment=probe5.comment,
        repository=probe5.repository,
        docurl=probe5.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Newer version.',
        version_user=user.username
    )

    probe5.package = package3
    probe5.comment = 'Newest version.'
    probe5.save()

    probeversion5_3 = admin_models.ProbeHistory.objects.create(
        object_id=probe5,
        name=probe5.name,
        package=probe5.package,
        description=probe5.description,
        comment=probe5.comment,
        repository=probe5.repository,
        docurl=probe5.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Newest version.',
        version_user=user.username
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
        version_user=user.username
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
        version_user=user.username
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
        version_user=user.username
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
        version_user=user.username
    )

    probe8 = admin_models.Probe.objects.create(
        name="check_log",
        package=package9,
        description="Probe is inspecting the execution of given application "
                    "by parsing its logfile",
        comment="Initial version.",
        repository="https://github.com/ARGOeu-Metrics/argo-probe-argo-tools",
        docurl="https://github.com/ARGOeu-Metrics/argo-probe-argo-tools/blob/"
               "master/README.md"
    )

    probeversion8_1 = admin_models.ProbeHistory.objects.create(
        object_id=probe8,
        name=probe8.name,
        package=probe8.package,
        description=probe8.description,
        comment=probe8.comment,
        repository=probe8.repository,
        docurl=probe8.docurl,
        date_created=datetime.datetime.now(),
        version_comment="Initial version.",
        version_user=user.username
    )

    metrictemplate1 = admin_models.MetricTemplate.objects.create(
        name='argo.AMS-Check',
        mtype=active,
        probekey=probeversion1_1,
        description='Some description of argo.AMS-Check metric template.',
        probeexecutable='["ams-probe"]',
        config='["maxCheckAttempts 3", "timeout 60",'
               ' "path /usr/libexec/argo-monitoring/probes/argo",'
               ' "interval 5", "retryInterval 3"]',
        attribute='["argo.ams_TOKEN --token"]',
        flags='["OBSESS 1"]',
        parameter='["--project EGI"]'
    )
    metrictemplate1.tags.add(mtag1, mtag2)

    mt1_history1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate1,
        name=metrictemplate1.name,
        mtype=metrictemplate1.mtype,
        probekey=metrictemplate1.probekey,
        description=metrictemplate1.description,
        probeexecutable=metrictemplate1.probeexecutable,
        config=metrictemplate1.config,
        attribute=metrictemplate1.attribute,
        dependency=metrictemplate1.dependency,
        flags=metrictemplate1.flags,
        files=metrictemplate1.files,
        parameter=metrictemplate1.parameter,
        fileparameter=metrictemplate1.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment='Initial version.',
    )
    mt1_history1.tags.add(mtag1, mtag2)

    metrictemplate1.probekey = probeversion1_2
    metrictemplate1.config = '["maxCheckAttempts 4", "timeout 70", ' \
                             '"path /usr/libexec/argo-monitoring/", ' \
                             '"interval 5", "retryInterval 3"]'
    metrictemplate1.save()
    metrictemplate1.tags.add(mtag3)

    mt1_history2 = admin_models.MetricTemplateHistory.objects.create(
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
        files=metrictemplate1.files,
        parameter=metrictemplate1.parameter,
        fileparameter=metrictemplate1.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment=create_comment(metrictemplate1)
    )
    mt1_history2.tags.add(mtag1, mtag2, mtag3)

    metrictemplate1.probekey = probeversion1_3
    metrictemplate1.save()

    mt1_history3 = admin_models.MetricTemplateHistory.objects.create(
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
        files=metrictemplate1.files,
        parameter=metrictemplate1.parameter,
        fileparameter=metrictemplate1.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment=create_comment(metrictemplate1)
    )
    mt1_history3.tags.add(mtag1, mtag2, mtag3)

    metrictemplate2 = admin_models.MetricTemplate.objects.create(
        name='org.nagios.CertLifetime',
        mtype=active,
        probekey=probeversion2,
        probeexecutable='check_http',
        config='["maxCheckAttempts 2", "timeout 60", '
               '"path $USER1$", "interval 240", "retryInterval 30"]',
        attribute='["NAGIOS_HOST_CERT -J", "NAGIOS_HOST_KEY -K"]',
        parameter='["-C 30", "--sni "]',
        flags='["OBSESS 1"]'
    )
    metrictemplate2.tags.add(mtag2)

    mt2_history1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate2,
        name=metrictemplate2.name,
        mtype=metrictemplate2.mtype,
        description=metrictemplate2.description,
        probekey=metrictemplate2.probekey,
        probeexecutable=metrictemplate2.probeexecutable,
        config=metrictemplate2.config,
        attribute=metrictemplate2.attribute,
        dependency=metrictemplate2.dependency,
        flags=metrictemplate2.flags,
        files=metrictemplate2.files,
        parameter=metrictemplate2.parameter,
        fileparameter=metrictemplate2.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment='Initial version.',
    )
    mt2_history1.tags.add(mtag2)

    metrictemplate3 = admin_models.MetricTemplate.objects.create(
        name='eu.egi.cloud.OpenStack-VM',
        mtype=active,
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
        object_id=metrictemplate3,
        name=metrictemplate3.name,
        mtype=metrictemplate3.mtype,
        probekey=metrictemplate3.probekey,
        description=metrictemplate3.description,
        parent=metrictemplate3.parent,
        probeexecutable=metrictemplate3.probeexecutable,
        config=metrictemplate3.config,
        attribute=metrictemplate3.attribute,
        dependency=metrictemplate3.dependency,
        flags=metrictemplate3.flags,
        files=metrictemplate3.files,
        parameter=metrictemplate3.parameter,
        fileparameter=metrictemplate3.fileparameter,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    metrictemplate4 = admin_models.MetricTemplate.objects.create(
        name='eu.egi.cloud.OpenStack-Swift',
        mtype=active,
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
    metrictemplate4.tags.add(mtag3)

    mt4_history1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate4,
        name=metrictemplate4.name,
        mtype=metrictemplate4.mtype,
        probekey=metrictemplate4.probekey,
        description=metrictemplate4.description,
        parent=metrictemplate4.parent,
        probeexecutable=metrictemplate4.probeexecutable,
        config=metrictemplate4.config,
        attribute=metrictemplate4.attribute,
        dependency=metrictemplate4.dependency,
        flags=metrictemplate4.flags,
        files=metrictemplate4.files,
        parameter=metrictemplate4.parameter,
        fileparameter=metrictemplate4.fileparameter,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )
    mt4_history1.tags.add(mtag3)

    metrictemplate5 = admin_models.MetricTemplate.objects.create(
        name='org.apel.APEL-Pub',
        flags='["OBSESS 1", "PASSIVE 1"]',
        mtype=passive
    )

    admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate5,
        name=metrictemplate5.name,
        mtype=metrictemplate5.mtype,
        description=metrictemplate5.description,
        probekey=metrictemplate5.probekey,
        probeexecutable=metrictemplate5.probeexecutable,
        config=metrictemplate5.config,
        attribute=metrictemplate5.attribute,
        dependency=metrictemplate5.dependency,
        flags=metrictemplate5.flags,
        files=metrictemplate5.files,
        parameter=metrictemplate5.parameter,
        fileparameter=metrictemplate5.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment='Initial version.',
    )

    metrictemplate6 = admin_models.MetricTemplate.objects.create(
        name='org.nagios.CertLifetime2',
        mtype=active,
        probekey=probeversion2,
        probeexecutable='check_http',
        config='["maxCheckAttempts 4", "timeout 70", '
               '"path $USER1$", "interval 240", "retryInterval 30"]',
        attribute='["NAGIOS_HOST_CERT -J", "NAGIOS_HOST_KEY -K"]',
        parameter='["-C 30", "--sni "]',
        flags='["OBSESS 1"]'
    )
    metrictemplate6.tags.add(mtag1, mtag2)

    mt6_history1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate6,
        name=metrictemplate6.name,
        mtype=metrictemplate6.mtype,
        description=metrictemplate6.description,
        probekey=metrictemplate6.probekey,
        probeexecutable=metrictemplate6.probeexecutable,
        config=metrictemplate6.config,
        attribute=metrictemplate6.attribute,
        dependency=metrictemplate6.dependency,
        flags=metrictemplate6.flags,
        files=metrictemplate6.files,
        parameter=metrictemplate6.parameter,
        fileparameter=metrictemplate6.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment='Initial version.',
    )
    mt6_history1.tags.add(mtag1, mtag2)

    metrictemplate7 = admin_models.MetricTemplate.objects.create(
        name='eu.egi.sec.ARC-CE-result',
        flags='["OBSESS 0", "PASSIVE 1", "VO 1"]',
        mtype=passive,
        parent='eu.egi.sec.ARC-CE-submit'
    )

    admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate7,
        name=metrictemplate7.name,
        mtype=metrictemplate7.mtype,
        description=metrictemplate7.description,
        probekey=metrictemplate7.probekey,
        probeexecutable=metrictemplate7.probeexecutable,
        config=metrictemplate7.config,
        attribute=metrictemplate7.attribute,
        dependency=metrictemplate7.dependency,
        flags=metrictemplate7.flags,
        files=metrictemplate7.files,
        parameter=metrictemplate7.parameter,
        fileparameter=metrictemplate7.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment='Initial version.',
    )

    metrictemplate8 = admin_models.MetricTemplate.objects.create(
        name='argo.AMSPublisher-Check',
        mtype=active,
        probekey=probeversion5_1,
        description='Some description of publisher metric.',
        probeexecutable='ams-publisher-probe',
        config='["maxCheckAttempts 1", "timeout 120",'
               ' "path /usr/libexec/argo-monitoring/probes/argo",'
               ' "interval 180", "retryInterval 1"]',
        parameter='["-s /var/run/argo-nagios-ams-publisher/sock"]',
        flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
    )
    metrictemplate8.tags.add(mtag1)

    mt8_history1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate8,
        name=metrictemplate8.name,
        mtype=metrictemplate8.mtype,
        probekey=metrictemplate8.probekey,
        description=metrictemplate8.description,
        probeexecutable=metrictemplate8.probeexecutable,
        config=metrictemplate8.config,
        attribute=metrictemplate8.attribute,
        dependency=metrictemplate8.dependency,
        flags=metrictemplate8.flags,
        files=metrictemplate8.files,
        parameter=metrictemplate8.parameter,
        fileparameter=metrictemplate8.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment='Initial version.',
    )
    mt8_history1.tags.add(mtag1)

    metrictemplate8.probekey = probeversion5_2
    metrictemplate8.save()

    mt8_history2 = admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate8,
        name=metrictemplate8.name,
        mtype=metrictemplate8.mtype,
        probekey=metrictemplate8.probekey,
        description=metrictemplate8.description,
        probeexecutable=metrictemplate8.probeexecutable,
        config=metrictemplate8.config,
        attribute=metrictemplate8.attribute,
        dependency=metrictemplate8.dependency,
        flags=metrictemplate8.flags,
        files=metrictemplate8.files,
        parameter=metrictemplate8.parameter,
        fileparameter=metrictemplate8.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment='Newer version.'
    )
    mt8_history2.tags.add(mtag1)

    metrictemplate8.probekey = probeversion5_3
    metrictemplate8.parameter = ''
    metrictemplate8.save()
    metrictemplate8.tags.remove(mtag1)
    metrictemplate8.tags.add(mtag2)

    mt8_history3 = admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate8,
        name=metrictemplate8.name,
        mtype=metrictemplate8.mtype,
        probekey=metrictemplate8.probekey,
        description=metrictemplate8.description,
        probeexecutable=metrictemplate8.probeexecutable,
        config=metrictemplate8.config,
        attribute=metrictemplate8.attribute,
        dependency=metrictemplate8.dependency,
        flags=metrictemplate8.flags,
        files=metrictemplate8.files,
        parameter=metrictemplate8.parameter,
        fileparameter=metrictemplate8.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment='Newest version.',
    )
    mt8_history3.tags.add(mtag2)

    metrictemplate9 = admin_models.MetricTemplate.objects.create(
        name='argo.AMS-Check-Old',
        mtype=active,
        probekey=probeversion1_1,
        description='Some description of argo.AMS-Check metric template.',
        probeexecutable='["ams-probe"]',
        config='["maxCheckAttempts 3", "timeout 60",'
               ' "path /usr/libexec/argo-monitoring/probes/argo",'
               ' "interval 5", "retryInterval 3"]',
        attribute='["argo.ams_TOKEN --token"]',
        flags='["OBSESS 1"]',
        parameter='["--project EGI"]'
    )

    admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate9,
        name=metrictemplate9.name,
        mtype=metrictemplate9.mtype,
        probekey=metrictemplate9.probekey,
        description=metrictemplate9.description,
        probeexecutable=metrictemplate9.probeexecutable,
        config=metrictemplate9.config,
        attribute=metrictemplate9.attribute,
        dependency=metrictemplate9.dependency,
        flags=metrictemplate9.flags,
        files=metrictemplate9.files,
        parameter=metrictemplate9.parameter,
        fileparameter=metrictemplate9.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment='Initial version.',
    )

    metrictemplate10 = admin_models.MetricTemplate.objects.create(
        name='test.Metric-Template',
        mtype=active,
        probekey=probeversion6_1,
        description='Metric template for testing probe.',
        probeexecutable='["test-probe"]',
        config='["maxCheckAttempts 3", "timeout 60",'
               ' "path /path", "interval 5", "retryInterval 3"]'
    )
    metrictemplate10.tags.add(mtag1)

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
        version_user=user.username,
        version_comment='Initial version.'
    )
    mt10_history1.tags.add(mtag1)

    metrictemplate10.probekey = probeversion6_2
    metrictemplate10.save()

    admin_models.MetricTemplateHistory.objects.create(
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
        version_user=user.username,
        version_comment='Newer version.'
    )
    mt10_history1.tags.add(mtag1)

    metrictemplate11 = admin_models.MetricTemplate.objects.create(
        name='test.MetricTemplate',
        mtype=active,
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
    metrictemplate11.tags.add(mtag1, mtag2)

    mt11_history1 = admin_models.MetricTemplateHistory.objects.create(
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
        version_user=user.username,
        version_comment='Initial version.'
    )
    mt11_history1.tags.add(mtag1, mtag2)

    metrictemplate12 = admin_models.MetricTemplate.objects.create(
        name="argo.poem-tools.check",
        mtype=active,
        probekey=probeversion8_1,
        description="Probe inspecting the execution of argo-poem-tools.",
        probeexecutable='["check_log"]',
        config='["maxCheckAttempts 2", "timeout 120",'
               ' "path /usr/libexec/argo/probes/argo_tools", '
               '"interval 120", "retryInterval 120"]',
        parameter='["--file /var/log/argo-poem-tools/argo-poem-tools.log", '
                  '"--age 2", "--app argo-poem-packages"]',
        flags='["NOHOSTNAME 1", "NOPUBLISH 1"]'
    )
    metrictemplate12.tags.add(mtag4)

    mt12_history1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=metrictemplate12,
        name=metrictemplate12.name,
        mtype=metrictemplate12.mtype,
        probekey=metrictemplate12.probekey,
        description=metrictemplate12.description,
        probeexecutable=metrictemplate12.probeexecutable,
        config=metrictemplate12.config,
        attribute=metrictemplate12.attribute,
        dependency=metrictemplate12.dependency,
        flags=metrictemplate12.flags,
        files=metrictemplate12.files,
        parameter=metrictemplate12.parameter,
        fileparameter=metrictemplate12.fileparameter,
        date_created=datetime.datetime.now(),
        version_user=user.username,
        version_comment='Initial version.'
    )
    mt12_history1.tags.add(mtag4)

    group = poem_models.GroupOfMetrics.objects.create(
        name=tenant.name.upper()
    )
    ct = ContentType.objects.get_for_model(poem_models.Metric)

    metric1 = poem_models.Metric.objects.create(
        name='argo.AMS-Check',
        group=group,
        probeversion=probeversion1_2.__str__(),
        config='["maxCheckAttempts 4", "timeout 60",'
               ' "path /usr/libexec/argo-monitoring/probes/argo",'
               ' "interval 5", "retryInterval 2"]'
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric1.id,
        serialized_data=serialize_metric(metric1, tags=[mtag1, mtag2, mtag3]),
        object_repr=metric1.__str__(),
        content_type=ct,
        comment='Initial version.',
        user='testuser'
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
        serialized_data=serialize_metric(metric2, tags=[mtag2]),
        content_type=ct,
        date_created=datetime.datetime.now(),
        comment='Initial version.',
        user=user.username
    )

    metric3 = poem_models.Metric.objects.create(
        name=metrictemplate4.name,
        group=group,
        probeversion=metrictemplate4.probekey.__str__(),
        config='["maxCheckAttempts 3", "timeout 300", '
               '"path /usr/libexec/argo-monitoring/probes/fedcloud", '
               '"interval 80", "retryInterval 15"]'
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric3.id,
        object_repr=metric3.__str__(),
        serialized_data=serialize_metric(metric3, tags=[mtag3]),
        content_type=ct,
        date_created=datetime.datetime.now(),
        comment='Initial version.',
        user=user.username
    )

    metric4 = poem_models.Metric.objects.create(
        name=metrictemplate5.name,
        group=group,
        config=metrictemplate5.config
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric4.id,
        object_repr=metric4.__str__(),
        serialized_data=serialize_metric(metric4),
        content_type=ct,
        date_created=datetime.datetime.now(),
        comment='Initial version.',
        user=user.username
    )

    metric5 = poem_models.Metric.objects.create(
        name=metrictemplate10.name,
        group=group,
        probeversion=metrictemplate10.probekey.__str__(),
        config=metrictemplate10.config
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric5.id,
        object_repr=metric5.__str__(),
        serialized_data=serialize_metric(metric5, tags=[mtag1, mtag2]),
        content_type=ct,
        date_created=datetime.datetime.now(),
        comment='Initial version.',
        user=user.username
    )

    metric6 = poem_models.Metric.objects.create(
        name=metrictemplate12.name,
        group=group,
        probeversion=metrictemplate12.probekey.__str__(),
        config=metrictemplate12.config
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric6.id,
        object_repr=metric6.__str__(),
        serialized_data=serialize_metric(metric6, tags=[mtag4]),
        content_type=ct,
        date_created=datetime.datetime.now(),
        comment='Initial version.',
        user=user.username
    )

    if tenant2:
        with schema_context('test2'):
            group1 = poem_models.GroupOfMetrics.objects.create(
                name=Tenant.objects.get(schema_name='test2').name.upper()
            )

            metric1a = poem_models.Metric.objects.create(
                name='argo.AMS-Check',
                group=group1,
                probeversion=probeversion1_2.__str__(),
                config='["maxCheckAttempts 4", "timeout 60",'
                       ' "path /usr/libexec/argo-monitoring/probes/argo",'
                       ' "interval 5", "retryInterval 2"]'
            )

            poem_models.TenantHistory.objects.create(
                object_id=metric1a.id,
                serialized_data=serialize_metric(
                    metric1a, tags=[mtag1, mtag2, mtag3]
                ),
                object_repr=metric1a.__str__(),
                content_type=ct,
                comment='Initial version.',
                user='testuser'
            )

            metric2a = poem_models.Metric.objects.create(
                name=metrictemplate2.name,
                group=group1,
                probeversion=metrictemplate2.probekey.__str__(),
                config=metrictemplate2.config
            )

            poem_models.TenantHistory.objects.create(
                object_id=metric2a.id,
                object_repr=metric2a.__str__(),
                serialized_data=serialize_metric(metric2a, tags=[mtag2]),
                content_type=ct,
                date_created=datetime.datetime.now(),
                comment='Initial version.',
                user=user.username
            )

            metric3a = poem_models.Metric.objects.create(
                name=metrictemplate4.name,
                group=group1,
                probeversion=metrictemplate4.probekey.__str__(),
                config='["maxCheckAttempts 3", "timeout 300", '
                       '"path /usr/libexec/argo-monitoring/probes/fedcloud", '
                       '"interval 80", "retryInterval 15"]'
            )

            poem_models.TenantHistory.objects.create(
                object_id=metric3a.id,
                object_repr=metric3a.__str__(),
                serialized_data=serialize_metric(metric3a, tags=[mtag3]),
                content_type=ct,
                date_created=datetime.datetime.now(),
                comment='Initial version.',
                user=user.username
            )

            metric4a = poem_models.Metric.objects.create(
                name=metrictemplate5.name,
                group=group1,
                config=metrictemplate5.config
            )

            poem_models.TenantHistory.objects.create(
                object_id=metric4a.id,
                object_repr=metric4a.__str__(),
                serialized_data=serialize_metric(metric4a),
                content_type=ct,
                date_created=datetime.datetime.now(),
                comment='Initial version.',
                user=user.username
            )

            metric5a = poem_models.Metric.objects.create(
                name=metrictemplate10.name,
                group=group1,
                probeversion=metrictemplate10.probekey.__str__(),
                config=metrictemplate10.config
            )

            poem_models.TenantHistory.objects.create(
                object_id=metric5a.id,
                object_repr=metric5a.__str__(),
                serialized_data=serialize_metric(metric5a, tags=[mtag1, mtag2]),
                content_type=ct,
                date_created=datetime.datetime.now(),
                comment='Initial version.',
                user=user.username
            )


@factory.django.mute_signals(pre_save)
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

        self.mt4 = admin_models.MetricTemplate.objects.create(
            name='metric-1',
            description='Description of metric-1.',
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
        self.mt4.tags.add(self.metrictag1, self.metrictag2)

        self.mth4 = admin_models.MetricTemplateHistory.objects.create(
            object_id=self.mt4,
            name=self.mt4.name,
            mtype=self.mt4.mtype,
            probekey=self.mt4.probekey,
            description=self.mt4.description,
            parent=self.mt4.parent,
            probeexecutable=self.mt4.probeexecutable,
            config=self.mt4.config,
            attribute=self.mt4.attribute,
            dependency=self.mt4.dependency,
            flags=self.mt4.flags,
            files=self.mt4.files,
            parameter=self.mt4.parameter,
            fileparameter=self.mt4.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='Initial version.',
            version_user='testuser'
        )
        self.mth4.tags.add(self.metrictag1, self.metrictag2)

        self.metric1 = poem_models.Metric.objects.create(
            name='metric-1',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            probeversion=probe_history1.__str__()
        )

        mt5 = admin_models.MetricTemplate.objects.create(
            name='metric-2',
            description='Description of metric-2.',
            parent='',
            config='["maxCheckAttempts 3", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 3"]',
            attribute='["attribute-key attribute-value"]',
            dependency='["dependency-key1 dependency-value1"]',
            flags='["flags-key flags-value", "flags-key1 flags-value1"]',
            files='["files-key files-value"]',
            parameter='["parameter-key parameter-value"]',
            fileparameter='["fileparameter-key fileparameter-value"]',
            mtype=self.active,
            probekey=self.probe_history2
        )
        mt5.tags.add(self.metrictag1, self.metrictag2)

        self.mth5 = admin_models.MetricTemplateHistory.objects.create(
            object_id=mt5,
            name=mt5.name,
            mtype=mt5.mtype,
            probekey=mt5.probekey,
            description=mt5.description,
            parent=mt5.parent,
            probeexecutable=mt5.probeexecutable,
            config=mt5.config,
            attribute=mt5.attribute,
            dependency=mt5.dependency,
            flags=mt5.flags,
            files=mt5.files,
            parameter=mt5.parameter,
            fileparameter=mt5.fileparameter,
            date_created=datetime.datetime.now(),
            version_comment='Newer version.',
            version_user='testuser'
        )
        self.mth5.tags.add(self.metrictag1, self.metrictag2)

        poem_models.TenantHistory.objects.create(
            object_id=self.metric1.id,
            serialized_data=serialize_metric(
                self.metric1, tags=[self.metrictag1, self.metrictag2]
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
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        metric.name = "metric-2"
        metric.probeversion = self.probe_history2.__str__()
        metric.config = '["maxCheckAttempts 3", "timeout 60",' \
                        ' "path $USER", "interval 5", "retryInterval 3"]'
        metric.save()
        serialized_data = serialize_metric(
            metric, tags=[self.metrictag1, self.metrictag2]
        )
        comment = create_comment(
            self.metric1, self.ct_metric, serialized_data
        )
        comment_set = set()
        for item in json.loads(comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"deleted": {"fields": ["dependancy"], '
                '"object": ["dependency-key2"]}}',
                '{"added": {"fields": ["flags"], "object": ["flags-key1"]}}',
                '{"changed": {"fields": ["description", "name", "probekey"]}}',
                '{"deleted": {"fields": ["parent"]}}'
            }
        )

    def test_create_comment_for_metric_if_field_deleted_from_model(self):
        mt = admin_models.MetricTemplateHistory.objects.get(id=self.mth5.id)
        mt.name = 'metric-2'
        mt.description = 'Description of metric-1.'
        mt.probeexecutable = '["new-probeexecutable"]'
        mt.attribute = '["attribute-key attribute-value"]'
        mt.dependancy = '["dependency-key1 dependency-value1"]'
        mt.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        mt.files = '["files-key files-value"]'
        mt.parameter = '["parameter-key parameter-value"]'
        mt.parent = ''
        mt.save()
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        metric.name = "metric-2"
        metric.probeversion = self.probe_history2.__str__()
        metric.config = '["maxCheckAttempts 4", "timeout 60",' \
                        ' "path $USER", "interval 5", "retryInterval 3"]'
        serialized_data = serialize_metric(
            metric, tags=[self.metrictag1, self.metrictag2]
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
        mt = admin_models.MetricTemplateHistory.objects.get(id=self.mth5.id)
        mt.name = 'metric-2'
        mt.description = 'Description of metric-1.'
        mt.probeexecutable = '["new-probeexecutable"]'
        mt.attribute = '["attribute-key attribute-value"]'
        mt.dependancy = '["dependency-key1 dependency-value1"]'
        mt.flags = '["flags-key flags-value", "flags-key1 flags-value2"]'
        mt.files = '["files-key files-value"]'
        mt.parameter = '["parameter-key parameter-value"]'
        mt.fileparameter = '["fileparameter-key fileparameter-value"]'
        mt.parent = ''
        mt.save()
        metric = poem_models.Metric.objects.get(id=self.metric1.id)
        metric.name = "metric-2"
        metric.probeversion = self.probe_history2.__str__()
        metric.config = '["maxCheckAttempts 4", "timeout 60",' \
                        ' "path $USER", "interval 5", "retryInterval 4"]'
        metric.save()
        serialized_data = serialize_metric(
            metric, tags=[self.metrictag1, self.metrictag2]
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
            name='metric-template-3',
            probeversion=self.mt2.probekey.__str__(),
            config='["maxCheckAttempts 4", "timeout 60",'
                   ' "path $USER", "interval 5", "retryInterval 4"]'
        )
        serialized_data = serialize_metric(mt, tags=[self.metrictag1])
        comment = create_comment(mt, self.ct_metric, serialized_data)
        self.assertEqual(comment, 'Initial version.')

    def test_create_comment_for_metric_if_group_was_none(self):
        group = poem_models.GroupOfMetrics.objects.create(name='EGI')
        m = self.metric1
        m.group = group
        m.save()
        serialized_data = serialize_metric(
            m, tags=[self.metrictag1, self.metrictag2]
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


class ImportMetricsTests(TransactionTestCase):
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
        self.tenant = get_tenant_model()(schema_name='test', name='Test')
        self.tenant.save(verbosity=0)
        get_tenant_domain_model().objects.create(
            domain=tenant_domain, tenant=self.tenant, is_primary=True
        )

        connection.set_tenant(self.tenant)

        mock_db(self.tenant)

        self.user = CustUser.objects.get(username='testuser')

        self.active = admin_models.MetricTemplateType.objects.get(
            name='Active'
        )
        self.passive = admin_models.MetricTemplateType.objects.get(
            name='Passive'
        )

        self.group = poem_models.GroupOfMetrics.objects.get(
            name=self.tenant.name.upper()
        )
        self.ct = ContentType.objects.get_for_model(poem_models.Metric)

        self.mtag1 = admin_models.MetricTags.objects.get(name='test_tag1')
        self.mtag2 = admin_models.MetricTags.objects.get(name='test_tag2')
        self.mtag3 = admin_models.MetricTags.objects.get(name='test_tag3')

        self.metrictemplate1 = admin_models.MetricTemplate.objects.get(
            name='argo.AMS-Check'
        )
        self.metrictemplate2 = admin_models.MetricTemplate.objects.get(
            name="org.nagios.CertLifetime"
        )
        self.metrictemplate3 = admin_models.MetricTemplate.objects.get(
            name='eu.egi.cloud.OpenStack-VM'
        )
        self.metrictemplate5 = admin_models.MetricTemplate.objects.get(
            name='org.apel.APEL-Pub'
        )
        self.metrictemplate6 = admin_models.MetricTemplate.objects.get(
            name='org.nagios.CertLifetime2'
        )
        self.metrictemplate7 = admin_models.MetricTemplate.objects.get(
            name='eu.egi.sec.ARC-CE-result'
        )
        metrictemplate8 = admin_models.MetricTemplate.objects.get(
            name='argo.AMSPublisher-Check'
        )
        self.metrictemplate10 = admin_models.MetricTemplate.objects.get(
            name="test.Metric-Template"
        )

        probeversion1 = admin_models.ProbeHistory.objects.filter(
            name='ams-probe'
        ).order_by("-date_created")
        self.probeversion1_2 = probeversion1[1]
        self.probeversion1_3 = probeversion1[0]

        self.mt1_history2 = admin_models.MetricTemplateHistory.objects.get(
            object_id=self.metrictemplate1, probekey=self.probeversion1_2
        )
        self.mt8_history2 = admin_models.MetricTemplateHistory.objects.get(
            object_id=metrictemplate8, version_comment='Newer version.'
        )

        self.metric1 = poem_models.Metric.objects.get(
            name='argo.AMS-Check'
        )
        self.metric2 = poem_models.Metric.objects.get(
            name='org.nagios.CertLifetime'
        )
        self.metric4 = poem_models.Metric.objects.get(
            name='org.apel.APEL-Pub'
        )
        self.metric5 = poem_models.Metric.objects.get(
            name='test.Metric-Template'
        )

    def test_import_active_metrics_successfully(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
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
        self.assertEqual(poem_models.Metric.objects.all().count(), 8)
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
        self.assertEqual(metric1.group, self.group)
        self.assertEqual(
            metric1.probeversion, self.metrictemplate3.probekey.__str__()
        )
        self.assertEqual(metric1.config, self.metrictemplate3.config)
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(
            serialized_data1['mtype'][0], self.metrictemplate3.mtype.name
        )
        self.assertEqual(serialized_data1['tags'], [])
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(
            serialized_data1['description'], self.metrictemplate3.description
        )
        self.assertEqual(
            serialized_data1['probekey'],
            [
                self.metrictemplate3.probekey.name,
                self.metrictemplate3.probekey.package.version
            ]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'],
            self.metrictemplate3.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(
            serialized_data1['attribute'], self.metrictemplate3.attribute
        )
        self.assertEqual(
            serialized_data1['dependancy'], self.metrictemplate3.dependency
        )
        self.assertEqual(serialized_data1['flags'], self.metrictemplate3.flags)
        self.assertEqual(serialized_data1['files'], self.metrictemplate3.files)
        self.assertEqual(
            serialized_data1['parameter'], self.metrictemplate3.parameter
        )
        self.assertEqual(
            serialized_data1['fileparameter'],
            self.metrictemplate3.fileparameter
        )
        self.assertEqual(history2.count(), 1)
        self.assertEqual(metric2.name, self.metrictemplate6.name)
        self.assertEqual(metric2.group, self.group)
        self.assertEqual(
            metric2.probeversion, self.metrictemplate6.probekey.__str__()
        )
        self.assertEqual(metric2.config, self.metrictemplate6.config)
        self.assertEqual(serialized_data2['name'], metric2.name)
        self.assertEqual(
            serialized_data2['mtype'][0], self.metrictemplate6.mtype.name
        )
        self.assertEqual(
            serialized_data2['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data2['group'][0], metric2.group.name)
        self.assertEqual(
            serialized_data2['description'], self.metrictemplate6.description
        )
        self.assertEqual(
            serialized_data2['probekey'],
            [
                self.metrictemplate6.probekey.name,
                self.metrictemplate6.probekey.package.version
            ]
        )
        self.assertEqual(
            serialized_data2['probeexecutable'],
            self.metrictemplate6.probeexecutable
        )
        self.assertEqual(serialized_data2['config'], metric2.config)
        self.assertEqual(
            serialized_data2['attribute'], self.metrictemplate6.attribute
        )
        self.assertEqual(
            serialized_data2['dependancy'], self.metrictemplate6.dependency
        )
        self.assertEqual(serialized_data2['flags'], self.metrictemplate6.flags)
        self.assertEqual(serialized_data2['files'], self.metrictemplate6.files)
        self.assertEqual(
            serialized_data2['parameter'], self.metrictemplate6.parameter
        )
        self.assertEqual(
            serialized_data2['fileparameter'],
            self.metrictemplate6.fileparameter
        )

    def test_import_passive_metric_successfully(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        success, warning, error, unavailable = import_metrics(
            ['eu.egi.sec.ARC-CE-result'], self.tenant, self.user
        )
        self.assertEqual(success, ['eu.egi.sec.ARC-CE-result'])
        self.assertEqual(warning, [])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 7)
        metric1 = poem_models.Metric.objects.get(
            name='eu.egi.sec.ARC-CE-result'
        )
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metrictemplate7.name)
        self.assertEqual(metric1.group, self.group)
        self.assertEqual(metric1.probeversion, None)
        self.assertEqual(metric1.config, self.metrictemplate7.config)
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(
            serialized_data1['mtype'][0], self.metrictemplate7.mtype.name
        )
        self.assertEqual(serialized_data1['tags'], [])
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(
            serialized_data1['description'], self.metrictemplate7.description
        )
        self.assertEqual(serialized_data1['probekey'], None)
        self.assertEqual(
            serialized_data1['probeexecutable'],
            self.metrictemplate7.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(
            serialized_data1['attribute'], self.metrictemplate7.attribute
        )
        self.assertEqual(
            serialized_data1['dependancy'], self.metrictemplate7.dependency
        )
        self.assertEqual(serialized_data1['flags'], self.metrictemplate7.flags)
        self.assertEqual(serialized_data1['files'], self.metrictemplate7.files)
        self.assertEqual(
            serialized_data1['parameter'], self.metrictemplate7.parameter
        )
        self.assertEqual(
            serialized_data1['fileparameter'],
            self.metrictemplate7.fileparameter
        )

    def test_import_active_metric_with_warning(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        success, warning, error, unavailable = import_metrics(
            ['argo.AMSPublisher-Check'], self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, ['argo.AMSPublisher-Check'])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 7)
        metric1 = poem_models.Metric.objects.get(
            name='argo.AMSPublisher-Check'
        )
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.mt8_history2.name)
        self.assertEqual(metric1.group, self.group)
        self.assertEqual(
            metric1.probeversion, self.mt8_history2.probekey.__str__()
        )
        self.assertEqual(metric1.config, self.mt8_history2.config)
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(
            serialized_data1['mtype'][0], self.mt8_history2.mtype.name
        )
        self.assertEqual(serialized_data1['tags'], [['test_tag1']])
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(
            serialized_data1['description'], self.mt8_history2.description
        )
        self.assertEqual(
            serialized_data1['probekey'],
            [
                self.mt8_history2.probekey.name,
                self.mt8_history2.probekey.package.version
            ]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'],
            self.mt8_history2.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(
            serialized_data1['attribute'], self.mt8_history2.attribute
        )
        self.assertEqual(
            serialized_data1['dependancy'], self.mt8_history2.dependency
        )
        self.assertEqual(serialized_data1['flags'], self.mt8_history2.flags)
        self.assertEqual(serialized_data1['files'], self.mt8_history2.files)
        self.assertEqual(
            serialized_data1['parameter'], self.mt8_history2.parameter
        )
        self.assertEqual(
            serialized_data1['fileparameter'], self.mt8_history2.fileparameter
        )

    def test_import_active_metric_if_package_already_exists_with_diff_version(
            self
    ):
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        success, warning, error, unavailable = import_metrics(
            ['test.Metric-Template', 'test.MetricTemplate'],
            self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, [])
        self.assertEqual(error, ['test.Metric-Template'])
        self.assertEqual(unavailable, ['test.MetricTemplate'])
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        metric1 = poem_models.Metric.objects.get(name='test.Metric-Template')
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metric5.name)
        self.assertEqual(metric1.group, self.metric5.group)
        self.assertEqual(metric1.probeversion, self.metric5.probeversion)
        self.assertEqual(metric1.config, self.metric5.config)
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(
            serialized_data1['mtype'][0], self.metrictemplate10.mtype.name
        )
        self.assertEqual(
            serialized_data1['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(
            serialized_data1['description'], self.metrictemplate10.description
        )
        self.assertEqual(
            serialized_data1['probekey'],
            [
                self.metrictemplate10.probekey.name,
                self.metrictemplate10.probekey.package.version
            ]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'],
            self.metrictemplate10.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(
            serialized_data1['attribute'], self.metrictemplate10.attribute
        )
        self.assertEqual(
            serialized_data1['dependancy'], self.metrictemplate10.dependency
        )
        self.assertEqual(serialized_data1['flags'], self.metrictemplate10.flags)
        self.assertEqual(serialized_data1['files'], self.metrictemplate10.files)
        self.assertEqual(
            serialized_data1['parameter'], self.metrictemplate10.parameter
        )
        self.assertEqual(
            serialized_data1['fileparameter'],
            self.metrictemplate10.fileparameter
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
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        success, warning, error, unavailable = import_metrics(
            ['argo.AMS-Check', 'org.nagios.CertLifetime'],
            self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, [])
        self.assertEqual(error, ['argo.AMS-Check', 'org.nagios.CertLifetime'])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
        history1 = poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        ).order_by('-date_created')
        serialized_data1 = json.loads(history1[0].serialized_data)[0]['fields']
        self.assertEqual(history1.count(), 1)
        self.assertEqual(metric1.name, self.metric1.name)
        self.assertEqual(metric1.group, self.metric1.group)
        self.assertEqual(metric1.probeversion, self.metric1.probeversion)
        self.assertEqual(metric1.config, self.metric1.config)
        self.assertEqual(serialized_data1['name'], metric1.name)
        self.assertEqual(
            serialized_data1['mtype'][0], self.mt1_history2.mtype.name
        )
        self.assertEqual(
            serialized_data1['tags'],
            [['test_tag1'], ['test_tag2'], ['test_tag3']]
        )
        self.assertEqual(serialized_data1['group'][0], metric1.group.name)
        self.assertEqual(
            serialized_data1['description'], self.mt1_history2.description
        )
        self.assertEqual(
            serialized_data1['probekey'],
            [
                self.mt1_history2.probekey.name,
                self.mt1_history2.probekey.package.version
            ]
        )
        self.assertEqual(
            serialized_data1['probeexecutable'],
            self.mt1_history2.probeexecutable
        )
        self.assertEqual(serialized_data1['config'], metric1.config)
        self.assertEqual(
            serialized_data1['attribute'], self.mt1_history2.attribute
        )
        self.assertEqual(
            serialized_data1['dependancy'], self.mt1_history2.dependency
        )
        self.assertEqual(serialized_data1['flags'], self.mt1_history2.flags)
        self.assertEqual(serialized_data1['files'], self.mt1_history2.files)
        self.assertEqual(
            serialized_data1['parameter'], self.mt1_history2.parameter
        )
        self.assertEqual(
            serialized_data1['fileparameter'], self.mt1_history2.fileparameter
        )
        metric2 = poem_models.Metric.objects.get(name='org.nagios.CertLifetime')
        history2 = poem_models.TenantHistory.objects.filter(
            object_id=metric2.id
        ).order_by('-date_created')
        serialized_data2 = json.loads(history2[0].serialized_data)[0]['fields']
        self.assertEqual(history2.count(), 1)
        self.assertEqual(metric2.name, self.metric2.name)
        self.assertEqual(metric2.group, self.metric2.group)
        self.assertEqual(metric2.probeversion, self.metric2.probeversion)
        self.assertEqual(metric2.config, self.metric2.config)
        self.assertEqual(serialized_data2['name'], metric2.name)
        self.assertEqual(
            serialized_data2['mtype'][0], self.metrictemplate2.mtype.name
        )
        self.assertEqual(serialized_data2['tags'], [['test_tag2']])
        self.assertEqual(serialized_data2['group'][0], metric2.group.name)
        self.assertEqual(
            serialized_data2['description'], self.metrictemplate2.description
        )
        self.assertEqual(
            serialized_data2['probekey'],
            [
                self.metrictemplate2.probekey.name,
                self.metrictemplate2.probekey.package.version
            ]
        )
        self.assertEqual(
            serialized_data2['probeexecutable'],
            self.metrictemplate2.probeexecutable
        )
        self.assertEqual(serialized_data2['config'], metric2.config)
        self.assertEqual(
            serialized_data2['attribute'], self.metrictemplate2.attribute
        )
        self.assertEqual(
            serialized_data2['dependancy'], self.metrictemplate2.dependency
        )
        self.assertEqual(serialized_data2['flags'], self.metrictemplate2.flags)
        self.assertEqual(serialized_data2['files'], self.metrictemplate2.files)
        self.assertEqual(
            serialized_data2['parameter'], self.metrictemplate2.parameter
        )
        self.assertEqual(
            serialized_data2['fileparameter'],
            self.metrictemplate2.fileparameter
        )

    def test_import_metric_older_version_than_tenants_package(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        success, warning, error, unavailable = import_metrics(
            ['argo.AMS-Check-Old'], self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, [])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, ['argo.AMS-Check-Old'])
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
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

    def test_import_nonexisting_metric(self):
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        success, warning, error, unavailable = import_metrics(
            ['argo.nonexisting.metric'], self.tenant, self.user
        )
        self.assertEqual(success, [])
        self.assertEqual(warning, [])
        self.assertEqual(error, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(poem_models.Metric.objects.all().count(), 6)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="argo.nonexisting.metric"
        )


class UpdateMetricsTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = 'TEST'
        self.tenant.save()
        mock_db(self.tenant, tenant2=True)

        self.mt_active = admin_models.MetricTemplateType.objects.get(
            name='Active'
        )
        self.mt_passive = admin_models.MetricTemplateType.objects.get(
            name='Passive'
        )

        self.ct = ContentType.objects.get_for_model(poem_models.Metric)

        self.mtag1 = admin_models.MetricTags.objects.get(name='test_tag1')
        self.mtag2 = admin_models.MetricTags.objects.get(name='test_tag2')
        self.mtag3 = admin_models.MetricTags.objects.get(name='test_tag3')

        probeversion1 = admin_models.ProbeHistory.objects.filter(
            name='ams-probe'
        )
        self.probeversion1_2 = probeversion1[1]
        self.probeversion1_3 = probeversion1[0]

    @staticmethod
    def _create_metric_template_history(metrictemplate, tags):
        history = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate,
            name=metrictemplate.name,
            mtype=metrictemplate.mtype,
            probekey=metrictemplate.probekey,
            description=metrictemplate.description,
            probeexecutable=metrictemplate.probeexecutable,
            config=metrictemplate.config,
            attribute=metrictemplate.attribute,
            dependency=metrictemplate.dependency,
            flags=metrictemplate.flags,
            files=metrictemplate.files,
            parameter=metrictemplate.parameter,
            fileparameter=metrictemplate.fileparameter,
            parent=metrictemplate.parent,
            date_created=datetime.datetime.now(),
            version_user="poem",
            version_comment='Test version.'
        )
        for tag in tags:
            history.tags.add(tag)

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_active_metrics_from_metrictemplate_instance(
            self, mock_update
    ):
        mock_update.return_value = []
        metrictemplate = admin_models.MetricTemplate.objects.get(
            name='argo.AMS-Check'
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
        metrictemplate.attribute = '["argo.ams_TOKEN2 --token"]'
        metrictemplate.dependency = '["dep-key dep-val"]'
        metrictemplate.parameter = '["par-key par-val"]'
        metrictemplate.flags = '["flag-key flag-val"]'
        metrictemplate.files = '["file-key file-val"]'
        metrictemplate.fileparameter = '["fp-key fp-val"]'
        metrictemplate.save()
        metrictemplate.tags.remove(self.mtag2)
        self._create_metric_template_history(metrictemplate, tags=[self.mtag1])
        update_metric_in_schema(
            mt_id=metrictemplate.id, name='argo.AMS-Check',
            pk_id=self.probeversion1_2.id, schema=self.tenant.schema_name
        )
        mock_update.assert_called_once()
        mock_update.assert_has_calls([
            call('argo.AMS-Check', 'argo.AMS-Check-new')
        ])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check-new')
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        self.assertEqual(metric_versions.count(), 1)
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(metric.probeversion, metrictemplate.probekey.__str__())
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 2"]'
        )
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metrictemplate.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag3']]
        )
        self.assertEqual(
            serialized_data['description'], metrictemplate.description
        )
        self.assertEqual(
            serialized_data['probekey'],
            [
                metrictemplate.probekey.name,
                metrictemplate.probekey.package.version
            ]
        )
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], metrictemplate.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metrictemplate.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metrictemplate.attribute)
        self.assertEqual(
            serialized_data['dependancy'], metrictemplate.dependency
        )
        self.assertEqual(serialized_data['flags'], metrictemplate.flags)
        self.assertEqual(serialized_data['files'], metrictemplate.files)
        self.assertEqual(serialized_data['parameter'], metrictemplate.parameter)
        self.assertEqual(
            serialized_data['fileparameter'], metrictemplate.fileparameter
        )
        with schema_context('test2'):
            metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
            metric_versions1 = poem_models.TenantHistory.objects.filter(
                object_id=metric1.id, content_type=self.ct
            ).order_by('-date_created')
            self.assertEqual(metric_versions1.count(), 1)
            serialized_data1 = json.loads(
                metric_versions1[0].serialized_data
            )[0]['fields']
            self.assertEqual(
                metric1.probeversion, metrictemplate.probekey.__str__()
            )
            self.assertEqual(metric1.group.name, 'TEST2')
            self.assertEqual(
                metric1.config,
                '["maxCheckAttempts 4", "timeout 60",'
                ' "path /usr/libexec/argo-monitoring/probes/argo",'
                ' "interval 5", "retryInterval 2"]'
            )
            self.assertEqual(serialized_data1['name'], metric1.name)
            self.assertEqual(serialized_data1['mtype'], ["Active"])
            self.assertEqual(
                serialized_data1['tags'],
                [['test_tag1'], ['test_tag2'], ['test_tag3']]
            )
            self.assertEqual(
                serialized_data1['description'],
                "Some description of argo.AMS-Check metric template."
            )
            self.assertEqual(
                serialized_data1['probekey'],
                [
                    metrictemplate.probekey.name,
                    metrictemplate.probekey.package.version
                ]
            )
            self.assertEqual(serialized_data1['group'], ['TEST2'])
            self.assertEqual(serialized_data1['parent'], "")
            self.assertEqual(
                serialized_data1['probeexecutable'], '["ams-probe"]'
            )
            self.assertEqual(serialized_data1['config'], metric1.config)
            self.assertEqual(
                serialized_data1['attribute'], '["argo.ams_TOKEN --token"]'
            )
            self.assertEqual(serialized_data1['dependancy'], "")
            self.assertEqual(serialized_data1['flags'], '["OBSESS 1"]')
            self.assertEqual(serialized_data1['files'], "")
            self.assertEqual(serialized_data1['parameter'], '["--project EGI"]')
            self.assertEqual(serialized_data1['fileparameter'], "")

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_passive_metrics_from_metrictemplate_instance(
            self, mock_update
    ):
        mock_update.return_value = []
        metrictemplate = admin_models.MetricTemplate.objects.get(
            name='org.apel.APEL-Pub'
        )
        mth = admin_models.MetricTemplateHistory.objects.get(
            name="org.apel.APEL-Pub"
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
        mth.name = metrictemplate.name
        mth.mtype = metrictemplate.mtype
        mth.description = metrictemplate.description
        mth.probekey = metrictemplate.probekey
        mth.parent = metrictemplate.parent
        mth.probeexecutable = metrictemplate.probeexecutable
        mth.config = metrictemplate.config
        mth.attribute = metrictemplate.attribute
        mth.dependency = metrictemplate.dependency
        mth.parameter = metrictemplate.parameter
        mth.flags = metrictemplate.flags
        mth.files = metrictemplate.files
        mth.fileparameter = metrictemplate.fileparameter
        mth.save()
        update_metric_in_schema(
            mt_id=metrictemplate.id, name='org.apel.APEL-Pub',
            pk_id=None, schema='test'
        )
        mock_update.assert_called_once()
        mock_update.assert_has_calls([
            call('org.apel.APEL-Pub', 'org.apel.APEL-Pub-new')
        ])
        metric = poem_models.Metric.objects.get(name='org.apel.APEL-Pub-new')
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 1)
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(metric.probeversion, metrictemplate.probekey)
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.config, '')
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metrictemplate.mtype.name])
        self.assertEqual(serialized_data['tags'], [['test_tag1']])
        self.assertEqual(
            serialized_data['description'], metrictemplate.description
        )
        self.assertEqual(serialized_data['probekey'], None)
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], metrictemplate.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metrictemplate.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metrictemplate.attribute)
        self.assertEqual(
            serialized_data['dependancy'], metrictemplate.dependency
        )
        self.assertEqual(serialized_data['flags'], metrictemplate.flags)
        self.assertEqual(serialized_data['files'], metrictemplate.files)
        self.assertEqual(serialized_data['parameter'], metrictemplate.parameter)
        self.assertEqual(
            serialized_data['fileparameter'], metrictemplate.fileparameter
        )
        with schema_context('test2'):
            metric1 = poem_models.Metric.objects.get(
                name='org.apel.APEL-Pub')
            metric_versions1 = poem_models.TenantHistory.objects.filter(
                object_id=metric1.id, content_type=self.ct
            ).order_by('-date_created')
            serialized_data1 = json.loads(
                metric_versions1[0].serialized_data
            )[0]['fields']
            self.assertEqual(metric_versions1.count(), 1)
            self.assertEqual(metric1.probeversion, None)
            self.assertEqual(metric1.group.name, 'TEST2')
            self.assertEqual(serialized_data1['name'], metric1.name)
            self.assertEqual(serialized_data1['mtype'], ["Passive"])
            self.assertEqual(serialized_data1['tags'], [])
            self.assertEqual(serialized_data1['description'], "")
            self.assertEqual(serialized_data1['probekey'], None)
            self.assertEqual(serialized_data1['group'], ['TEST2'])
            self.assertEqual(serialized_data1['parent'], "")
            self.assertEqual(serialized_data1['probeexecutable'], "")
            self.assertEqual(serialized_data1['config'], metric1.config)
            self.assertEqual(serialized_data1['attribute'], "")
            self.assertEqual(serialized_data1['dependancy'], "")
            self.assertEqual(
                serialized_data1['flags'], '["OBSESS 1", "PASSIVE 1"]'
            )
            self.assertEqual(serialized_data1['files'], "")
            self.assertEqual(serialized_data1['parameter'], "")
            self.assertEqual(serialized_data1['fileparameter'], "")

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_active_metrics_from_metrictemplatehistory_instance(
            self, mock_update
    ):
        mock_update.return_value = []
        metrictemplate1 = admin_models.MetricTemplate.objects.get(
            name='argo.AMS-Check'
        )
        metrictemplate = admin_models.MetricTemplateHistory.objects.create(
            object_id=metrictemplate1,
            name='argo.AMS-Check-new',
            mtype=self.mt_active,
            description='New description for the metric.',
            probekey=self.probeversion1_2,
            parent='argo.AMS-Check',
            probeexecutable='ams-probe',
            config='["maxCheckAttempts 4", "timeout 70", '
                   '"path /usr/libexec/argo-monitoring/probes/argo", '
                   '"interval 6", "retryInterval 4"]',
            attribute='["argo.ams_TOKEN2 --token"]',
            dependency='["dep-key dep-val"]',
            parameter='["par-key par-val"]',
            flags='["flag-key flag-val"]',
            files='["file-key file-val"]',
            fileparameter='["fp-key fp-val"]',
            date_created=datetime.datetime.now(),
            version_user='testuser',
            version_comment=create_comment(metrictemplate1)
        )
        metrictemplate.tags.add(self.mtag1, self.mtag2)
        update_metric_in_schema(
            mt_id=metrictemplate.id, name='argo.AMS-Check',
            pk_id=self.probeversion1_2.id, schema=self.tenant.schema_name,
            update_from_history=True
        )
        mock_update.assert_called_once()
        mock_update.assert_has_calls([
            call('argo.AMS-Check', 'argo.AMS-Check-new')
        ])
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check-new')
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 2)
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(metric.probeversion, metrictemplate.probekey.__str__())
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(metric.config, metrictemplate.config)
        self.assertEqual(serialized_data['name'], metrictemplate.name)
        self.assertEqual(serialized_data['mtype'], [metrictemplate.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag2']]
        )
        self.assertEqual(
            serialized_data['description'], metrictemplate.description
        )
        self.assertEqual(
            serialized_data['probekey'],
            [
                metrictemplate.probekey.name,
                metrictemplate.probekey.package.version
            ]
        )
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], metrictemplate.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metrictemplate.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metrictemplate.attribute)
        self.assertEqual(
            serialized_data['dependancy'], metrictemplate.dependency
        )
        self.assertEqual(serialized_data['flags'], metrictemplate.flags)
        self.assertEqual(serialized_data['files'], metrictemplate.files)
        self.assertEqual(serialized_data['parameter'], metrictemplate.parameter)
        self.assertEqual(
            serialized_data['fileparameter'], metrictemplate.fileparameter
        )
        with schema_context('test2'):
            metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
            metric_versions1 = poem_models.TenantHistory.objects.filter(
                object_id=metric1.id, content_type=self.ct
            ).order_by('-date_created')
            serialized_data1 = json.loads(
                metric_versions1[0].serialized_data
            )[0]['fields']
            self.assertEqual(metric_versions1.count(), 1)
            self.assertEqual(
                metric1.probeversion, metrictemplate.probekey.__str__()
            )
            self.assertEqual(metric1.group.name, 'TEST2')
            self.assertEqual(metric.config, metrictemplate.config)
            self.assertEqual(serialized_data1['name'], metric1.name)
            self.assertEqual(serialized_data1['mtype'], ["Active"])
            self.assertEqual(
                serialized_data1['tags'],
                [['test_tag1'], ['test_tag2'], ['test_tag3']]
            )
            self.assertEqual(
                serialized_data1['description'],
                "Some description of argo.AMS-Check metric template."
            )
            self.assertEqual(
                serialized_data1['probekey'],
                [
                    metrictemplate.probekey.name,
                    metrictemplate.probekey.package.version
                ]
            )
            self.assertEqual(serialized_data1['group'], ['TEST2'])
            self.assertEqual(serialized_data1['parent'], "")
            self.assertEqual(
                serialized_data1['probeexecutable'], '["ams-probe"]'
            )
            self.assertEqual(serialized_data1['config'], metric1.config)
            self.assertEqual(
                serialized_data1['attribute'], '["argo.ams_TOKEN --token"]'
            )
            self.assertEqual(serialized_data1['dependancy'], "")
            self.assertEqual(serialized_data1['flags'], '["OBSESS 1"]')
            self.assertEqual(serialized_data1['files'], "")
            self.assertEqual(serialized_data1['parameter'], '["--project EGI"]')
            self.assertEqual(serialized_data1['fileparameter'], "")

    @patch('Poem.helpers.metrics_helpers.update_metrics_in_profiles')
    def test_update_metrics_if_different_metrictemplate_version_from_mt_inst(
            self, mock_update
    ):
        mock_update.side_effect = mocked_func
        metrictemplate = admin_models.MetricTemplate.objects.get(
            name='argo.AMS-Check'
        )
        mth = admin_models.MetricTemplateHistory.objects.get(
            name="argo.AMS-Check", probekey=self.probeversion1_3
        )
        metrictemplate.mtype = self.mt_active
        metrictemplate.description = 'New description for the metric.'
        metrictemplate.probekey = self.probeversion1_3
        metrictemplate.parent = 'argo.AMS-Check'
        metrictemplate.probeexecutable = '["ams-probe"]'
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
        mth.name = metrictemplate.name
        mth.mtype = metrictemplate.mtype
        mth.description = metrictemplate.description
        mth.probekey = metrictemplate.probekey
        mth.parent = metrictemplate.parent
        mth.probeexecutable = metrictemplate.probeexecutable
        mth.config = metrictemplate.config
        mth.attribute = metrictemplate.attribute
        mth.dependency = metrictemplate.dependency
        mth.parameter = metrictemplate.parameter
        mth.flags = metrictemplate.flags
        mth.files = metrictemplate.files
        mth.fileparameter = metrictemplate.fileparameter
        mth.save()
        mth.tags.remove(self.mtag2)
        update_metric_in_schema(
            mt_id=metrictemplate.id, name='argo.AMS-Check',
            pk_id=self.probeversion1_2.id, schema=self.tenant.schema_name,
            user='testuser'
        )
        metric = poem_models.Metric.objects.get(name='argo.AMS-Check')
        metric_versions = poem_models.TenantHistory.objects.filter(
            object_id=metric.id, content_type=self.ct
        ).order_by('-date_created')
        serialized_data = json.loads(
            metric_versions[0].serialized_data
        )[0]['fields']
        self.assertEqual(metric_versions.count(), 2)
        self.assertEqual(metric_versions[0].user, 'testuser')
        self.assertEqual(metric.name, metrictemplate.name)
        self.assertEqual(metric.probeversion, metrictemplate.probekey.__str__())
        self.assertEqual(metric.group.name, 'TEST')
        self.assertEqual(
            metric.config,
            '["maxCheckAttempts 4", "timeout 60", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 5", "retryInterval 2"]'
        )
        self.assertEqual(serialized_data['name'], metric.name)
        self.assertEqual(serialized_data['mtype'], [metrictemplate.mtype.name])
        self.assertEqual(
            serialized_data['tags'], [['test_tag1'], ['test_tag3']]
        )
        self.assertEqual(
            serialized_data['description'], metrictemplate.description
        )
        self.assertEqual(
            serialized_data['probekey'],
            [
                metrictemplate.probekey.name,
                metrictemplate.probekey.package.version
            ]
        )
        self.assertEqual(serialized_data['group'], ['TEST'])
        self.assertEqual(serialized_data['parent'], metrictemplate.parent)
        self.assertEqual(
            serialized_data['probeexecutable'], metrictemplate.probeexecutable
        )
        self.assertEqual(serialized_data['config'], metric.config)
        self.assertEqual(serialized_data['attribute'], metrictemplate.attribute)
        self.assertEqual(
            serialized_data['dependancy'], metrictemplate.dependency
        )
        self.assertEqual(serialized_data['flags'], metrictemplate.flags)
        self.assertEqual(serialized_data['files'], metrictemplate.files)
        self.assertEqual(serialized_data['parameter'], metrictemplate.parameter)
        self.assertEqual(
            serialized_data['fileparameter'], metrictemplate.fileparameter
        )
        self.assertFalse(mock_update.called)
        with schema_context('test2'):
            metric1 = poem_models.Metric.objects.get(name='argo.AMS-Check')
            metric_versions1 = poem_models.TenantHistory.objects.filter(
                object_id=metric1.id, content_type=self.ct
            ).order_by('-date_created')
            serialized_data1 = json.loads(
                metric_versions1[0].serialized_data
            )[0]['fields']
            self.assertEqual(metric_versions1.count(), 1)
            self.assertEqual(
                metric1.probeversion, self.probeversion1_2.__str__()
            )
            self.assertEqual(metric1.group.name, 'TEST2')
            self.assertEqual(
                metric1.config,
                '["maxCheckAttempts 4", "timeout 60", '
                '"path /usr/libexec/argo-monitoring/probes/argo", '
                '"interval 5", "retryInterval 2"]'
            )
            self.assertEqual(serialized_data1['name'], metric1.name)
            self.assertEqual(serialized_data1['mtype'], ["Active"])
            self.assertEqual(
                serialized_data1['tags'],
                [['test_tag1'], ['test_tag2'], ['test_tag3']]
            )
            self.assertEqual(
                serialized_data1['description'],
                "Some description of argo.AMS-Check metric template."
            )
            self.assertEqual(
                serialized_data1['probekey'],
                [
                    self.probeversion1_2.name,
                    self.probeversion1_2.package.version
                ]
            )
            self.assertEqual(serialized_data1['group'], ['TEST2'])
            self.assertEqual(serialized_data1['parent'], "")
            self.assertEqual(
                serialized_data1['probeexecutable'], '["ams-probe"]'
            )
            self.assertEqual(serialized_data1['config'], metric1.config)
            self.assertEqual(
                serialized_data1['attribute'], '["argo.ams_TOKEN --token"]'
            )
            self.assertEqual(serialized_data1['dependancy'], "")
            self.assertEqual(serialized_data1['flags'], '["OBSESS 1"]')
            self.assertEqual(serialized_data1['files'], "")
            self.assertEqual(serialized_data1['parameter'], '["--project EGI"]')
            self.assertEqual(serialized_data1['fileparameter'], "")
            self.assertFalse(mock_update.called)

    @patch('Poem.helpers.metrics_helpers.update_metric_in_schema')
    def test_update_all_metrics_on_metrictemplate_change(self, mock_update):
        mock_update.side_effect = mocked_func
        metrictemplate = admin_models.MetricTemplate.objects.get(
            name='argo.AMS-Check'
        )
        update_metrics(metrictemplate, 'argo.AMS-Check', self.probeversion1_2)
        self.assertEqual(mock_update.call_count, 2)
        mock_update.assert_has_calls([
            call(
                mt_id=metrictemplate.id, name='argo.AMS-Check',
                pk_id=self.probeversion1_2.id, schema='test', user=''
            ),
            call(
                mt_id=metrictemplate.id, name='argo.AMS-Check',
                pk_id=self.probeversion1_2.id, schema='test2', user=''
            )
        ], any_order=True)

    @patch("Poem.helpers.metrics_helpers.update_metric_in_schema")
    def test_update_all_passive_metrics_on_metrictemplate_change(
            self, mock_update
    ):
        mock_update.side_effect = mocked_func
        metrictemplate = admin_models.MetricTemplate.objects.get(
            name="org.apel.APEL-Pub"
        )
        update_metrics(metrictemplate, "org.apel.APEL-Pub", None)
        self.assertEqual(mock_update.call_count, 2)
        mock_update.assert_has_calls([
            call(
                mt_id=metrictemplate.id, name="org.apel.APEL-Pub",
                pk_id=None, schema="test", user=""
            ),
            call(
                mt_id=metrictemplate.id, name="org.apel.APEL-Pub",
                pk_id=None, schema="test2", user=""
            )
        ], any_order=True)


class MetricsInProfilesTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        with schema_context(get_public_schema_name()):
            tenant = Tenant.objects.create(
                name='public', schema_name=get_public_schema_name()
            )
            get_tenant_domain_model().objects.create(
                domain='public', tenant=tenant, is_primary=True
            )

    @patch('Poem.helpers.metrics_helpers.requests.put')
    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.WebAPIKey.objects.get')
    def test_update_metrics_in_profiles(self, mock_key, mock_get, mock_put):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = WebAPIKey(
                name='WEB-API-TENANT', token='mock_key'
            )
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
    @patch('Poem.helpers.metrics_helpers.WebAPIKey.objects.get')
    def test_update_metrics_in_profiles_wrong_token(self, mock_key, mock_get):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = WebAPIKey(
                name='WEB-API-TENANT', token='wrong_key'
            )
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
    @patch('Poem.helpers.metrics_helpers.WebAPIKey.objects.get')
    def test_update_metrics_in_profiles_if_response_empty(
            self, mock_key, mock_get, mock_put
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = WebAPIKey(
                name='WEB-API-TENANT', token='mock_key'
            )
            mock_get.side_effect = mocked_web_api_metric_profiles_empty
            msgs = update_metrics_in_profiles('metric1', 'new.metric1')
            self.assertEqual(msgs, [])
            self.assertFalse(mock_put.called)

    @patch('Poem.helpers.metrics_helpers.requests.put')
    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.WebAPIKey.objects.get')
    def test_update_metrics_in_profiles_if_same_name(
            self, mock_key, mock_get, mock_put
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = WebAPIKey(
                name='WEB-API-TENANT', token='mock_key'
            )
            mock_get.side_effect = mocked_web_api_metric_profiles
            msgs = update_metrics_in_profiles('metric1', 'metric1')
            self.assertEqual(msgs, [])
            self.assertFalse(mock_put.called)

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.WebAPIKey.objects.get')
    def test_get_metrics_in_profiles(self, mock_key, mock_get):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = WebAPIKey(
                name='WEB-API-TENANT', token='mock_key'
            )
            mock_get.side_effect = mocked_web_api_metric_profiles
            metrics = get_metrics_in_profiles(self.tenant)
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
    @patch('Poem.helpers.metrics_helpers.WebAPIKey.objects.get')
    def test_get_metrics_in_profiles_wrong_token(self, mock_key, mock_get):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = WebAPIKey(
                name='WEB-API-TENANT', token='wrong_key'
            )
            mock_get.side_effect = mocked_web_api_metric_profiles_wrong_token
            self.assertRaises(
                requests.exceptions.HTTPError,
                get_metrics_in_profiles,
                self.tenant
            )

    def test_get_metrics_in_profiles_nonexisting_key(self):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            with self.assertRaises(Exception) as context:
                get_metrics_in_profiles(self.tenant)
            self.assertEqual(
                str(context.exception),
                'Error fetching WEB API data: API key not found.'
            )

    @patch('Poem.helpers.metrics_helpers.requests.get')
    @patch('Poem.helpers.metrics_helpers.WebAPIKey.objects.get')
    def test_get_metrics_in_profiles_if_response_empty(
            self, mock_key, mock_get
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url'):
            mock_key.return_value = WebAPIKey(
                name='WEB-API-TENANT', token='mock_key'
            )
            mock_get.side_effect = mocked_web_api_metric_profiles_empty
            metrics = get_metrics_in_profiles(self.tenant)
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
    @patch('Poem.helpers.metrics_helpers.WebAPIKey.objects.get')
    def test_delete_metrics_from_profiles(
            self, mock_key, mock_profile, mock_get, mock_put
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url/'):
            mock_key.return_value = WebAPIKey(
                name='WEB-API-TENANT', token='mock_key'
            )
            mock_profile.return_value = poem_models.MetricProfiles(
                name='PROFILE1', apiid='11111111-2222-3333-4444-555555555555',
                description='First profile', groupname='TEST'
            )
            mock_get.side_effect = mocked_web_api_metric_profile
            mock_put.side_effect = mocked_web_api_metric_profile_put
            delete_metrics_from_profile(
                profile='PROFILE1', metrics=['metric3', 'metric4'],
                tenant="TENANT"
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
    @patch('Poem.helpers.metrics_helpers.WebAPIKey.objects.get')
    def test_delete_metrics_from_profiles_wrong_token(
            self, mock_key, mock_profile, mock_get
    ):
        with self.settings(WEBAPI_METRIC='https://mock.api.url/'):
            mock_key.return_value = WebAPIKey(
                name='WEB-API-TENANT', token='wrong_key'
            )
            mock_profile.return_value = poem_models.MetricProfiles(
                name='PROFILE1', apiid='11111111-2222-3333-4444-555555555555',
                description='First profile', groupname='TEST'
            )
            mock_get.side_effect = mocked_web_api_metric_profiles_wrong_token
            self.assertRaises(
                requests.exceptions.HTTPError,
                delete_metrics_from_profile,
                profile='PROFILE1', metrics=['metric3', 'metric4'],
                tenant="TENANT"
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
                profile='PROFILE1', metrics=['metric3', 'metric4'],
                tenant="TENANT"
            )
        self.assertEqual(
            str(context.exception),
            'Error deleting metric from profile: API key not found.'
        )

    def test_delete_metrics_from_profiles_missing_profile(self):
        with self.assertRaises(Exception) as context:
            delete_metrics_from_profile(
                profile='PROFILE1', metrics=['metric3', 'metric4'],
                tenant="TENANT"
            )
        self.assertEqual(
            str(context.exception),
            'Error deleting metric from profile: Profile not found.'
        )


class SyncMetricsTests(TenantTestCase):
    def setUp(self) -> None:
        self.tenant.name = "TENANT"
        self.tenant.save()
        mock_db(self.tenant)

        self.user = CustUser.objects.get(username="testuser")

    @patch("Poem.helpers.metrics_helpers.get_metrics_in_profiles")
    def test_sync_active_metrics(self, mock_get_metrics):
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="org.nagios.CertLifetime2"
        )
        metric1 = poem_models.Metric.objects.get(
            name="eu.egi.cloud.OpenStack-Swift"
        )
        metric2 = poem_models.Metric.objects.get(name="test.Metric-Template")
        self.assertEqual(len(poem_models.Metric.objects.all()), 6)
        mock_get_metrics.return_value = {
            "argo.AMS-Check": ["ARGO-MON"],
            "org.nagios.CertLifetime": ["ARGO-MON", "ARGO-MON2"],
            "org.apel.APEL-Pub": ["ARGO-MON2"],
            "org.nagios.CertLifetime2": ["ARGO-MON2"]
        }
        imported, warn, err, unavailable, deleted = sync_metrics(
            self.tenant, self.user
        )
        self.assertEqual(imported, ["org.nagios.CertLifetime2"])
        self.assertEqual(warn, [])
        self.assertEqual(err, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(
            sorted(deleted), [
                "argo.poem-tools.check",
                "eu.egi.cloud.OpenStack-Swift",
                "test.Metric-Template"
            ]
        )
        self.assertEqual(len(poem_models.Metric.objects.all()), 4)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="eu.egi.cloud.OpenStack-Swift"
        )
        self.assertEqual(len(poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        )), 0)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="test.Metric-Template"
        )
        self.assertEqual(len(poem_models.TenantHistory.objects.filter(
            object_id=metric2.id
        )), 0)
        metric = poem_models.Metric.objects.get(name="org.nagios.CertLifetime2")
        assert metric

    @patch("Poem.helpers.metrics_helpers.get_metrics_in_profiles")
    def test_sync_passive_metrics(self, mock_get_metrics):
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="eu.egi.sec.ARC-CE-result"
        )
        metric1 = poem_models.Metric.objects.get(
            name="eu.egi.cloud.OpenStack-Swift"
        )
        metric2 = poem_models.Metric.objects.get(name="test.Metric-Template")
        mock_get_metrics.return_value = {
            "argo.AMS-Check": ["ARGO-MON"],
            "org.nagios.CertLifetime": ["ARGO-MON", "ARGO-MON2"],
            "org.apel.APEL-Pub": ["ARGO-MON2"],
            "eu.egi.sec.ARC-CE-result": ["ARGO-MON2"]
        }
        imported, warn, err, unavailable, deleted = sync_metrics(
            self.tenant, self.user
        )
        self.assertEqual(imported, ["eu.egi.sec.ARC-CE-result"])
        self.assertEqual(warn, [])
        self.assertEqual(err, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(
            sorted(deleted), [
                "argo.poem-tools.check",
                "eu.egi.cloud.OpenStack-Swift",
                "test.Metric-Template"
            ]
        )
        self.assertEqual(len(poem_models.Metric.objects.all()), 4)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="eu.egi.cloud.OpenStack-Swift"
        )
        self.assertEqual(len(poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        )), 0)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="test.Metric-Template"
        )
        self.assertEqual(len(poem_models.TenantHistory.objects.filter(
            object_id=metric2.id
        )), 0)
        metric = poem_models.Metric.objects.get(name="eu.egi.sec.ARC-CE-result")
        assert metric

    @patch("Poem.helpers.metrics_helpers.get_metrics_in_profiles")
    def test_sync_metrics_with_warning(self, mock_get_metrics):
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="argo.AMSPublisher-Check"
        )
        metric1 = poem_models.Metric.objects.get(
            name="eu.egi.cloud.OpenStack-Swift"
        )
        metric2 = poem_models.Metric.objects.get(name="test.Metric-Template")
        mock_get_metrics.return_value = {
            "argo.AMS-Check": ["ARGO-MON"],
            "org.nagios.CertLifetime": ["ARGO-MON", "ARGO-MON2"],
            "org.apel.APEL-Pub": ["ARGO-MON2"],
            "argo.AMSPublisher-Check": ["ARGO-MON2"]
        }
        imported, warn, err, unavailable, deleted = sync_metrics(
            self.tenant, self.user
        )
        self.assertEqual(imported, [])
        self.assertEqual(warn, ["argo.AMSPublisher-Check"])
        self.assertEqual(err, [])
        self.assertEqual(unavailable, [])
        self.assertEqual(
            sorted(deleted), [
                "argo.poem-tools.check",
                "eu.egi.cloud.OpenStack-Swift",
                "test.Metric-Template"
            ]
        )
        self.assertEqual(len(poem_models.Metric.objects.all()), 4)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="eu.egi.cloud.OpenStack-Swift"
        )
        self.assertEqual(len(poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        )), 0)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="test.Metric-Template"
        )
        self.assertEqual(len(poem_models.TenantHistory.objects.filter(
            object_id=metric2.id
        )), 0)
        metric = poem_models.Metric.objects.get(name="argo.AMSPublisher-Check")
        assert metric

    @patch("Poem.helpers.metrics_helpers.get_metrics_in_profiles")
    def test_sync_metrics_if_version_unavailable(self, mock_get_metrics):
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="argo.AMSPublisher-Check"
        )
        metric1 = poem_models.Metric.objects.get(
            name="eu.egi.cloud.OpenStack-Swift"
        )
        metric2 = poem_models.Metric.objects.get(name="test.Metric-Template")
        mock_get_metrics.return_value = {
            "argo.AMS-Check": ["ARGO-MON"],
            "org.nagios.CertLifetime": ["ARGO-MON", "ARGO-MON2"],
            "org.apel.APEL-Pub": ["ARGO-MON2"],
            "test.MetricTemplate": ["ARGO-MON2"]
        }
        imported, warn, err, unavailable, deleted = sync_metrics(
            self.tenant, self.user
        )
        self.assertEqual(imported, [])
        self.assertEqual(warn, [])
        self.assertEqual(err, [])
        self.assertEqual(unavailable, ["test.MetricTemplate"])
        self.assertEqual(
            sorted(deleted), [
                "argo.poem-tools.check",
                "eu.egi.cloud.OpenStack-Swift",
                "test.Metric-Template"
            ]
        )
        self.assertEqual(len(poem_models.Metric.objects.all()), 3)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="eu.egi.cloud.OpenStack-Swift"
        )
        self.assertEqual(len(poem_models.TenantHistory.objects.filter(
            object_id=metric1.id
        )), 0)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="test.Metric-Template"
        )
        self.assertEqual(len(poem_models.TenantHistory.objects.filter(
            object_id=metric2.id
        )), 0)
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name="test.MetricTemplate"
        )


class CommentsTests(TenantTestCase):
    def test_new_comment_with_objects_change(self):
        comment = '[{"changed": {"fields": ["config"], ' \
                  '"object": ["maxCheckAttempts", "path", "timeout"]}}, ' \
                  '{"changed": {"fields": ["attribute"], ' \
                  '"object": ["attribute-key1", "attribute-key2"]}}, ' \
                  '{"changed": {"fields": ["dependency"], ' \
                  '"object": ["dependency-key"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Changed config fields "maxCheckAttempts", "path" and "timeout". '
            'Changed attribute fields "attribute-key1" and "attribute-key2". '
            'Changed dependency field "dependency-key".'
        )

    def test_new_comment_with_objects_add(self):
        comment = '[{"added": {"fields": ["config"], ' \
                  '"object": ["maxCheckAttempts", "path", "timeout"]}}, ' \
                  '{"added": {"fields": ["attribute"], ' \
                  '"object": ["attribute-key1", "attribute-key2"]}}, ' \
                  '{"added": {"fields": ["dependency"], ' \
                  '"object": ["dependency-key"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Added config fields "maxCheckAttempts", "path" and "timeout". '
            'Added attribute fields "attribute-key1" and "attribute-key2". '
            'Added dependency field "dependency-key".'
        )

    def test_new_comment_with_objects_delete(self):
        comment = '[{"deleted": {"fields": ["config"], ' \
                  '"object": ["maxCheckAttempts", "path", "timeout"]}}, ' \
                  '{"deleted": {"fields": ["attribute"], ' \
                  '"object": ["attribute-key1", "attribute-key2"]}}, ' \
                  '{"deleted": {"fields": ["dependency"], ' \
                  '"object": ["dependency-key"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Deleted config fields "maxCheckAttempts", "path" and "timeout". '
            'Deleted attribute fields "attribute-key1" and "attribute-key2". '
            'Deleted dependency field "dependency-key".'
        )

    def test_new_comment_with_fields(self):
        comment = '[{"added": {"fields": ["docurl", "comment"]}}, ' \
                  '{"changed": {"fields": ["name", "probeexecutable", ' \
                  '"group"]}}, ' \
                  '{"deleted": {"fields": ["version", "description"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Added docurl and comment. '
            'Changed name, probeexecutable and group. '
            'Deleted version and description.'
        )

    def test_new_comment_initial(self):
        comment = 'Initial version.'
        self.assertEqual(new_comment(comment), 'Initial version.')

    def test_new_comment_no_changes(self):
        comment = '[]'
        self.assertEqual(new_comment(comment), 'No fields changed.')

    def test_new_comment_for_thresholds_profiles_rules_field(self):
        comment = '[{"changed": {"fields": ["rules"], ' \
                  '"object": ["metricA"]}}, ' \
                  '{"deleted": {"fields": ["rules"], ' \
                  '"object": ["metricB"]}}, ' \
                  '{"added": {"fields": ["rules"], "object": ["metricC"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Changed rule for metric "metricA". '
            'Deleted rule for metric "metricB". '
            'Added rule for metric "metricC".'
        )

    def test_new_comment_for_metric_profile_metricinstances(self):
        comment = '[{"added": {"fields": ["metricinstances"], ' \
                  '"object": ["ARC-CE", "org.nordugrid.ARC-CE-IGTF"]}}, ' \
                  '{"deleted": {"fields": ["metricinstances"], ' \
                  '"object": ["APEL", "org.apel.APEL-Sync"]}}]'
        self.assertEqual(
            new_comment(comment),
            'Added service-metric instance tuple '
            '(ARC-CE, org.nordugrid.ARC-CE-IGTF). '
            'Deleted service-metric instance tuple '
            '(APEL, org.apel.APEL-Sync).'
        )


class CombinedTenantTests(TenantTestCase):
    def setUp(self) -> None:
        self.tenant.name = "TENANT"
        self.tenant.save()
        self.combined_tenant = CombinedTenant(self.tenant)

    @patch("Poem.helpers.tenant_helpers.requests.get")
    @patch("Poem.helpers.tenant_helpers.WebAPIKey.objects.get")
    def test_get_combined_tenants(self, mock_key, mock_get):
        with self.settings(WEBAPI_DATAFEEDS="https://mock.api.url/feeds/data"):
            mock_key.return_value = WebAPIKey(
                name="WEB-API-TENANT", token="t0k3n"
            )
            mock_get.side_effect = mocked_web_api_data_feed
            tenants = self.combined_tenant.tenants()
            mock_get.assert_called_once_with(
                "https://mock.api.url/feeds/data",
                headers={"Accept": "application/json", "x-api-key": "t0k3n"},
                timeout=20
            )
            self.assertEqual(tenants, ["TENANT_X", "TENANT_Y"])

    @patch("Poem.helpers.tenant_helpers.requests.get")
    @patch("Poem.helpers.tenant_helpers.WebAPIKey.objects.get")
    def test_get_combined_tenants_webapi_exception(self, mock_key, mock_get):
        with self.settings(WEBAPI_DATAFEEDS="https://mock.api.url/feeds/data"):
            mock_key.return_value = WebAPIKey(
                name="WEB-API-TENANT", token="t0k3n"
            )
            mock_get.side_effect = mocked_web_api_data_feed_wrong_token
            tenants = self.combined_tenant.tenants()
            mock_get.assert_called_once_with(
                "https://mock.api.url/feeds/data",
                headers={"Accept": "application/json", "x-api-key": "t0k3n"},
                timeout=20
            )
            self.assertEqual(tenants, [])

    @patch("Poem.helpers.tenant_helpers.requests.get")
    def test_get_combined_tenants_key_doesnotexist(self, mock_get):
        with self.settings(WEBAPI_DATAFEEDS="https://mock.api.url/feeds/data"):
            mock_get.side_effect = mocked_web_api_data_feed_wrong_token
            tenants = self.combined_tenant.tenants()
            self.assertFalse(mock_get.called)
            self.assertEqual(tenants, [])
