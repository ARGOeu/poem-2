import datetime
import json
from unittest.mock import patch, call

import factory
from Poem.api import views
from Poem.api.models import MyAPIKey
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from django.core import mail
from django.db.models.signals import post_save, pre_save
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from rest_framework import status


def mock_function(*args):
    if args[0] == 'ARGO-MON':
        return {'argo.AMS-Check'}

    if args[0] == 'MON-TEST':
        return {
            'argo.AMS-Check', 'eu.seadatanet.org.downloadmanager-check',
            'eu.seadatanet.org.nvs2-check'
        }

    if args[0] == 'MON-PASSIVE':
        return {
            'argo.AMS-Check', 'eu.seadatanet.org.downloadmanager-check',
            'eu.seadatanet.org.nvs2-check', 'org.apel.APEL-Pub'
        }

    if args[0] == 'EMPTY':
        return set()

    if args[0] == 'TEST-NONEXISTING':
        return {'nonexisting.metric'}

    if args[0] == 'TEST_PROMOO':
        return {'eu.egi.cloud.OCCI-Categories'}


@factory.django.mute_signals(pre_save, post_save)
def mock_db_for_metrics_tests():
    active = admin_models.MetricTemplateType.objects.create(name='Active')
    passive = admin_models.MetricTemplateType.objects.create(name='Passive')

    tag = admin_models.OSTag.objects.create(name='CentOS 6')
    repo = admin_models.YumRepo.objects.create(name='repo-1', tag=tag)

    package1 = admin_models.Package.objects.create(
        name='nagios-plugins-argo',
        version='0.1.12'
    )
    package1.repos.add(repo)

    package2 = admin_models.Package.objects.create(
        name='nagios-plugins-cert',
        version='1.0.0'
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
        datetime=datetime.datetime.now(),
        user='testuser'
    )

    probe2 = admin_models.Probe.objects.create(
        name='ams-publisher-probe',
        package=package1,
        description='Probe is inspecting AMS publisher.',
        comment='Initial version.',
        repository='https://github.com/ARGOeu/nagios-plugins-argo',
        docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
               'README.md',
        datetime=datetime.datetime.now(),
        user='testuser'
    )

    probe3 = admin_models.Probe.objects.create(
        name='CertLifetime-probe',
        package=package2,
        description='Nagios plugin for checking X509 certificate lifetime.',
        comment='Initial version.',
        repository='https://github.com/ARGOeu/nagios-plugins-cert',
        docurl='https://wiki.egi.eu/wiki/ROC_SAM_Tests#hr.srce.CREAMCE-'
               'CertLifetime',
        datetime=datetime.datetime.now(),
        user='testuser'
    )

    probekey1 = admin_models.ProbeHistory.objects.create(
        object_id=probe1,
        name=probe1.name,
        package=probe1.package,
        description=probe1.description,
        comment=probe1.comment,
        repository=probe1.repository,
        docurl=probe1.docurl,
        version_comment='Initial version.',
        version_user='testuser'
    )

    probekey2 = admin_models.ProbeHistory.objects.create(
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

    probekey3 = admin_models.ProbeHistory.objects.create(
        object_id=probe3,
        name=probe3.name,
        package=probe3.package,
        description=probe3.description,
        comment=probe3.comment,
        repository=probe3.repository,
        docurl=probe3.docurl,
        version_comment='Initial version.',
        version_user='testuser'
    )

    group = poem_models.GroupOfMetrics.objects.create(name='EOSC')

    mtag1 = admin_models.MetricTags.objects.create(name='test_tag1')
    mtag2 = admin_models.MetricTags.objects.create(name='test_tag2')
    mtag3 = admin_models.MetricTags.objects.create(name='internal')
    admin_models.MetricTags.objects.create(name='empty_tag')

    mt1 = admin_models.MetricTemplate.objects.create(
        name='test.AMS-Check',
        mtype=active,
        probekey=probekey1,
        parent='["org.nagios.CDMI-TCP"]',
        probeexecutable='["ams-probe"]',
        config='["maxCheckAttempts 3", "timeout 60", '
               '"path /usr/libexec/argo-monitoring/probes/argo", "interval 5", '
               '"retryInterval 3"]',
        attribute='["argo.ams_TOKEN --token"]',
        dependency='["argo.AMS-Check 1"]',
        flags='["OBSESS 1"]',
        parameter='["--project EGI"]'
    )
    mt1.tags.add(mtag1, mtag2)

    mt1_version1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=mt1,
        name=mt1.name,
        mtype=mt1.mtype,
        probekey=mt1.probekey,
        parent=mt1.parent,
        description=mt1.description,
        probeexecutable=mt1.probeexecutable,
        config=mt1.config,
        attribute=mt1.attribute,
        dependency=mt1.dependency,
        flags=mt1.flags,
        parameter=mt1.parameter,
        date_created=datetime.datetime.now(),
        version_user="poem",
        version_comment="Initial version."
    )
    mt1_version1.tags.add(mtag1, mtag2)

    poem_models.Metric.objects.create(
        name='test.AMS-Check',
        group=group,
        probeversion=probekey1.__str__(),
        config='["maxCheckAttempts 3", "timeout 60", '
               '"path /usr/libexec/argo-monitoring/probes/argo", "interval 5", '
               '"retryInterval 3"]'
    )

    mt2 = admin_models.MetricTemplate.objects.create(
        name='argo.AMSPublisher-Check',
        mtype=active,
        probekey=probekey2,
        probeexecutable='["ams-publisher-probe"]',
        config='["maxCheckAttempts 1", "timeout 120", '
               '"path /usr/libexec/argo-monitoring/probes/argo", '
               '"interval 180", "retryInterval 1"]',
        parameter='["-s /var/run/argo-nagios-ams-publisher/sock", '
                  '"-q w:metrics+g:published180"]',
        flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]'
    )
    mt2.tags.add(mtag1, mtag3)

    mt2_version1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=mt2,
        name=mt2.name,
        mtype=mt2.mtype,
        probekey=mt2.probekey,
        parent=mt2.parent,
        description=mt2.description,
        probeexecutable=mt2.probeexecutable,
        config=mt2.config,
        attribute=mt2.attribute,
        dependency=mt2.dependency,
        flags=mt2.flags,
        parameter=mt2.parameter,
        date_created=datetime.datetime.now(),
        version_user="poem",
        version_comment="Initial version."
    )
    mt2_version1.tags.add(mtag1, mtag3)

    poem_models.Metric.objects.create(
        name='argo.AMSPublisher-Check',
        group=group,
        probeversion=probekey2.__str__(),
        config='["maxCheckAttempts 1", "timeout 120", '
               '"path /usr/libexec/argo-monitoring/probes/argo", '
               '"interval 180", "retryInterval 1"]'
    )

    mt3 = admin_models.MetricTemplate.objects.create(
        name='hr.srce.CertLifetime-Local',
        mtype=active,
        probekey=probekey3,
        probeexecutable='["CertLifetime-probe"]',
        config='["maxCheckAttempts 2", "timeout 60", '
               '"path /usr/libexec/argo-monitoring/probes/cert", '
               '"interval 240", "retryInterval 30"]',
        attribute='["NAGIOS_HOST_CERT -f"]',
        flags='["NOHOSTNAME 1", "NOPUBLISH 1"]'
    )
    mt3.tags.add(mtag3)

    mt3_version1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=mt3,
        name=mt3.name,
        mtype=mt3.mtype,
        probekey=mt3.probekey,
        parent=mt3.parent,
        description=mt3.description,
        probeexecutable=mt3.probeexecutable,
        config=mt3.config,
        attribute=mt3.attribute,
        dependency=mt3.dependency,
        flags=mt3.flags,
        parameter=mt3.parameter,
        date_created=datetime.datetime.now(),
        version_user="poem",
        version_comment="Initial version."
    )
    mt3_version1.tags.add(mtag3)

    poem_models.Metric.objects.create(
        name='hr.srce.CertLifetime-Local',
        group=group,
        probeversion=probekey3.__str__(),
        config='["maxCheckAttempts 2", "timeout 60", '
               '"path /usr/libexec/argo-monitoring/probes/cert", '
               '"interval 240", "retryInterval 30"]'
    )

    mt4 = admin_models.MetricTemplate.objects.create(
        name='org.apel.APEL-Pub',
        mtype=passive,
        flags='["OBSESS 1", "PASSIVE 1"]'
    )

    admin_models.MetricTemplateHistory.objects.create(
        object_id=mt4,
        name=mt4.name,
        mtype=mt4.mtype,
        probekey=mt4.probekey,
        parent=mt4.parent,
        description=mt4.description,
        probeexecutable=mt4.probeexecutable,
        config=mt4.config,
        attribute=mt4.attribute,
        dependency=mt4.dependency,
        flags=mt4.flags,
        parameter=mt4.parameter,
        date_created=datetime.datetime.now(),
        version_user="poem",
        version_comment="Initial version."
    )

    poem_models.Metric.objects.create(
        name='org.apel.APEL-Pub',
        group=group
    )

    mt5 = admin_models.MetricTemplate.objects.create(
        name='test.EMPTY-metric',
        mtype=active
    )

    admin_models.MetricTemplateHistory.objects.create(
        object_id=mt5,
        name=mt5.name,
        mtype=mt5.mtype,
        probekey=mt5.probekey,
        parent=mt5.parent,
        description=mt5.description,
        probeexecutable=mt5.probeexecutable,
        config=mt5.config,
        attribute=mt5.attribute,
        dependency=mt5.dependency,
        flags=mt5.flags,
        parameter=mt5.parameter,
        date_created=datetime.datetime.now(),
        version_user="poem",
        version_comment="Initial version."
    )

    poem_models.Metric.objects.create(
        name='test.EMPTY-metric'
    )

    poem_models.MetricConfiguration.objects.create(
        name="local",
        globalattribute=json.dumps(
            [
                "NAGIOS_ACTUAL_HOST_CERT /etc/nagios/globus/hostcert.pem",
                "NAGIOS_ACTUAL_HOST_KEY /etc/nagios/globus/hostkey.pem"
            ]
        ),
        hostattribute=json.dumps(["mock.host.name attr1 some-new-value"]),
        metricparameter=json.dumps(
            [
                "eosccore.ui.argo.grnet.gr org.nagios.ARGOWeb-AR "
                "-r EOSC_Monitoring",
                "argo.eosc-portal.eu org.nagios.ARGOWeb-Status -u "
                "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
            ]
        )
    )

    poem_models.MetricConfiguration.objects.create(
        name="consumer",
        globalattribute="",
        hostattribute="",
        metricparameter=json.dumps([
            "eosccore.mon.devel.argo.grnet.gr argo.AMSPublisher-Check "
            "-q w:metrics+g:published180 -c 10"
        ])
    )


@factory.django.mute_signals(pre_save, post_save)
def mock_db_for_repos_tests():
    tag1 = admin_models.OSTag.objects.create(name='CentOS 6')
    tag2 = admin_models.OSTag.objects.create(name='CentOS 7')
    tag3 = admin_models.OSTag.objects.create(name="Rocky 9")

    repo1 = admin_models.YumRepo.objects.create(
        name='repo-1',
        tag=tag1,
        content='content1\ncontent2\n',
        description='For CentOS 6'
    )

    repo2 = admin_models.YumRepo.objects.create(
        name='repo-1',
        tag=tag2,
        content='content3\ncontent4\n',
        description='For CentOS 7'
    )

    repo3 = admin_models.YumRepo.objects.create(
        name='repo-2',
        tag=tag1,
        content='content5\ncontent6',
        description='CentOS 6'
    )

    repo4 = admin_models.YumRepo.objects.create(
        name='repo-2',
        tag=tag2,
        content='content7\ncontent8',
        description='CentOS 7'
    )

    repo5 = admin_models.YumRepo.objects.create(
        name='promoo',
        tag=tag1,
        content='content9\ncontent10',
        description='promoo for CentOS 6'
    )

    repo6 = admin_models.YumRepo.objects.create(
        name='promoo',
        tag=tag2,
        content='content11\ncontent12',
        description='promoo for CentOS 7'
    )

    repo7 = admin_models.YumRepo.objects.create(
        name="repo-1",
        tag=tag3,
        content="content13\ncontent14",
        description="Rocky 9"
    )

    repo8 = admin_models.YumRepo.objects.create(
        name="repo-2",
        tag=tag3,
        content="content15\ncontent16",
        description="Repo 2 for Rocky 9"
    )

    package1 = admin_models.Package.objects.create(
        name='nagios-plugins-argo',
        version='0.1.11'
    )
    package1.repos.add(repo1, repo2, repo7)

    package2 = admin_models.Package.objects.create(
        name='nagios-plugins-http',
        version='2.2.2',
        use_present_version=True
    )
    package2.repos.add(repo3, repo4, repo8)

    package3 = admin_models.Package.objects.create(
        name='nagios-plugins-seadatacloud-nvs2',
        version='1.0.1'
    )
    package3.repos.add(repo2)

    package4 = admin_models.Package.objects.create(
        name='nagios-promoo',
        version='1.4.0'
    )
    package4.repos.add(repo5)

    package5 = admin_models.Package.objects.create(
        name='nagios-promoo',
        version='1.7.1'
    )
    package5.repos.add(repo6)

    package6 = admin_models.Package.objects.create(
        name='nagios-plugins-nagiosexchange',
        version='1.0.0'
    )
    package6.repos.add(repo2, repo8)

    probe1 = admin_models.Probe.objects.create(
        name='ams-probe',
        package=package1,
        repository='https://github.com/ARGOeu/nagios-plugins-argo',
        docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
               'README.md',
        description='Probe is inspecting AMS service.',
        comment='Initial version.',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probe2 = admin_models.Probe.objects.create(
        name='ams-publisher-probe',
        package=package1,
        repository='https://github.com/ARGOeu/nagios-plugins-argo',
        docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
               'README.md',
        description='Probe is inspecting AMS publisher running on Nagios '
                    'monitoring instances.',
        comment='Initial version.',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probe3 = admin_models.Probe.objects.create(
        name='check_http',
        package=package2,
        repository='https://nagios-plugins.org',
        docurl='http://nagios-plugins.org/doc/man/check_http.html',
        description='This plugin tests the HTTP service on the specified host.',
        comment='Initial version.',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probe4 = admin_models.Probe.objects.create(
        name='seadatacloud-nvs2',
        package=package3,
        repository='https://github.com/ARGOeu/nagios-plugins-seadatacloud-nvs2/'
                   'tree/devel',
        docurl='https://github.com/ARGOeu/nagios-plugins-seadatacloud-nvs2/'
               'tree/devel',
        description='Nagios plugin.',
        comment='Initial version.',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probe5 = admin_models.Probe.objects.create(
        name='nagios-promoo.occi.categories',
        package=package4,
        repository='https://github.com/EGI-Foundation/nagios-promoo',
        docurl='https://wiki.egi.eu/wiki/Cloud_SAM_tests',
        description='Probe checks the existence of OCCI Infra kinds.',
        comment='Initial version',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probe6 = admin_models.Probe.objects.create(
        name='check_dirsize',
        package=package6,
        repository='https://github.com/ARGOeu/nagios-plugins-nagiosexchange',
        docurl='https://exchange.nagios.org/directory/Plugins/Operating-Systems'
               '/Linux/CheckDirSize/details',
        description='This plugin determines the size of a directory.',
        comment='Initial version',
        user='testuser',
        datetime=datetime.datetime.now()
    )

    probehistory1 = admin_models.ProbeHistory.objects.create(
        object_id=probe1,
        name=probe1.name,
        package=probe1.package,
        repository=probe1.repository,
        docurl=probe1.docurl,
        description=probe1.description,
        comment=probe1.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    probehistory2 = admin_models.ProbeHistory.objects.create(
        object_id=probe2,
        name=probe2.name,
        package=probe2.package,
        repository=probe2.repository,
        docurl=probe2.docurl,
        description=probe2.description,
        comment=probe2.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    probehistory3 = admin_models.ProbeHistory.objects.create(
        object_id=probe3,
        name=probe3.name,
        package=probe3.package,
        repository=probe3.repository,
        docurl=probe3.docurl,
        description=probe3.description,
        comment=probe3.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    probehistory4 = admin_models.ProbeHistory.objects.create(
        object_id=probe4,
        name=probe4.name,
        package=probe4.package,
        repository=probe4.repository,
        docurl=probe4.docurl,
        description=probe4.description,
        comment=probe4.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    probehistory5 = admin_models.ProbeHistory.objects.create(
        object_id=probe5,
        name=probe5.name,
        package=probe5.package,
        repository=probe5.repository,
        docurl=probe5.docurl,
        description=probe5.description,
        comment=probe5.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user='testuser'
    )

    probe5.package = package5
    probe5.save()

    probehistory6 = admin_models.ProbeHistory.objects.create(
        object_id=probe5,
        name=probe5.name,
        package=probe5.package,
        repository=probe5.repository,
        docurl=probe5.docurl,
        description=probe5.description,
        comment=probe5.comment,
        date_created=datetime.datetime.now(),
        version_comment='["changed": {"fields": ["package"]}]',
        version_user='testuser'
    )

    probehistory7 = admin_models.ProbeHistory.objects.create(
        object_id=probe6,
        name=probe6.name,
        package=probe6.package,
        repository=probe6.repository,
        docurl=probe6.docurl,
        description=probe6.description,
        comment=probe6.comment,
        date_created=datetime.datetime.now(),
        version_comment='Initial version',
        version_user='testuser'
    )

    mtype1 = admin_models.MetricTemplateType.objects.create(name='Active')
    mtype2 = admin_models.MetricTemplateType.objects.create(name='Passive')

    mtag1 = admin_models.MetricTags.objects.create(name='internal')
    mtag2 = admin_models.MetricTags.objects.create(name='tag1')

    mt1 = admin_models.MetricTemplate.objects.create(
        name='argo.AMS-Check',
        probekey=probehistory1,
        mtype=mtype1,
        probeexecutable='["ams-probe"]',
        config='["maxCheckAttempts 3", "timeout  60", '
               '"path /usr/libexec/argo-monitoring/probes/argo", '
               '"interval 5", "retryInterval 3"]',
        attribute='["argo.ams_TOKEN --token"]',
        parameter='["--project EGI"]',
        flags='["OBSESS 1"]'
    )

    mt2 = admin_models.MetricTemplate.objects.create(
        name='argo.AMSPublisher-Check',
        probekey=probehistory2,
        mtype=mtype1,
        probeexecutable='["ams-publisher-probe"]',
        config='["maxCheckAttempts 1", "timeout 120", '
               '"path /usr/libexec/argo-monitoring/probes/argo",'
               '"interval 180", "retryInterval 1"]',
        flags='["NOHOSTNAME 1", "NOTIMEOUT 1"]'
    )
    mt2.tags.add(mtag1)

    mt3 = admin_models.MetricTemplate.objects.create(
        name='eu.seadatanet.org.downloadmanager-check',
        probekey=probehistory3,
        mtype=mtype1,
        probeexecutable='["check_http"]',
        config='["maxCheckAttempts 3", "timeout 30", '
               '"path $USER1$", "interval 5", "retryInterval 3"]',
        attribute='["dm_path -u"]',
        parameter='["-f follow", "-s OK"]',
        flags='["PNP 1", "OBSESS 1"]'
    )
    mt3.tags.add(mtag2)

    mt4 = admin_models.MetricTemplate.objects.create(
        name='eu.seadatanet.org.nvs2-check',
        probekey=probehistory4,
        mtype=mtype1,
        probeexecutable='["seadatacloud-nvs2.sh"]',
        config='["interval 10", "maxCheckAttempts 3", '
               '"path /usr/libexec/argo-monitoring/probes/seadatacloud-nvs2/",'
               '"retryInterval 3", "timeout 30"]',
        attribute='["voc_collection -u"]'
    )
    mt4.tags.add(mtag2)

    mt5 = admin_models.MetricTemplate.objects.create(
        name='org.apel.APEL-Pub',
        mtype=mtype2,
        flags='["OBSESS 1", "PASSIVE 1"]'
    )

    mt6 = admin_models.MetricTemplate.objects.create(
        name='eu.egi.cloud.OCCI-Categories',
        probekey=probehistory6,
        mtype=mtype1,
        probeexecutable='["nagios-promoo occi categories"]',
        config='["maxCheckAttempts 2", "path /opt/nagios-promoo/bin", '
               '"interval 60", "retryInterval 15"]',
        attribute='["OCCI_URL --endpoint", "X509_USER_PROXY --token"]',
        dependency='["org.nagios.OCCI-TCP 1", "hr.srce.GridProxy-Valid 0"]',
        parameter='["-t 300", "--check-location 0"]',
        flags='["OBSESS 1", "NOHOSTNAME 1", "NOTIMEOUT 1", "VO 1"]'
    )

    mt7 = admin_models.MetricTemplate.objects.create(
        name='org.nagios.AmsDirSize',
        probekey=probehistory7,
        mtype=mtype1,
        probeexecutable='["check_dirsize.sh"]',
        config='["maxCheckAttempts 3", "timeout 15", '
               '"path /usr/libexec/argo-monitoring/probes/nagiosexchange", '
               '"interval 60", "retryInterval 5"]',
        parameter='["-d /var/spool/argo-nagios-ams-publisher", "-w 10000", '
                  '"-c 100000", "-f 0"]',
        flags='["NOHOSTNAME 1", "NOPUBLISH 1"]'
    )
    mt7.tags.add(mtag1)

    group = poem_models.GroupOfMetrics.objects.create(name='TEST')

    poem_models.Metric.objects.create(
        name=mt1.name,
        group=group,
        probeversion=mt1.probekey.__str__(),
        config=mt1.config
    )

    poem_models.Metric.objects.create(
        name=mt2.name,
        group=group,
        probeversion=mt2.probekey.__str__(),
        config=mt2.config
    )

    poem_models.Metric.objects.create(
        name=mt3.name,
        group=group,
        probeversion=mt3.probekey.__str__(),
        config=mt3.config
    )

    poem_models.Metric.objects.create(
        name=mt4.name,
        group=group,
        probeversion=mt4.probekey.__str__(),
        config=mt4.config
    )

    poem_models.Metric.objects.create(
        name=mt5.name,
        group=group,
        probeversion=None,
        config=mt5.config
    )

    poem_models.Metric.objects.create(
        name=mt6.name,
        group=group,
        probeversion=probehistory5.__str__(),
        config=mt6.config
    )

    poem_models.Metric.objects.create(
        name=mt7.name,
        group=group,
        probeversion=probehistory7.__str__(),
        config=mt7.config
    )


def create_credentials():
    obj, key = MyAPIKey.objects.create_key(name='EGI')
    return obj.token


class ListMetricsAPIViewTests(TenantTestCase):
    def setUp(self):
        self.token = create_credentials()
        self.view = views.ListMetrics.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = '/api/v2/metrics'

        mock_db_for_metrics_tests()

    def test_list_metrics_if_wrong_token(self):
        request = self.factory.get(
            self.url, **{'HTTP_X_API_KEY': 'wrong_token'}
        )
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_metrics(self):
        request = self.factory.get(self.url, **{'HTTP_X_API_KEY': self.token})
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'argo.AMSPublisher-Check': {
                        'probe': 'ams-publisher-probe',
                        'tags': ['internal', 'test_tag1'],
                        'config': {
                            'maxCheckAttempts': '1',
                            'timeout': '120',
                            'path': '/usr/libexec/argo-monitoring/probes/argo',
                            'interval': '180',
                            'retryInterval': '1'
                        },
                        'flags': {
                            'NOHOSTNAME': '1',
                            'NOTIMEOUT': '1',
                            'NOPUBLISH': '1'
                        },
                        'dependency': {},
                        'attribute': {},
                        'parameter': {
                            '-s': '/var/run/argo-nagios-ams-publisher/sock',
                            '-q': 'w:metrics+g:published180'
                        },
                        'parent': '',
                        'docurl':
                            'https://github.com/ARGOeu/nagios-plugins-argo'
                            '/blob/master/README.md'
                    }
                },
                {
                    'hr.srce.CertLifetime-Local': {
                        'probe': 'CertLifetime-probe',
                        'tags': ['internal'],
                        'config': {
                            'maxCheckAttempts': '2',
                            'timeout': '60',
                            'path': '/usr/libexec/argo-monitoring/probes/cert',
                            'interval': '240',
                            'retryInterval': '30'
                        },
                        'flags': {
                            'NOHOSTNAME': '1',
                            'NOPUBLISH': '1'
                        },
                        'dependency': {},
                        'attribute': {
                            'NAGIOS_HOST_CERT': '-f'
                        },
                        'parameter': {},
                        'parent': '',
                        'docurl':
                            'https://wiki.egi.eu/wiki/ROC_SAM_Tests#hr.srce.'
                            'CREAMCE-CertLifetime'
                    }
                },
                {
                    'org.apel.APEL-Pub': {
                        'probe': '',
                        'tags': [],
                        'config': {},
                        'flags': {
                            'OBSESS': '1',
                            'PASSIVE': '1'
                        },
                        'dependency': {},
                        'attribute': {},
                        'parameter': {},
                        'parent': '',
                        'docurl': ''
                    }
                },
                {
                    'test.AMS-Check': {
                        'probe': 'ams-probe',
                        'tags': ['test_tag1', 'test_tag2'],
                        'config': {
                            'maxCheckAttempts': '3',
                            'timeout': '60',
                            'path': '/usr/libexec/argo-monitoring/probes/argo',
                            'interval': '5',
                            'retryInterval': '3'
                        },
                        'flags': {
                            'OBSESS': '1'
                        },
                        'dependency': {
                            'argo.AMS-Check': '1'
                        },
                        'attribute': {
                            'argo.ams_TOKEN': '--token'
                        },
                        'parameter': {
                            '--project': 'EGI'
                        },
                        'parent': 'org.nagios.CDMI-TCP',
                        'docurl':
                            'https://github.com/ARGOeu/nagios-plugins-argo'
                            '/blob/master/README.md'
                    }
                },
                {
                    'test.EMPTY-metric': {
                        'probe': '',
                        'tags': [],
                        'config': {},
                        'flags': {},
                        'dependency': {},
                        'attribute': {},
                        'parameter': {},
                        'parent': '',
                        'docurl': ''
                    }
                }
            ]
        )

    def test_get_internal_metrics(self):
        request = self.factory.get(
            self.url + '/internal', **{'HTTP_X_API_KEY': self.token}
        )
        response = self.view(request, 'internal')
        self.assertEqual(
            response.data,
            ['argo.AMSPublisher-Check', 'hr.srce.CertLifetime-Local']
        )

    def test_get_metrics_if_no_tagged_metrics(self):
        request = self.factory.get(
            self.url + '/empty_tag', **{'HTTP_X_API_KEY': self.token}
        )
        response = self.view(request, 'empty_tag')
        self.assertEqual(response.data, [])

    def test_get_metrics_if_nonexistent_tag(self):
        request = self.factory.get(
            self.url + '/nonexistent', **{'HTTP_X_API_KEY': self.token}
        )
        response = self.view(request, 'nonexistent')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Requested tag not found.'})


class ListReposAPIViewTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        self.token = create_credentials()
        self.view = views.ListRepos.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = '/api/v2/repos'

        mock_db_for_repos_tests()

    def test_list_repos_if_wrong_token(self):
        request = self.factory.get(
            self.url + '/centos7',
            **{'HTTP_X_API_KEY': 'wrong_token',
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST]'}
        )
        request.tenant = self.tenant
        response = self.view(request, 'centos7')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('Poem.api.views.get_metrics_from_profile')
    def test_list_repos(self, mock_get_metrics):
        mock_get_metrics.side_effect = mock_function
        request = self.factory.get(
            self.url + '/centos7',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST]'}
        )
        request.tenant = self.tenant
        response = self.view(request, 'centos7')
        test_data = response.data
        test_data['data']['repo-1']['packages'] = sorted(
            test_data['data']['repo-1']['packages'], key=lambda k: k['name']
        )
        self.assertEqual(mock_get_metrics.call_count, 2)
        mock_get_metrics.assert_has_calls([
            call('ARGO-MON', "TENANT"), call('MON-TEST', "TENANT")
        ])
        self.assertEqual(
            test_data,
            {
                'data': {
                    'repo-1': {
                        'content': 'content3\ncontent4\n',
                        'packages': [
                            {
                                'name': 'nagios-plugins-argo',
                                'version': '0.1.11'
                            },
                            {
                                'name': 'nagios-plugins-seadatacloud-nvs2',
                                'version': '1.0.1'
                            }
                        ]
                    },
                    'repo-2': {
                        'content': 'content7\ncontent8',
                        'packages': [
                            {
                                'name': 'nagios-plugins-http',
                                'version': 'present'
                            }
                        ]
                    }
                },
                'missing_packages': []
            }
        )

    @patch('Poem.api.views.get_metrics_from_profile')
    def test_list_repos_new_tag(self, mock_get_metrics):
        mock_get_metrics.side_effect = mock_function
        request = self.factory.get(
            self.url + '/rocky9',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST]'}
        )
        request.tenant = self.tenant
        response = self.view(request, 'rocky9')
        self.assertEqual(mock_get_metrics.call_count, 2)
        mock_get_metrics.assert_has_calls([
            call('ARGO-MON', "TENANT"), call('MON-TEST', "TENANT")
        ])
        self.assertEqual(
            response.data,
            {
                'data': {
                    'repo-1': {
                        'content': 'content13\ncontent14',
                        'packages': [
                            {
                                'name': 'nagios-plugins-argo',
                                'version': '0.1.11'
                            }
                        ]
                    },
                    'repo-2': {
                        'content': 'content15\ncontent16',
                        'packages': [
                            {
                                "name": "nagios-plugins-http",
                                "version": "present"
                            }
                        ]
                    }
                },
                'missing_packages': ["nagios-plugins-seadatacloud-nvs2 (1.0.1)"]
            }
        )

    def test_list_repos_if_no_profile_or_tag(self):
        request = self.factory.get(
            self.url,
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST]'}
        )
        request.tenant = self.tenant
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'You must define OS!'}
        )

    def test_list_repos_if_no_profile_defined(self):
        request = self.factory.get(
            self.url + '/centos7', **{'HTTP_X_API_KEY': self.token}
        )
        request.tenant = self.tenant
        response = self.view(request, 'centos7')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'You must define profile!'}
        )

    @patch('Poem.api.views.get_metrics_from_profile')
    def test_list_repos_if_passive_metric_present(self, mock_get_metrics):
        mock_get_metrics.side_effect = mock_function
        request = self.factory.get(
            self.url + '/centos6',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[ARGO-MON, MON-PASSIVE]'}
        )
        request.tenant = self.tenant
        response = self.view(request, 'centos6')
        self.assertEqual(mock_get_metrics.call_count, 2)
        mock_get_metrics.assert_has_calls(
            [call('ARGO-MON', "TENANT"), call('MON-PASSIVE', "TENANT")]
        )
        self.assertEqual(
            response.data,
            {
                'data': {
                    'repo-1': {
                        'content': 'content1\ncontent2\n',
                        'packages': [
                            {
                                'name': 'nagios-plugins-argo',
                                'version': '0.1.11'
                            }
                        ]
                    },
                    'repo-2': {
                        'content': 'content5\ncontent6',
                        'packages': [
                            {
                                'name': 'nagios-plugins-http',
                                'version': 'present'
                            }
                        ]
                    }
                },
                'missing_packages': [
                    'nagios-plugins-seadatacloud-nvs2 (1.0.1)'
                ]
            }
        )

    @patch('Poem.api.views.get_metrics_from_profile')
    def test_empty_repo_list(self, mock_get_metrics):
        mock_get_metrics.side_effect = mock_function
        request = self.factory.get(
            self.url + '/centos6',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[EMPTY]'}
        )
        request.tenant = self.tenant
        response = self.view(request, 'centos6')
        mock_get_metrics.assert_called_once()
        mock_get_metrics.assert_called_with('EMPTY', "TENANT")
        self.assertEqual(
            response.data,
            {
                'data': {},
                'missing_packages': []
            }
        )

    @patch('Poem.api.views.get_metrics_from_profile')
    def test_list_repos_if_nonexisting_tag(self, mock_get_metrics):
        mock_get_metrics.side_effect = mock_function
        request = self.factory.get(
            self.url + '/nonexisting',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST]'}
        )
        request.tenant = self.tenant
        response = self.view(request, 'nonexisting')
        self.assertEqual(mock_get_metrics.call_count, 2)
        mock_get_metrics.assert_has_calls([
            call('ARGO-MON', "TENANT"), call('MON-TEST', "TENANT")
        ])
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {'detail': 'YUM repo tag not found.'}
        )

    @patch('Poem.api.views.get_metrics_from_profile')
    def test_list_repos_if_function_return_metric_does_not_exist(
            self, mock_get_metrics
    ):
        mock_get_metrics.side_effect = mock_function
        request = self.factory.get(
            self.url + '/centos6',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[ARGO-MON, MON-TEST, TEST-NONEXISTING]'}
        )
        request.tenant = self.tenant
        response = self.view(request, 'centos6')
        self.assertEqual(mock_get_metrics.call_count, 3)
        mock_get_metrics.assert_has_calls([
            call('ARGO-MON', "TENANT"),
            call('MON-TEST', "TENANT"),
            call('TEST-NONEXISTING', "TENANT")
        ])
        self.assertEqual(
            response.data,
            {
                'data': {
                    'repo-1': {
                        'content': 'content1\ncontent2\n',
                        'packages': [
                            {
                                'name': 'nagios-plugins-argo',
                                'version': '0.1.11'
                            }
                        ]
                    },
                    'repo-2': {
                        'content': 'content5\ncontent6',
                        'packages': [
                            {
                                'name': 'nagios-plugins-http',
                                'version': 'present'
                            }
                        ]
                    }
                },
                'missing_packages': [
                    'nagios-plugins-seadatacloud-nvs2 (1.0.1)'
                ]
            }
        )

    @patch('Poem.api.views.get_metrics_from_profile')
    def test_list_repos_if_version_is_the_right_os(self, mock_get_metrics):
        mock_get_metrics.side_effect = mock_function
        request = self.factory.get(
            self.url + '/centos6',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[TEST_PROMOO]'}
        )
        request.tenant = self.tenant
        response = self.view(request, 'centos6')
        mock_get_metrics.assert_called_once()
        mock_get_metrics.assert_called_with('TEST_PROMOO', "TENANT")
        self.assertEqual(
            response.data,
            {
                'data': {
                    'promoo': {
                        'content': 'content9\ncontent10',
                        'packages': [
                            {
                                'name': 'nagios-promoo',
                                'version': '1.4.0'
                            }
                        ]
                    }
                },
                'missing_packages': []
            }
        )

    @patch('Poem.api.views.get_metrics_from_profile')
    def test_list_repos_if_version_is_wrong_os(self, mock_get_metrics):
        mock_get_metrics.side_effect = mock_function
        request = self.factory.get(
            self.url + '/centos6',
            **{'HTTP_X_API_KEY': self.token,
               'HTTP_PROFILES': '[TEST_PROMOO]'}
        )
        request.tenant = self.tenant
        response = self.view(request, 'centos7')
        mock_get_metrics.assert_called_once()
        mock_get_metrics.assert_called_with('TEST_PROMOO', "TENANT")
        self.assertEqual(
            response.data,
            {
                'data': {},
                'missing_packages': ['nagios-promoo (1.4.0)']
            }
        )


class ListReposInternalAPIViewTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        self.token = create_credentials()
        self.view = views.ListReposInternal.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = '/api/v2/repos_internal'

        mock_db_for_repos_tests()

    def test_get_repos_if_wrong_token(self):
        request = self.factory.get(
            self.url + '/centos7', **{'HTTP_X_API_KEY': 'wrong_token'}
        )
        request.tenant = self.tenant
        response = self.view(request, 'centos7')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_repos(self):
        request = self.factory.get(
            self.url + '/centos7', **{'HTTP_X_API_KEY': self.token}
        )
        request.tenant = self.tenant
        response = self.view(request, 'centos7')
        test_data = response.data
        test_data['data']['repo-1']['packages'] = sorted(
            test_data['data']['repo-1']['packages'], key=lambda k: k['name']
        )
        self.assertEqual(
            test_data,
            {
                'data': {
                    'repo-1': {
                        'content': 'content3\ncontent4\n',
                        'packages': [
                            {
                                'name': 'nagios-plugins-argo',
                                'version': '0.1.11'
                            },
                            {
                                'name': 'nagios-plugins-nagiosexchange',
                                'version': '1.0.0'
                            }
                        ]
                    }
                },
                'missing_packages': []
            }
        )

    def test_get_repos_if_no_tag(self):
        request = self.factory.get(
            self.url, **{'HTTP_X_API_KEY': self.token}
        )
        request.tenant = self.tenant
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'detail': 'You must define OS!'}
        )

    def test_get_repos_if_nonexisting_tag(self):
        request = self.factory.get(
            self.url + '/nonexisting', **{'HTTP_X_API_KEY': self.token}
        )
        request.tenant = self.tenant
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {'detail': 'YUM repo tag not found.'}
        )


class ListMetricTemplateAPIViewTests(TenantTestCase):
    def setUp(self):
        self.token = create_credentials()
        self.view = views.ListMetricTemplates.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = '/api/v2/metrics'

        mock_db_for_metrics_tests()

    def test_list_metric_templates_if_wrong_token(self):
        request = self.factory.get(
            self.url, **{'HTTP_X_API_KEY': 'wrong_token'}
        )
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_metric_templates(self):
        request = self.factory.get(self.url, **{'HTTP_X_API_KEY': self.token})
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'argo.AMSPublisher-Check': {
                        'probe': 'ams-publisher-probe',
                        'tags': ['internal', 'test_tag1'],
                        'config': {
                            'maxCheckAttempts': '1',
                            'timeout': '120',
                            'path': '/usr/libexec/argo-monitoring/probes/argo',
                            'interval': '180',
                            'retryInterval': '1'
                        },
                        'flags': {
                            'NOHOSTNAME': '1',
                            'NOTIMEOUT': '1',
                            'NOPUBLISH': '1'
                        },
                        'dependency': {},
                        'attribute': {},
                        'parameter': {
                            '-s': '/var/run/argo-nagios-ams-publisher/sock',
                            '-q': 'w:metrics+g:published180'
                        },
                        'parent': '',
                        'docurl':
                            'https://github.com/ARGOeu/nagios-plugins-argo'
                            '/blob/master/README.md'
                    }
                },
                {
                    'hr.srce.CertLifetime-Local': {
                        'probe': 'CertLifetime-probe',
                        'tags': ['internal'],
                        'config': {
                            'maxCheckAttempts': '2',
                            'timeout': '60',
                            'path': '/usr/libexec/argo-monitoring/probes/cert',
                            'interval': '240',
                            'retryInterval': '30'
                        },
                        'flags': {
                            'NOHOSTNAME': '1',
                            'NOPUBLISH': '1'
                        },
                        'dependency': {},
                        'attribute': {
                            'NAGIOS_HOST_CERT': '-f'
                        },
                        'parameter': {},
                        'parent': '',
                        'docurl':
                            'https://wiki.egi.eu/wiki/ROC_SAM_Tests#hr.srce.'
                            'CREAMCE-CertLifetime'
                    }
                },
                {
                    'org.apel.APEL-Pub': {
                        'probe': '',
                        'tags': [],
                        'config': {},
                        'flags': {
                            'OBSESS': '1',
                            'PASSIVE': '1'
                        },
                        'dependency': {},
                        'attribute': {},
                        'parameter': {},
                        'parent': '',
                        'docurl': ''
                    }
                },
                {
                    'test.AMS-Check': {
                        'probe': 'ams-probe',
                        'tags': ['test_tag1', 'test_tag2'],
                        'config': {
                            'maxCheckAttempts': '3',
                            'timeout': '60',
                            'path': '/usr/libexec/argo-monitoring/probes/argo',
                            'interval': '5',
                            'retryInterval': '3'
                        },
                        'flags': {
                            'OBSESS': '1'
                        },
                        'dependency': {
                            'argo.AMS-Check': '1'
                        },
                        'attribute': {
                            'argo.ams_TOKEN': '--token'
                        },
                        'parameter': {
                            '--project': 'EGI'
                        },
                        'parent': 'org.nagios.CDMI-TCP',
                        'docurl':
                            'https://github.com/ARGOeu/nagios-plugins-argo'
                            '/blob/master/README.md'
                    }
                },
                {
                    'test.EMPTY-metric': {
                        'probe': '',
                        'tags': [],
                        'config': {},
                        'flags': {},
                        'dependency': {},
                        'attribute': {},
                        'parameter': {},
                        'parent': '',
                        'docurl': ''
                    }
                }
            ]
        )

    def test_get_internal_metric_templates(self):
        request = self.factory.get(
            self.url + '/internal', **{'HTTP_X_API_KEY': self.token}
        )
        response = self.view(request, 'internal')
        self.assertEqual(
            response.data,
            ['argo.AMSPublisher-Check', 'hr.srce.CertLifetime-Local']
        )

    def test_get_metric_templates_if_no_tagged_metrics(self):
        request = self.factory.get(
            self.url + '/empty_tag', **{'HTTP_X_API_KEY': self.token}
        )
        response = self.view(request, 'empty_tag')
        self.assertEqual(response.data, [])

    def test_get_metric_templates_if_nonexistent_tag(self):
        request = self.factory.get(
            self.url + '/nonexistent', **{'HTTP_X_API_KEY': self.token}
        )
        response = self.view(request, 'nonexistent')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Requested tag not found.'})


class ListMetricConfigurationAPIViewTests(TenantTestCase):
    def setUp(self):
        self.token = create_credentials()
        self.view = views.ListMetricOverrides.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = '/api/v2/metricoverrides'

        mock_db_for_metrics_tests()

    def test_list_metric_overrides_if_wrong_token(self):
        request = self.factory.get(
            self.url, **{'HTTP_X_API_KEY': 'wrong_token'}
        )
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_metric_overrides(self):
        request = self.factory.get(self.url, **{'HTTP_X_API_KEY': self.token})
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "consumer": {
                    "global_attributes": [],
                    "host_attributes": [],
                    "metric_parameters": [
                        {
                            "hostname": "eosccore.mon.devel.argo.grnet.gr",
                            "metric": "argo.AMSPublisher-Check",
                            "parameter": "-q",
                            "value": "w:metrics+g:published180 -c 10"
                        }
                    ]
                },
                "local": {
                    "global_attributes": [
                        {
                            "attribute": "NAGIOS_ACTUAL_HOST_CERT",
                            "value": "/etc/nagios/globus/hostcert.pem"
                        },
                        {
                            "attribute": "NAGIOS_ACTUAL_HOST_KEY",
                            "value": "/etc/nagios/globus/hostkey.pem"
                        }
                    ],
                    "host_attributes": [
                        {
                            "hostname": "mock.host.name",
                            "attribute": "attr1",
                            "value": "some-new-value"
                        }
                    ],
                    "metric_parameters": [
                        {
                            "hostname": "eosccore.ui.argo.grnet.gr",
                            "metric": "org.nagios.ARGOWeb-AR",
                            "parameter": "-r",
                            "value": "EOSC_Monitoring"
                        },
                        {
                            "hostname": "argo.eosc-portal.eu",
                            "metric": "org.nagios.ARGOWeb-Status",
                            "parameter": "-u",
                            "value": "/eosc/report-status/Default/SERVICEGROUPS"
                                     "?accept=csv"
                        }
                    ]
                }
            }
        )


class ListDefaultPortsTests(TenantTestCase):
    def setUp(self):
        self.token = create_credentials()
        self.view = views.ListDefaultPorts.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = '/api/v2/metricoverrides'

        admin_models.DefaultPort.objects.create(
            name="SITE_BDII_PORT", value="2170"
        )
        admin_models.DefaultPort.objects.create(name="BDII_PORT", value="2170")
        admin_models.DefaultPort.objects.create(name="GRAM_PORT", value="2119")
        admin_models.DefaultPort.objects.create(
            name="MYPROXY_PORT", value="7512"
        )

    def test_list_default_ports_if_wrong_token(self):
        request = self.factory.get(
            self.url, **{'HTTP_X_API_KEY': 'wrong_token'}
        )
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_default_ports(self):
        request = self.factory.get(self.url, **{'HTTP_X_API_KEY': self.token})
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "BDII_PORT": "2170",
                "GRAM_PORT": "2119",
                "MYPROXY_PORT": "7512",
                "SITE_BDII_PORT": "2170"
            }
        )


class ProbeCandidateAPITests(TenantTestCase):
    def setUp(self) -> None:
        self.token = create_credentials()
        self.view = views.ProbeCandidateAPI.as_view()
        self.factory = TenantRequestFactory(self.tenant)
        self.url = "/api/v2/probes"

        submitted_status = poem_models.ProbeCandidateStatus.objects.create(
            name="submitted"
        )
        testing_status = poem_models.ProbeCandidateStatus.objects.create(
            name="testing"
        )
        poem_models.ProbeCandidateStatus.objects.create(name="deployed")
        poem_models.ProbeCandidateStatus.objects.create(name="rejected")
        poem_models.ProbeCandidateStatus.objects.create(name="processing")

        self.candidate1 = poem_models.ProbeCandidate.objects.create(
            name="test-probe",
            description="Some description for the test probe",
            docurl="https://github.com/ARGOeu-Metrics/argo-probe-test",
            command="/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                    "-t <timeout> --test",
            contact="poem@example.com",
            status=testing_status,
            submitted_sent=True,
            processing_sent=True,
            testing_sent=True,
            service_type="testing.service.type"
        )
        self.candidate2 = poem_models.ProbeCandidate.objects.create(
            name="test-probe0",
            description="Description of the probe",
            docurl="https://github.com/ARGOeu-Metrics/argo-probe-test",
            command="/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                    "-t <timeout> --test --flag1 --flag2",
            contact="poem@example.com",
            status=submitted_status,
            submitted_sent=True
        )

    def test_get_probe_candidates_without_proper_authentication(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_probe_candidates_successfully(self):
        request = self.factory.get(self.url, **{'HTTP_X_API_KEY': self.token})
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data, [
                {
                    "name": "test-probe",
                    "status": "testing",
                    "created": self.candidate1.created.strftime(
                        "%Y-%m-%d %H:%M:%S"
                    ),
                    "last_update": self.candidate1.last_update.strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                },
                {
                    "name": "test-probe0",
                    "status": "submitted",
                    "created": self.candidate2.created.strftime(
                        "%Y-%m-%d %H:%M:%S"
                    ),
                    "last_update": self.candidate2.last_update.strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                }
            ]
        )

    def test_post_probe_candidate_successfully_with_rpm(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
            EMAILFROM="no-reply@argo.test.com",
            EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(
                response.data["detail"],
                "Probe 'poem-probe' POSTed successfully"
            )
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe submitted"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

your probe 'poem-probe' has been successfully submitted. 

You will receive further instructions after the probe has been inspected.

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["poem@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.get(
                name="poem-probe"
            )
            self.assertEqual(
                candidate.description,
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-poem"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-poem-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "https://rpm-repo.example.com/centos7"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "submitted")
            self.assertTrue(candidate.submitted_sent)
            self.assertFalse(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)
            self.assertFalse(candidate.processing_sent)

    def test_post_probe_candidate_successfully_with_script(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "script": "https://some-mock.url.com/script",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(
                response.data["detail"],
                "Probe 'poem-probe' POSTed successfully"
            )
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe submitted"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

your probe 'poem-probe' has been successfully submitted. 

You will receive further instructions after the probe has been inspected.

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["poem@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.get(
                name="poem-probe"
            )
            self.assertEqual(
                candidate.description,
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-poem"
            )
            self.assertEqual(candidate.rpm, "")
            self.assertEqual(candidate.yum_baseurl, "")
            self.assertEqual(
                candidate.script, "https://some-mock.url.com/script"
            )
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "submitted")
            self.assertTrue(candidate.submitted_sent)
            self.assertFalse(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)
            self.assertFalse(candidate.processing_sent)

    def test_post_probe_candidate_successfully_different_timeout_arg(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "--timeout <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(
                response.data["detail"],
                "Probe 'poem-probe' POSTed successfully"
            )
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe submitted"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

your probe 'poem-probe' has been successfully submitted. 

You will receive further instructions after the probe has been inspected.

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["poem@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.get(
                name="poem-probe"
            )
            self.assertEqual(
                candidate.description,
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-poem"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-poem-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "https://rpm-repo.example.com/centos7"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "--timeout <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "submitted")
            self.assertTrue(candidate.submitted_sent)
            self.assertFalse(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)
            self.assertFalse(candidate.processing_sent)

    def test_post_probe_candidate_with_existing_name(self):
        data = {
            "name": "test-probe",
            "description": "Some different description",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-test",
            "rpm": "argo-probe-test-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test --dryrun",
            "contact": "test@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(
                response.data["detail"],
                "Probe 'test-probe' POSTed successfully"
            )
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe submitted"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

your probe 'test-probe' has been successfully submitted. 

You will receive further instructions after the probe has been inspected.

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["test@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.filter(
                name="test-probe"
            ).order_by("created")
            self.assertEqual(len(candidate), 2)
            self.assertEqual(
                candidate[0].description, "Some description for the test probe"
            )
            self.assertEqual(
                candidate[1].description, "Some different description"
            )
            self.assertEqual(
                candidate[0].docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(
                candidate[1].docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-test"
            )
            self.assertEqual(candidate[0].rpm, "")
            self.assertEqual(
                candidate[1].rpm, "argo-probe-test-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(candidate[0].yum_baseurl, "")
            self.assertEqual(
                candidate[1].yum_baseurl, "https://rpm-repo.example.com/centos7"
            )
            self.assertEqual(candidate[0].script, None)
            self.assertEqual(candidate[1].script, "")
            self.assertEqual(
                candidate[0].command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(
                candidate[1].command,
                "/usr/libexec/argo/probes/test/test-probe -H <hostname> "
                "-t <timeout> --test --dryrun"
            )
            self.assertEqual(candidate[0].contact, "poem@example.com")
            self.assertEqual(candidate[1].contact, "test@example.com")
            self.assertEqual(candidate[0].status.name, "testing")
            self.assertEqual(candidate[1].status.name, "submitted")
            self.assertTrue(candidate[0].submitted_sent)
            self.assertTrue(candidate[1].submitted_sent)
            self.assertTrue(candidate[0].testing_sent)
            self.assertFalse(candidate[1].testing_sent)
            self.assertFalse(candidate[0].deployed_sent)
            self.assertFalse(candidate[1].deployed_sent)
            self.assertFalse(candidate[0].rejected_sent)
            self.assertFalse(candidate[1].rejected_sent)
            self.assertTrue(candidate[0].processing_sent)
            self.assertFalse(candidate[1].processing_sent)

    def test_post_probe_candidate_with_missing_name(self):
        data = {
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"], "Field 'name' is mandatory"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertEqual(poem_models.ProbeCandidate.objects.count(), 2)

    def test_post_probe_candidate_with_empty_name(self):
        data = {
            "name": "",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"], "Field 'name' is mandatory"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertEqual(poem_models.ProbeCandidate.objects.count(), 2)

    def test_post_probe_candidate_with_missing_description(self):
        data = {
            "name": "poem-probe",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(
                response.data["detail"],
                "Probe 'poem-probe' POSTed successfully"
            )
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe submitted"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

your probe 'poem-probe' has been successfully submitted. 

You will receive further instructions after the probe has been inspected.

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["poem@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.get(
                name="poem-probe"
            )
            self.assertEqual(candidate.description, "")
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-poem"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-poem-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "https://rpm-repo.example.com/centos7"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "submitted")
            self.assertTrue(candidate.submitted_sent)
            self.assertFalse(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)
            self.assertFalse(candidate.processing_sent)

    def test_post_probe_candidate_with_empty_description(self):
        data = {
            "name": "poem-probe",
            "description": "",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(
                response.data["detail"],
                "Probe 'poem-probe' POSTed successfully"
            )
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe submitted"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

your probe 'poem-probe' has been successfully submitted. 

You will receive further instructions after the probe has been inspected.

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["poem@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.get(
                name="poem-probe"
            )
            self.assertEqual(candidate.description, "")
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-poem"
            )
            self.assertEqual(
                candidate.rpm, "argo-probe-poem-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(
                candidate.yum_baseurl, "https://rpm-repo.example.com/centos7"
            )
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "submitted")
            self.assertTrue(candidate.submitted_sent)
            self.assertFalse(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)
            self.assertFalse(candidate.processing_sent)

    def test_post_probe_candidate_with_missing_docurl(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"], "Field 'docurl' is mandatory"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_empty_docurl(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"], "Field 'docurl' is mandatory"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_invalid_docurl(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Field 'docurl' must be defined as valid URL"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_missing_rpm_and_script(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "You must provide either 'rpm' or 'script' field"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_empty_rpm_and_no_script(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "You must provide either 'rpm' or 'script' field"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_successfully_with_rpm_as_url_and_no_yum(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "https://rpm-repo.example.com/centos7/"
                   "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(
                response.data["detail"],
                "Probe 'poem-probe' POSTed successfully"
            )
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(
                mail.outbox[0].subject, "[ARGO Monitoring] Probe submitted"
            )
            self.assertEqual(
                mail.outbox[0].body,
                """
Dear madam/sir,

your probe 'poem-probe' has been successfully submitted. 

You will receive further instructions after the probe has been inspected.

Best regards,
ARGO Monitoring team
"""
            )
            self.assertEqual(
                mail.outbox[0].from_email, "no-reply@argo.test.com"
            )
            self.assertEqual(mail.outbox[0].to, ["poem@example.com"])
            self.assertEqual(mail.outbox[0].bcc, ["argo@argo.test.com"])
            candidate = poem_models.ProbeCandidate.objects.get(
                name="poem-probe"
            )
            self.assertEqual(
                candidate.description,
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs"
            )
            self.assertEqual(
                candidate.docurl,
                "https://github.com/ARGOeu-Metrics/argo-probe-poem"
            )
            self.assertEqual(
                candidate.rpm,
                "https://rpm-repo.example.com/centos7/"
                "argo-probe-poem-0.1.0-1.el7.noarch.rpm"
            )
            self.assertEqual(candidate.yum_baseurl, "")
            self.assertEqual(candidate.script, "")
            self.assertEqual(
                candidate.command,
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test"
            )
            self.assertEqual(candidate.contact, "poem@example.com")
            self.assertEqual(candidate.status.name, "submitted")
            self.assertTrue(candidate.submitted_sent)
            self.assertFalse(candidate.testing_sent)
            self.assertFalse(candidate.deployed_sent)
            self.assertFalse(candidate.rejected_sent)
            self.assertFalse(candidate.processing_sent)

    def test_post_probe_candidate_with_missing_yum_baseurl(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Field 'yum_baseurl' is mandatory with 'rpm' field, unless "
                "'rpm' field is defined as valid URL"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_empty_yum_baseurl(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Field 'yum_baseurl' is mandatory with 'rpm' field, unless "
                "'rpm' field is defined as valid URL"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_invalid_yum_baseurl(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Field 'yum_baseurl' must be defined as valid URL"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_invalid_script(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "script": "some-test-script",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Field 'script' must be defined as valid URL"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_missing_command(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"], "Field 'command' is mandatory"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_empty_command(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command": "",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"], "Field 'command' is mandatory"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_invalid_command(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> --test",
            "contact": "poem@example.com"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Invalid 'command' field. "
                "Command must have -t/--timeout argument. "
                "Please refer to the probe development guidelines: "
                "https://argoeu.github.io/argo-monitoring/docs/monitoring/"
                "guidelines"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_missing_contact(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"], "Field 'contact' is mandatory"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_empty_contact(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": ""
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"], "Field 'contact' is mandatory"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )

    def test_post_probe_candidate_with_invalid_contact(self):
        data = {
            "name": "poem-probe",
            "description":
                "Probe is checking mandatory metric configurations of Tenant "
                "POEMs",
            "docurl": "https://github.com/ARGOeu-Metrics/argo-probe-poem",
            "rpm": "argo-probe-poem-0.1.0-1.el7.noarch.rpm",
            "yum_baseurl": "https://rpm-repo.example.com/centos7",
            "command":
                "/usr/libexec/argo/probes/poem/poem-probe -H <hostname> "
                "-t <timeout> --test",
            "contact": "poem@"
        }
        with self.settings(
                EMAILFROM="no-reply@argo.test.com",
                EMAILUS="argo@argo.test.com"
        ):
            request = self.factory.post(
                self.url, **{'HTTP_X_API_KEY': self.token},
                data=data,
                format="json"
            )
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"], "Field 'contact' is not valid email"
            )
            self.assertEqual(len(mail.outbox), 0)
            self.assertRaises(
                poem_models.ProbeCandidate.DoesNotExist,
                poem_models.ProbeCandidate.objects.get,
                name="poem-probe"
            )
