import datetime
import json
from unittest.mock import patch, call

import requests
from Poem.api import views_internal as views
from Poem.api.internal_views.utils import WebApiException
from Poem.helpers.history_helpers import create_comment, serialize_metric
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from Poem.users.models import CustUser
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from django_tenants.utils import get_public_schema_name, schema_context, \
    get_tenant_domain_model
from rest_framework import status
from rest_framework.test import force_authenticate

from .utils_test import mocked_inline_metric_for_db, mocked_func, encode_data


def mock_db():
    with schema_context(get_public_schema_name()):
        public_tenant = Tenant.objects.create(
            name='public', schema_name=get_public_schema_name()
        )
        get_tenant_domain_model().objects.create(
            domain='public', tenant=public_tenant, is_primary=True
        )

        superuser = CustUser.objects.create_user(
            username='poem', is_superuser=True
        )
        CustUser.objects.create_user(username='admin_user')

    tenant_superuser = CustUser.objects.create_user(
        username="tenant_poem", is_superuser=True
    )
    CustUser.objects.create_user(username="tenant_user")

    tag1 = admin_models.MetricTags.objects.create(name="internal")
    admin_models.MetricTags.objects.create(name="deprecated")
    tag3 = admin_models.MetricTags.objects.create(name="test_tag1")
    tag4 = admin_models.MetricTags.objects.create(name="test_tag2")

    mttype1 = admin_models.MetricTemplateType.objects.create(name="Active")
    mttype2 = admin_models.MetricTemplateType.objects.create(name="Passive")

    ostag1 = admin_models.OSTag.objects.create(name="CentOS 6")
    ostag2 = admin_models.OSTag.objects.create(name="CentOS 7")

    repo1 = admin_models.YumRepo.objects.create(name="repo-1", tag=ostag1)
    repo2 = admin_models.YumRepo.objects.create(name="repo-2", tag=ostag2)

    package1 = admin_models.Package.objects.create(
        name="nagios-plugins-argo", version="0.1.7"
    )
    package1.repos.add(repo1)

    package2 = admin_models.Package.objects.create(
        name="nagios-plugins-argo",
        version="0.1.11"
    )
    package2.repos.add(repo1, repo2)

    package3 = admin_models.Package.objects.create(
        name="nagios-plugins-nrpe",
        version="3.2.0"
    )
    package3.repos.add(repo1)

    package4 = admin_models.Package.objects.create(
        name="nagios-plugins-nrpe",
        version="3.2.1"
    )
    package4.repos.add(repo2)

    package5 = admin_models.Package.objects.create(
        name="sdc-nerc-sparql",
        version="1.0.1"
    )
    package5.repos.add(repo2)

    package6 = admin_models.Package.objects.create(
        name="nagios-plugins-argo",
        version="0.1.14"
    )
    package6.repos.add(repo2)

    package7 = admin_models.Package.objects.create(
        name="nagios-plugin-grnet-agora",
        version="0.2"
    )
    package7.repos.add(repo1)

    package8 = admin_models.Package.objects.create(
        name="nagios-plugin-grnet-agora",
        version="0.3"
    )
    package8.repos.add(repo1)

    package9 = admin_models.Package.objects.create(
        name="argo-probe-grnet-agora",
        version="0.4"
    )
    package9.repos.add(repo1)

    probe1 = admin_models.Probe.objects.create(
        name="ams-probe",
        package=package1,
        description="Probe is inspecting AMS service by trying to publish and "
                    "consume randomly generated messages.",
        comment="Initial version.",
        repository='https://github.com/ARGOeu/nagios-plugins-argo',
        docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
               'README.md'
    )

    probe1_version1 = admin_models.ProbeHistory.objects.create(
        object_id=probe1,
        name=probe1.name,
        package=probe1.package,
        description=probe1.description,
        comment=probe1.comment,
        repository=probe1.repository,
        docurl=probe1.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user=superuser.username
    )

    probe1.package = package2
    probe1.comment = "Newer version."
    probe1.save()

    probe1_version2 = admin_models.ProbeHistory.objects.create(
        object_id=probe1,
        name=probe1.name,
        package=probe1.package,
        description=probe1.description,
        comment=probe1.comment,
        repository=probe1.repository,
        docurl=probe1.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Newer model.',
        version_user=superuser.username
    )

    probe1.package = package6
    probe1.comment = "Newest version."
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
        version_comment='Newest model.',
        version_user=superuser.username
    )

    probe2 = admin_models.Probe.objects.create(
        name="ams-publisher-probe",
        package=package6,
        description="Probe is inspecting AMS publisher running on Nagios "
                    "monitoring instances.",
        comment="Initial version.",
        repository='https://github.com/ARGOeu/nagios-plugins-argo',
        docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
               'README.md'
    )

    probe2_version1 = admin_models.ProbeHistory.objects.create(
        object_id=probe2,
        name=probe2.name,
        package=probe2.package,
        description=probe2.description,
        comment=probe2.comment,
        repository=probe2.repository,
        docurl=probe2.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user=superuser.username
    )

    probe3 = admin_models.Probe.objects.create(
        name='check_nrpe',
        package=package3,
        description='This is a plugin that is and is used to contact the '
                    'NRPE process on remote hosts.',
        comment='Initial version.',
        repository='https://github.com/NagiosEnterprises/nrpe',
        docurl='https://github.com/NagiosEnterprises/nrpe/blob/master/'
               'CHANGELOG.md'
    )

    probe3_version1 = admin_models.ProbeHistory.objects.create(
        object_id=probe3,
        name=probe3.name,
        package=probe3.package,
        description=probe3.description,
        comment=probe3.comment,
        repository=probe3.repository,
        docurl=probe3.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user=superuser.username
    )

    probe3.package = package4
    probe3.comment = "Newer version."
    probe3.save()

    probe3_version2 = admin_models.ProbeHistory.objects.create(
        object_id=probe3,
        name=probe3.name,
        package=probe3.package,
        description=probe3.description,
        comment=probe3.comment,
        repository=probe3.repository,
        docurl=probe3.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Newer version.',
        version_user=superuser.username
    )

    probe4 = admin_models.Probe.objects.create(
        name='sdc-nerq-sparq',
        package=package5,
        description='sparql endpoint nvs.',
        comment='Initial version.',
        repository='https://github.com/ARGOeu/sdc-nerc-spqrql',
        docurl='https://github.com/ARGOeu/sdc-nerc-spqrql'
    )

    probe4_version1 = admin_models.ProbeHistory.objects.create(
        object_id=probe4,
        name=probe4.name,
        package=probe4.package,
        description=probe4.description,
        comment=probe4.comment,
        repository=probe4.repository,
        docurl=probe4.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user=superuser.username
    )

    probe5 = admin_models.Probe.objects.create(
        name="test-probe",
        package=package1,
        description="Probe without metrics",
        comment="Initial version.",
        repository='https://github.com/ARGOeu/nagios-plugins-argo',
        docurl='https://github.com/ARGOeu/nagios-plugins-argo/blob/master/'
               'README.md'
    )

    admin_models.ProbeHistory.objects.create(
        object_id=probe5,
        name=probe5.name,
        package=probe5.package,
        description=probe5.description,
        comment=probe5.comment,
        repository=probe5.repository,
        docurl=probe5.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user=superuser.username
    )

    probe6 = admin_models.Probe.objects.create(
        name="checkhealth",
        package=package7,
        description="Nagios plugins to check availability of Agora Catalogue.",
        comment="Initial version.",
        repository="https://github.com/ARGOeu/agora-probes/",
        docurl="https://github.com/ARGOeu/agora-probes/"
    )

    probe6_version1 = admin_models.ProbeHistory.objects.create(
        object_id=probe6,
        name=probe6.name,
        package=probe6.package,
        description=probe6.description,
        comment=probe6.comment,
        repository=probe6.repository,
        docurl=probe6.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Initial version.',
        version_user=superuser.username
    )

    probe6.package = package8
    probe6.comment = "Updated version."
    probe6.save()

    probe6_version2 = admin_models.ProbeHistory.objects.create(
        object_id=probe6,
        name=probe6.name,
        package=probe6.package,
        description=probe6.description,
        comment=probe6.comment,
        repository=probe6.repository,
        docurl=probe6.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Updated version.',
        version_user=superuser.username
    )

    probe6.package = package9
    probe6.comment = "Updated parameters"
    probe6.save()

    probe6_version3 = admin_models.ProbeHistory.objects.create(
        object_id=probe6,
        name=probe6.name,
        package=probe6.package,
        description=probe6.description,
        comment=probe6.comment,
        repository=probe6.repository,
        docurl=probe6.docurl,
        date_created=datetime.datetime.now(),
        version_comment='Updated parameters.',
        version_user=superuser.username
    )

    mt1 = admin_models.MetricTemplate.objects.create(
        name='argo.AMS-Check',
        mtype=mttype1,
        probekey=probe1_version1,
        probeexecutable='["ams-probe"]',
        config='["maxCheckAttempts 3", "timeout 60",'
               ' "path /usr/libexec/argo-monitoring/probes/argo",'
               ' "interval 5", "retryInterval 3"]',
        attribute='["argo.ams_TOKEN --token"]',
        flags='["OBSESS 1"]',
        parameter='["--project EGI"]'
    )
    mt1.tags.add(tag3, tag4)

    mt1_version1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=mt1,
        name=mt1.name,
        mtype=mt1.mtype,
        probekey=mt1.probekey,
        description=mt1.description,
        probeexecutable=mt1.probeexecutable,
        config=mt1.config,
        attribute=mt1.attribute,
        dependency=mt1.dependency,
        flags=mt1.flags,
        parameter=mt1.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.',
    )
    mt1_version1.tags.add(tag3, tag4)

    mt1.probekey = probe1_version2
    mt1.config = \
        '["maxCheckAttempts 4", "timeout 70", ' \
        '"path /usr/libexec/argo-monitoring/", ' \
        '"interval 5", "retryInterval 3"]'
    mt1.save()
    mt1.tags.add(tag1)

    mt1_version2 = admin_models.MetricTemplateHistory.objects.create(
        object_id=mt1,
        name=mt1.name,
        mtype=mt1.mtype,
        probekey=mt1.probekey,
        description=mt1.description,
        probeexecutable=mt1.probeexecutable,
        config=mt1.config,
        attribute=mt1.attribute,
        dependency=mt1.dependency,
        flags=mt1.flags,
        parameter=mt1.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment=create_comment(mt1)
    )
    mt1_version2.tags.add(tag1, tag3, tag4)

    mt2 = admin_models.MetricTemplate.objects.create(
        name='org.apel.APEL-Pub',
        flags='["OBSESS 1", "PASSIVE 1"]',
        mtype=mttype2,
    )
    mt2.tags.add(tag4)

    mt2_version1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=mt2,
        name=mt2.name,
        mtype=mt2.mtype,
        probekey=mt2.probekey,
        description=mt2.description,
        probeexecutable=mt2.probeexecutable,
        config=mt2.config,
        attribute=mt2.attribute,
        dependency=mt2.dependency,
        flags=mt2.flags,
        parameter=mt2.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.',
    )
    mt2_version1.tags.add(tag4)

    mt3 = admin_models.MetricTemplate.objects.create(
        name='argo.AMSPublisher-Check',
        mtype=mttype1,
        probekey=probe2_version1,
        probeexecutable='["ams-publisher-probe"]',
        config='["interval 180", "maxCheckAttempts 1",'
               ' "path /usr/libexec/argo-monitoring/probes/argo",'
               ' "retryInterval 1", "timeout 120"]',
        flags='["NOHOSTNAME 1", "NOTIMEOUT 1", "NOPUBLISH 1"]',
        parameter='["-s /var/run/argo-nagios-ams-publisher/sock"]'
    )

    admin_models.MetricTemplateHistory.objects.create(
        object_id=mt3,
        name=mt3.name,
        mtype=mt3.mtype,
        probekey=mt3.probekey,
        description=mt3.description,
        probeexecutable=mt3.probeexecutable,
        config=mt3.config,
        attribute=mt3.attribute,
        dependency=mt3.dependency,
        flags=mt3.flags,
        parameter=mt3.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.',
    )

    mt4 = admin_models.MetricTemplate.objects.create(
        name='test.AMS-Check',
        description='Description of test.AMS-Check.',
        probeexecutable='["ams-probe"]',
        config='["interval 180", "maxCheckAttempts 1", '
               '"path /usr/libexec/argo-monitoring/probes/argo", '
               '"retryInterval 1", "timeout 120"]',
        attribute='["argo.ams_TOKEN --token"]',
        parameter='["--project EGI"]',
        flags='["OBSESS 1"]',
        mtype=mttype1,
        probekey=probe1_version1
    )

    admin_models.MetricTemplateHistory.objects.create(
        object_id=mt4,
        name=mt4.name,
        mtype=mt4.mtype,
        probekey=mt4.probekey,
        description=mt4.description,
        probeexecutable=mt4.probeexecutable,
        config=mt4.config,
        attribute=mt4.attribute,
        dependency=mt4.dependency,
        flags=mt4.flags,
        parameter=mt4.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.',
    )

    mt5 = admin_models.MetricTemplate.objects.create(
        name='argo.EGI-Connectors-Check',
        mtype=mttype1,
        probekey=probe3_version1,
        probeexecutable='["check_nrpe"]',
        config='["maxCheckAttempts 2", "timeout 60", '
               '"path /usr/lib64/nagios/plugins", '
               '"interval 720", "retryInterval 15"]',
        parameter='["-c check_connectors_egi"]'
    )

    admin_models.MetricTemplateHistory.objects.create(
        object_id=mt5,
        name=mt5.name,
        mtype=mt5.mtype,
        probekey=mt5.probekey,
        description=mt5.description,
        probeexecutable=mt5.probeexecutable,
        config=mt5.config,
        attribute=mt5.attribute,
        dependency=mt5.dependency,
        flags=mt5.flags,
        parameter=mt5.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.',
    )

    mt5.probekey = probe3_version2
    mt5.save()
    mt5.tags.add(tag3)

    mt5_version2 = admin_models.MetricTemplateHistory.objects.create(
        object_id=mt5,
        name=mt5.name,
        mtype=mt5.mtype,
        probekey=mt5.probekey,
        description=mt5.description,
        probeexecutable=mt5.probeexecutable,
        config=mt5.config,
        attribute=mt5.attribute,
        dependency=mt5.dependency,
        flags=mt5.flags,
        parameter=mt5.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Newer version.',
    )
    mt5_version2.tags.add(tag3)

    mt6 = admin_models.MetricTemplate.objects.create(
        name='eu.seadatanet.org.nerc-sparql-check',
        mtype=mttype1,
        probekey=probe4_version1,
        probeexecutable='["sdc-nerq-sparql.sh"]',
        config='["interval 15", "maxCheckAttempts 3", '
               '"path /usr/libexec/argo-monitoring/probes/'
               'sdc-nerc-sparql/", "retryInterval 3", "timeout 15"]',
        attribute='["eu.seadatanet.org.nerc-sparql_URL -H"]',
        flags='["OBSESS 1", "PNP 1"]'
    )

    admin_models.MetricTemplateHistory.objects.create(
        object_id=mt6,
        name=mt6.name,
        mtype=mt6.mtype,
        probekey=mt6.probekey,
        description=mt6.description,
        probeexecutable=mt6.probeexecutable,
        config=mt6.config,
        attribute=mt6.attribute,
        dependency=mt6.dependency,
        flags=mt6.flags,
        parameter=mt6.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.',
    )

    mt7 = admin_models.MetricTemplate.objects.create(
        name='test2.AMS-Check',
        description='Description of test.AMS-Check.',
        probeexecutable='["ams-probe"]',
        config='["interval 180", "maxCheckAttempts 1", '
               '"path /usr/libexec/argo-monitoring/probes/argo", '
               '"retryInterval 1", "timeout 120"]',
        attribute='["argo.ams_TOKEN --token"]',
        parameter='["--project EGI"]',
        flags='["OBSESS 1"]',
        mtype=mttype1,
        probekey=probe1_version1
    )

    admin_models.MetricTemplateHistory.objects.create(
        object_id=mt7,
        name=mt7.name,
        mtype=mt7.mtype,
        probekey=mt7.probekey,
        description=mt7.description,
        probeexecutable=mt7.probeexecutable,
        config=mt7.config,
        attribute=mt7.attribute,
        dependency=mt7.dependency,
        flags=mt7.flags,
        parameter=mt7.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.',
    )

    mt8 = admin_models.MetricTemplate.objects.create(
        name="eudat.itsm.spmt-healthcheck",
        mtype=mttype1,
        probekey=probe6_version1,
        probeexecutable='["checkhealth"]',
        config='["interval 15", "maxCheckAttempts 3", '
               '"path /usr/libexec/argo-monitoring/probes/grnet-agora/", '
               '"retryInterval 3", "timeout 10"]',
        attribute='["eu.eudat.itsm.spmt_URL -U"]',
        flags='["OBSESS 1", "NOTIMEOUT 1", "NOHOSTNAME 1"]'
    )

    mt8_version1 = admin_models.MetricTemplateHistory.objects.create(
        object_id=mt8,
        name=mt8.name,
        mtype=mt8.mtype,
        probekey=mt8.probekey,
        description=mt8.description,
        probeexecutable=mt8.probeexecutable,
        config=mt8.config,
        attribute=mt8.attribute,
        dependency=mt8.dependency,
        flags=mt8.flags,
        parameter=mt8.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Initial version.'
    )

    mt8.probekey = probe6_version2
    mt8.attribute = '["eu.eudat.itsm.spmt_URL -U", "AGORA_USERNAME -u", ' \
                    '"AGORA_PASSWORD -p"]'
    mt8.parameter = '["-v ", "-i "]'
    mt8.save()

    admin_models.MetricTemplateHistory.objects.create(
        object_id=mt8,
        name=mt8.name,
        mtype=mt8.mtype,
        probekey=mt8.probekey,
        description=mt8.description,
        probeexecutable=mt8.probeexecutable,
        config=mt8.config,
        attribute=mt8.attribute,
        dependency=mt8.dependency,
        flags=mt8.flags,
        parameter=mt8.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Added parameter fields "-i" and "-v". '
                        'Added attribute fields "AGORA_PASSWORD" and '
                        '"AGORA_USERNAME". Changed probekey.'
    )

    mt8.name = "grnet.agora.healthcheck"
    mt8.probekey = probe6_version3
    mt8.config = '["interval 15", "maxCheckAttempts 3", '\
                 '"path /usr/libexec/argo/probes/grnet-agora/", '\
                 '"retryInterval 3", "timeout 10"]'
    mt8.attribute = '["AGORA_USERNAME -u", "AGORA_PASSWORD -p"]'
    mt8.flags = '["OBSESS 1", "NOTIMEOUT 1"]'
    mt8.save()

    admin_models.MetricTemplateHistory.objects.create(
        object_id=mt8,
        name=mt8.name,
        mtype=mt8.mtype,
        probekey=mt8.probekey,
        description=mt8.description,
        probeexecutable=mt8.probeexecutable,
        config=mt8.config,
        attribute=mt8.attribute,
        dependency=mt8.dependency,
        flags=mt8.flags,
        parameter=mt8.parameter,
        date_created=datetime.datetime.now(),
        version_user=superuser.username,
        version_comment='Deleted flags field "NOHOSTNAME". '
                        'Changed name and probekey.'
    )

    admin_models.DefaultPort.objects.create(name="SITE_BDII_PORT", value="2170")
    admin_models.DefaultPort.objects.create(name="BDII_PORT", value="2170")
    admin_models.DefaultPort.objects.create(name="GRAM_PORT", value="2119")
    admin_models.DefaultPort.objects.create(name="MYPROXY_PORT", value="7512")

    group = poem_models.GroupOfMetrics.objects.create(name="TEST")

    metric1 = poem_models.Metric.objects.create(
        name=mt4.name,
        probeversion=mt4.probekey.__str__(),
        config=mt4.config,
        group=group
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric1.id,
        serialized_data=serialize_metric(metric1),
        object_repr="test.AMS-Check",
        content_type=ContentType.objects.get_for_model(metric1),
        date_created=datetime.datetime.now(),
        comment="Initial version.",
        user=tenant_superuser.username
    )

    metric2 = poem_models.Metric.objects.create(
        name=mt2.name,
        config=mt2.config,
        group=group
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric2.id,
        object_repr=metric2.__str__(),
        serialized_data=serialize_metric(metric2, tags=[tag4]),
        content_type=ContentType.objects.get_for_model(metric2),
        date_created=datetime.datetime.now(),
        comment='Initial version.',
        user=tenant_superuser.username
    )

    metric3 = poem_models.Metric.objects.create(
        name=mt1.name,
        probeversion=mt1.probekey.__str__(),
        config=mt1.config,
        group=group
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric3.id,
        object_repr=metric3.__str__(),
        serialized_data=serialize_metric(metric3, tags=[tag1, tag3, tag4]),
        content_type=ContentType.objects.get_for_model(metric3),
        date_created=datetime.datetime.now(),
        comment='Initial version.',
        user=tenant_superuser.username
    )

    metric4 = poem_models.Metric.objects.create(
        name=mt8_version1.name,
        probeversion=mt8_version1.probekey.__str__(),
        config=mt8_version1.config,
        group=group
    )

    poem_models.TenantHistory.objects.create(
        object_id=metric4.id,
        object_repr=metric4.__str__(),
        serialized_data=serialize_metric(metric4),
        content_type=ContentType.objects.get_for_model(metric4),
        date_created=datetime.datetime.now(),
        comment='Initial version.',
        user=tenant_superuser.username
    )


def mocked_syncer_error(*args, **kwargs):
    raise WebApiException("400 BAD REQUEST")


class ListMetricTemplatesAPIViewGETTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplates.as_view()
        self.url = '/api/v2/internal/metrictemplates/'

        self.tenant.name = "test"
        self.tenant.save()

        with schema_context(get_public_schema_name()):
            tenant1 = Tenant(name="tenant1", schema_name="tenant1_schema")
            tenant1.save(verbosity=0)
            get_tenant_domain_model().objects.create(
                domain="tenant1", tenant=tenant1, is_primary=True
            )

            tenant2 = Tenant(name="tenant2", schema_name="tenant2_schema")
            tenant2.save(verbosity=0)
            get_tenant_domain_model().objects.create(
                domain="tenant2", tenant=tenant2, is_primary=True
            )

        mock_db()

        self.public_tenant = Tenant.objects.get(name="public")
        self.tenant_superuser = CustUser.objects.get(username="tenant_poem")
        self.tenant_user = CustUser.objects.get(username='tenant_user')
        self.metrictemplate1 = admin_models.MetricTemplate.objects.get(
            name="argo.AMS-Check"
        )
        self.metrictemplate2 = admin_models.MetricTemplate.objects.get(
            name="org.apel.APEL-Pub"
        )
        self.metrictemplate3 = admin_models.MetricTemplate.objects.get(
            name="argo.AMSPublisher-Check"
        )
        self.metrictemplate4 = admin_models.MetricTemplate.objects.get(
            name="test.AMS-Check"
        )
        self.metrictemplate5 = admin_models.MetricTemplate.objects.get(
            name="argo.EGI-Connectors-Check"
        )
        self.metrictemplate6 = admin_models.MetricTemplate.objects.get(
            name="eu.seadatanet.org.nerc-sparql-check"
        )
        self.metrictemplate7 = admin_models.MetricTemplate.objects.get(
            name="test2.AMS-Check"
        )
        self.metrictemplate8 = admin_models.MetricTemplate.objects.get(
            name="grnet.agora.healthcheck"
        )

        self.template_active = admin_models.MetricTemplateType.objects.get(
            name="Active"
        )

        self.tag1 = admin_models.MetricTags.objects.get(name="internal")
        self.tag2 = admin_models.MetricTags.objects.get(name="deprecated")
        self.tag3 = admin_models.MetricTags.objects.get(name="test_tag1")
        self.tag4 = admin_models.MetricTags.objects.get(name="test_tag2")

        self.ams_probe_7 = admin_models.ProbeHistory.objects.get(
            name="ams-probe", comment="Initial version."
        )
        self.ams_probe_11 = admin_models.ProbeHistory.objects.get(
            name="ams-probe", comment="Newer version."
        )

        with schema_context(get_public_schema_name()):
            self.superuser = CustUser.objects.get(username="poem")
            self.user = CustUser.objects.get(username='admin_user')

        with schema_context("tenant1_schema"):
            group1 = poem_models.GroupOfMetrics.objects.create(name="TENANT1")
            superuser1 = CustUser.objects.create_user(
                username="poem1", is_superuser=True
            )

            metric1 = poem_models.Metric.objects.create(
                name=self.metrictemplate2.name,
                config=self.metrictemplate2.config,
                group=group1
            )

            poem_models.TenantHistory.objects.create(
                object_id=metric1.id,
                serialized_data=serialize_metric(metric1),
                object_repr=self.metrictemplate2.name,
                content_type=ContentType.objects.get_for_model(metric1),
                date_created=datetime.datetime.now(),
                comment="Initial version.",
                user=superuser1.username
            )

            metric2 = poem_models.Metric.objects.create(
                name=self.metrictemplate4.name,
                probeversion=self.metrictemplate4.probekey.__str__(),
                config=self.metrictemplate4.config,
                group=group1
            )

            poem_models.TenantHistory.objects.create(
                object_id=metric2.id,
                serialized_data=serialize_metric(metric2),
                object_repr=self.metrictemplate4.name,
                content_type=ContentType.objects.get_for_model(metric2),
                date_created=datetime.datetime.now(),
                comment="Initial version.",
                user=superuser1.username
            )

        with schema_context("tenant2_schema"):
            group2 = poem_models.GroupOfMetrics.objects.create(name="TENANT2")
            superuser2 = CustUser.objects.create_user(
                username="poem2", is_superuser=True
            )

            metric3 = poem_models.Metric.objects.create(
                name=self.metrictemplate2.name,
                config=self.metrictemplate2.config,
                group=group2
            )

            poem_models.TenantHistory.objects.create(
                object_id=metric3.id,
                serialized_data=serialize_metric(metric3),
                object_repr=self.metrictemplate2.name,
                content_type=ContentType.objects.get_for_model(metric3),
                date_created=datetime.datetime.now(),
                comment="Initial version.",
                user=superuser2.username
            )

            metric4 = poem_models.Metric.objects.create(
                name=self.metrictemplate8.name,
                probeversion=self.metrictemplate8.probekey.__str__(),
                config=self.metrictemplate8.config,
                group=group2
            )

            poem_models.TenantHistory.objects.create(
                object_id=metric4.id,
                serialized_data=serialize_metric(metric4),
                object_repr=self.metrictemplate8.name,
                content_type=ContentType.objects.get_for_model(metric4),
                date_created=datetime.datetime.now(),
                comment="Initial version.",
                user=superuser2.username
            )

    def test_get_metric_template_list_super_tenant(self):
        request = self.factory.get(self.url)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.metrictemplate1.id,
                    'name': 'argo.AMS-Check',
                    'mtype': 'Active',
                    'description': '',
                    'ostag': ['CentOS 6', 'CentOS 7'],
                    'tags': ['internal', 'test_tag1', 'test_tag2'],
                    "tenants": ["test"],
                    'probeversion': 'ams-probe (0.1.11)',
                    'parent': '',
                    'probeexecutable': 'ams-probe',
                    'config': [
                        {
                            'key': 'maxCheckAttempts',
                            'value': '4'
                        },
                        {
                            'key': 'timeout',
                            'value': '70'
                        },
                        {
                            'key': 'path',
                            'value': '/usr/libexec/argo-monitoring/'
                        },
                        {
                            'key': 'interval',
                            'value': '5'
                        },
                        {
                            'key': 'retryInterval',
                            'value': '3'
                        }
                    ],
                    'attribute': [
                        {
                            'key': 'argo.ams_TOKEN',
                            'value': '--token'
                        }
                    ],
                    'dependency': [],
                    'flags': [
                        {
                            'key': 'OBSESS',
                            'value': '1'
                        }
                    ],
                    'parameter': [
                        {
                            'key': '--project',
                            'value': 'EGI'
                        }
                    ]
                },
                {
                    'id': self.metrictemplate3.id,
                    'name': 'argo.AMSPublisher-Check',
                    'mtype': 'Active',
                    'description': '',
                    'ostag': ['CentOS 7'],
                    'tags': [],
                    "tenants": [],
                    'probeversion': 'ams-publisher-probe (0.1.14)',
                    'parent': '',
                    'probeexecutable': 'ams-publisher-probe',
                    'config': [
                        {
                            'key': 'interval',
                            'value': '180'
                        },
                        {
                            'key': 'maxCheckAttempts',
                            'value': '1'
                        },
                        {
                            'key': 'path',
                            'value': '/usr/libexec/argo-monitoring/probes/argo'
                        },
                        {
                            'key': 'retryInterval',
                            'value': '1'
                        },
                        {
                            'key': 'timeout',
                            'value': '120'
                        }
                    ],
                    'attribute': [],
                    'dependency': [],
                    'flags': [
                        {
                            'key': 'NOHOSTNAME',
                            'value': '1'
                        },
                        {
                            'key': 'NOTIMEOUT',
                            'value': '1'
                        },
                        {
                            'key': 'NOPUBLISH',
                            'value': '1'
                        }
                    ],
                    'parameter': [
                        {
                            'key': '-s',
                            'value': '/var/run/argo-nagios-ams-publisher/sock'
                        }
                    ]
                },
                {
                    "id": self.metrictemplate5.id,
                    "name": "argo.EGI-Connectors-Check",
                    "mtype": "Active",
                    "description": "",
                    "ostag": ["CentOS 7"],
                    "tags": ["test_tag1"],
                    "tenants": [],
                    "probeversion": "check_nrpe (3.2.1)",
                    "parent": "",
                    "probeexecutable": "check_nrpe",
                    "config": [
                        {
                            "key": "maxCheckAttempts",
                            "value": "2"
                        },
                        {
                            "key": "timeout",
                            "value": "60"
                        },
                        {
                            "key": "path",
                            "value": "/usr/lib64/nagios/plugins"
                        },
                        {
                            "key": "interval",
                            "value": "720"
                        },
                        {
                            "key": "retryInterval",
                            "value": "15"
                        }
                    ],
                    "attribute": [],
                    "dependency": [],
                    "flags": [],
                    "parameter": [
                        {
                            "key": "-c",
                            "value": "check_connectors_egi"
                        }
                    ]
                },
                {
                    "id": self.metrictemplate6.id,
                    "name": "eu.seadatanet.org.nerc-sparql-check",
                    "mtype": "Active",
                    "description": "",
                    "ostag": ["CentOS 7"],
                    "tags": [],
                    "tenants": [],
                    "probeversion": "sdc-nerq-sparq (1.0.1)",
                    "parent": "",
                    "probeexecutable": "sdc-nerq-sparql.sh",
                    "config": [
                        {
                            "key": "interval",
                            "value": "15"
                        },
                        {
                            "key": "maxCheckAttempts",
                            "value": "3"
                        },
                        {
                            "key": "path",
                            "value": "/usr/libexec/argo-monitoring/probes/"
                                     "sdc-nerc-sparql/"
                        },
                        {
                            "key": "retryInterval",
                            "value": "3"
                        },
                        {
                            "key": "timeout",
                            "value": "15"
                        }
                    ],
                    "attribute": [
                        {
                            "key": "eu.seadatanet.org.nerc-sparql_URL",
                            "value": "-H"
                        }
                    ],
                    "dependency": [],
                    "flags": [
                        {
                            "key": "OBSESS",
                            "value": "1"
                        },
                        {
                            "key": "PNP",
                            "value": "1"
                        }
                    ],
                    "parameter": []
                },
                {
                    "id": self.metrictemplate8.id,
                    "name": "grnet.agora.healthcheck",
                    "mtype": "Active",
                    "description": "",
                    "ostag": ["CentOS 6"],
                    "tags": [],
                    "tenants": ["tenant2", "test"],
                    "probeversion": "checkhealth (0.4)",
                    "parent": "",
                    "probeexecutable": "checkhealth",
                    "config": [
                        {
                            "key": "interval",
                            "value": "15"
                        },
                        {
                            "key": "maxCheckAttempts",
                            "value": "3"
                        },
                        {
                            "key": "path",
                            "value": "/usr/libexec/argo/probes/grnet-agora/"
                        },
                        {
                            "key": "retryInterval",
                            "value": "3"
                        },
                        {
                            "key": "timeout",
                            "value": "10"
                        }
                    ],
                    "attribute": [
                        {
                            "key": "AGORA_USERNAME",
                            "value": "-u"
                        },
                        {
                            "key": "AGORA_PASSWORD",
                            "value": "-p"
                        }
                    ],
                    "dependency": [],
                    "flags": [
                        {
                            "key": "OBSESS",
                            "value": "1"
                        },
                        {
                            "key": "NOTIMEOUT",
                            "value": "1"
                        }
                    ],
                    "parameter": [
                        {
                            "key": "-v",
                            "value": ""
                        },
                        {
                            "key": "-i",
                            "value": ""
                        }
                    ]
                },
                {
                    'id': self.metrictemplate2.id,
                    'name': 'org.apel.APEL-Pub',
                    'mtype': 'Passive',
                    'description': '',
                    'ostag': [],
                    'tags': ['test_tag2'],
                    "tenants": ["tenant1", "tenant2", "test"],
                    'probeversion': '',
                    'parent': '',
                    'probeexecutable': '',
                    'config': [],
                    'attribute': [],
                    'dependency': [],
                    'flags': [
                        {
                            'key': 'OBSESS',
                            'value': '1'
                        },
                        {
                            'key': 'PASSIVE',
                            'value': '1'
                        }
                    ],
                    'parameter': []
                },
                {
                    "id": self.metrictemplate4.id,
                    "name": "test.AMS-Check",
                    "mtype": "Active",
                    "description": "Description of test.AMS-Check.",
                    "ostag": ["CentOS 6"],
                    "tags": [],
                    "tenants": ["tenant1", "test"],
                    "probeversion": "ams-probe (0.1.7)",
                    "parent": "",
                    "probeexecutable": "ams-probe",
                    "config": [
                        {
                            "key": "interval",
                            "value": "180"
                        },
                        {
                            "key": "maxCheckAttempts",
                            "value": "1"
                        },
                        {
                            "key": "path",
                            "value": "/usr/libexec/argo-monitoring/probes/argo"
                        },
                        {
                            "key": "retryInterval",
                            "value": "1"
                        },
                        {
                            "key": "timeout",
                            "value": "120"
                        }
                    ],
                    "attribute": [
                        {
                            "key": "argo.ams_TOKEN",
                            "value": "--token"
                        }
                    ],
                    "dependency": [],
                    "flags": [
                        {
                            "key": "OBSESS",
                            "value": "1"
                        }
                    ],
                    "parameter": [
                        {
                            "key": "--project",
                            "value": "EGI"
                        }
                    ]
                },
                {
                    "id": self.metrictemplate7.id,
                    "name": "test2.AMS-Check",
                    "mtype": "Active",
                    "description": "Description of test.AMS-Check.",
                    "ostag": ["CentOS 6"],
                    "tags": [],
                    "tenants": [],
                    "probeversion": "ams-probe (0.1.7)",
                    "parent": "",
                    "probeexecutable": "ams-probe",
                    "config": [
                        {
                            "key": "interval",
                            "value": "180"
                        },
                        {
                            "key": "maxCheckAttempts",
                            "value": "1"
                        },
                        {
                            "key": "path",
                            "value": "/usr/libexec/argo-monitoring/probes/argo"
                        },
                        {
                            "key": "retryInterval",
                            "value": "1"
                        },
                        {
                            "key": "timeout",
                            "value": "120"
                        }
                    ],
                    "attribute": [
                        {
                            "key": "argo.ams_TOKEN",
                            "value": "--token"
                        }
                    ],
                    "dependency": [],
                    "flags": [
                        {
                            "key": "OBSESS",
                            "value": "1"
                        }
                    ],
                    "parameter": [
                        {
                            "key": "--project",
                            "value": "EGI"
                        }
                    ]
                }
            ]
        )

    def test_get_metric_template_list_regular_tenant(self):
        request = self.factory.get(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    'id': self.metrictemplate1.id,
                    'name': 'argo.AMS-Check',
                    'mtype': 'Active',
                    'description': '',
                    'ostag': ['CentOS 6', 'CentOS 7'],
                    'tags': ['internal', 'test_tag1', 'test_tag2'],
                    'probeversion': 'ams-probe (0.1.11)',
                    'parent': '',
                    'probeexecutable': 'ams-probe',
                    'config': [
                        {
                            'key': 'maxCheckAttempts',
                            'value': '4'
                        },
                        {
                            'key': 'timeout',
                            'value': '70'
                        },
                        {
                            'key': 'path',
                            'value': '/usr/libexec/argo-monitoring/'
                        },
                        {
                            'key': 'interval',
                            'value': '5'
                        },
                        {
                            'key': 'retryInterval',
                            'value': '3'
                        }
                    ],
                    'attribute': [
                        {
                            'key': 'argo.ams_TOKEN',
                            'value': '--token'
                        }
                    ],
                    'dependency': [],
                    'flags': [
                        {
                            'key': 'OBSESS',
                            'value': '1'
                        }
                    ],
                    'parameter': [
                        {
                            'key': '--project',
                            'value': 'EGI'
                        }
                    ],
                },
                {
                    'id': self.metrictemplate3.id,
                    'name': 'argo.AMSPublisher-Check',
                    'mtype': 'Active',
                    'description': '',
                    'ostag': ['CentOS 7'],
                    'tags': [],
                    'probeversion': 'ams-publisher-probe (0.1.14)',
                    'parent': '',
                    'probeexecutable': 'ams-publisher-probe',
                    'config': [
                        {
                            'key': 'interval',
                            'value': '180'
                        },
                        {
                            'key': 'maxCheckAttempts',
                            'value': '1'
                        },
                        {
                            'key': 'path',
                            'value': '/usr/libexec/argo-monitoring/probes/argo'
                        },
                        {
                            'key': 'retryInterval',
                            'value': '1'
                        },
                        {
                            'key': 'timeout',
                            'value': '120'
                        }
                    ],
                    'attribute': [],
                    'dependency': [],
                    'flags': [
                        {
                            'key': 'NOHOSTNAME',
                            'value': '1'
                        },
                        {
                            'key': 'NOTIMEOUT',
                            'value': '1'
                        },
                        {
                            'key': 'NOPUBLISH',
                            'value': '1'
                        }
                    ],
                    'parameter': [
                        {
                            'key': '-s',
                            'value': '/var/run/argo-nagios-ams-publisher/sock'
                        }
                    ]
                },
                {
                    "id": self.metrictemplate5.id,
                    "name": "argo.EGI-Connectors-Check",
                    "mtype": "Active",
                    "description": "",
                    "ostag": ["CentOS 7"],
                    "tags": ["test_tag1"],
                    "probeversion": "check_nrpe (3.2.1)",
                    "parent": "",
                    "probeexecutable": "check_nrpe",
                    "config": [
                        {
                            "key": "maxCheckAttempts",
                            "value": "2"
                        },
                        {
                            "key": "timeout",
                            "value": "60"
                        },
                        {
                            "key": "path",
                            "value": "/usr/lib64/nagios/plugins"
                        },
                        {
                            "key": "interval",
                            "value": "720"
                        },
                        {
                            "key": "retryInterval",
                            "value": "15"
                        }
                    ],
                    "attribute": [],
                    "dependency": [],
                    "flags": [],
                    "parameter": [
                        {
                            "key": "-c",
                            "value": "check_connectors_egi"
                        }
                    ]
                },
                {
                    "id": self.metrictemplate6.id,
                    "name": "eu.seadatanet.org.nerc-sparql-check",
                    "mtype": "Active",
                    "description": "",
                    "ostag": ["CentOS 7"],
                    "tags": [],
                    "probeversion": "sdc-nerq-sparq (1.0.1)",
                    "parent": "",
                    "probeexecutable": "sdc-nerq-sparql.sh",
                    "config": [
                        {
                            "key": "interval",
                            "value": "15"
                        },
                        {
                            "key": "maxCheckAttempts",
                            "value": "3"
                        },
                        {
                            "key": "path",
                            "value": "/usr/libexec/argo-monitoring/probes/"
                                     "sdc-nerc-sparql/"
                        },
                        {
                            "key": "retryInterval",
                            "value": "3"
                        },
                        {
                            "key": "timeout",
                            "value": "15"
                        }
                    ],
                    "attribute": [
                        {
                            "key": "eu.seadatanet.org.nerc-sparql_URL",
                            "value": "-H"
                        }
                    ],
                    "dependency": [],
                    "flags": [
                        {
                            "key": "OBSESS",
                            "value": "1"
                        },
                        {
                            "key": "PNP",
                            "value": "1"
                        }
                    ],
                    "parameter": []
                },
                {
                    "id": self.metrictemplate8.id,
                    "name": "grnet.agora.healthcheck",
                    "mtype": "Active",
                    "description": "",
                    "ostag": ["CentOS 6"],
                    "tags": [],
                    "probeversion": "checkhealth (0.4)",
                    "parent": "",
                    "probeexecutable": "checkhealth",
                    "config": [
                        {
                            "key": "interval",
                            "value": "15"
                        },
                        {
                            "key": "maxCheckAttempts",
                            "value": "3"
                        },
                        {
                            "key": "path",
                            "value": "/usr/libexec/argo/probes/grnet-agora/"
                        },
                        {
                            "key": "retryInterval",
                            "value": "3"
                        },
                        {
                            "key": "timeout",
                            "value": "10"
                        }
                    ],
                    "attribute": [
                        {
                            "key": "AGORA_USERNAME",
                            "value": "-u"
                        },
                        {
                            "key": "AGORA_PASSWORD",
                            "value": "-p"
                        }
                    ],
                    "dependency": [],
                    "flags": [
                        {
                            "key": "OBSESS",
                            "value": "1"
                        },
                        {
                            "key": "NOTIMEOUT",
                            "value": "1"
                        }
                    ],
                    "parameter": [
                        {
                            "key": "-v",
                            "value": ""
                        },
                        {
                            "key": "-i",
                            "value": ""
                        }
                    ]
                },
                {
                    'id': self.metrictemplate2.id,
                    'name': 'org.apel.APEL-Pub',
                    'mtype': 'Passive',
                    'description': '',
                    'ostag': [],
                    'tags': ['test_tag2'],
                    'probeversion': '',
                    'parent': '',
                    'probeexecutable': '',
                    'config': [],
                    'attribute': [],
                    'dependency': [],
                    'flags': [
                        {
                            'key': 'OBSESS',
                            'value': '1'
                        },
                        {
                            'key': 'PASSIVE',
                            'value': '1'
                        }
                    ],
                    'parameter': []
                },
                {
                    "id": self.metrictemplate4.id,
                    "name": "test.AMS-Check",
                    "mtype": "Active",
                    "description": "Description of test.AMS-Check.",
                    "ostag": ["CentOS 6"],
                    "tags": [],
                    "probeversion": "ams-probe (0.1.7)",
                    "parent": "",
                    "probeexecutable": "ams-probe",
                    "config": [
                        {
                            "key": "interval",
                            "value": "180"
                        },
                        {
                            "key": "maxCheckAttempts",
                            "value": "1"
                        },
                        {
                            "key": "path",
                            "value": "/usr/libexec/argo-monitoring/probes/argo"
                        },
                        {
                            "key": "retryInterval",
                            "value": "1"
                        },
                        {
                            "key": "timeout",
                            "value": "120"
                        }
                    ],
                    "attribute": [
                        {
                            "key": "argo.ams_TOKEN",
                            "value": "--token"
                        }
                    ],
                    "dependency": [],
                    "flags": [
                        {
                            "key": "OBSESS",
                            "value": "1"
                        }
                    ],
                    "parameter": [
                        {
                            "key": "--project",
                            "value": "EGI"
                        }
                    ]
                },
                {
                    "id": self.metrictemplate7.id,
                    "name": "test2.AMS-Check",
                    "mtype": "Active",
                    "description": "Description of test.AMS-Check.",
                    "ostag": ["CentOS 6"],
                    "tags": [],
                    "probeversion": "ams-probe (0.1.7)",
                    "parent": "",
                    "probeexecutable": "ams-probe",
                    "config": [
                        {
                            "key": "interval",
                            "value": "180"
                        },
                        {
                            "key": "maxCheckAttempts",
                            "value": "1"
                        },
                        {
                            "key": "path",
                            "value": "/usr/libexec/argo-monitoring/probes/argo"
                        },
                        {
                            "key": "retryInterval",
                            "value": "1"
                        },
                        {
                            "key": "timeout",
                            "value": "120"
                        }
                    ],
                    "attribute": [
                        {
                            "key": "argo.ams_TOKEN",
                            "value": "--token"
                        }
                    ],
                    "dependency": [],
                    "flags": [
                        {
                            "key": "OBSESS",
                            "value": "1"
                        }
                    ],
                    "parameter": [
                        {
                            "key": "--project",
                            "value": "EGI"
                        }
                    ]
                }
            ]
        )

    def test_get_metrictemplate_by_name_super_tenant(self):
        request = self.factory.get(self.url + 'argo.AMS-Check')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(
            response.data,
            {
                'id': self.metrictemplate1.id,
                'name': 'argo.AMS-Check',
                'mtype': 'Active',
                'tags': ['internal', 'test_tag1', 'test_tag2'],
                'description': '',
                'probeversion': 'ams-probe (0.1.11)',
                'parent': '',
                'probeexecutable': 'ams-probe',
                'config': [
                    {
                        'key': 'maxCheckAttempts',
                        'value': '4'
                    },
                    {
                        'key': 'timeout',
                        'value': '70'
                    },
                    {
                        'key': 'path',
                        'value': '/usr/libexec/argo-monitoring/'
                    },
                    {
                        'key': 'interval',
                        'value': '5'
                    },
                    {
                        'key': 'retryInterval',
                        'value': '3'
                    }
                ],
                'attribute': [
                    {
                        'key': 'argo.ams_TOKEN',
                        'value': '--token'
                    }
                ],
                'dependency': [],
                'flags': [
                    {
                        'key': 'OBSESS',
                        'value': '1'
                    }
                ],
                'parameter': [
                    {
                        'key': '--project',
                        'value': 'EGI'
                    }
                ]
            }
        )

    def test_get_metrictemplate_by_name_regular_tenant(self):
        request = self.factory.get(self.url + 'argo.AMS-Check')
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(
            response.data,
            {
                'id': self.metrictemplate1.id,
                'name': 'argo.AMS-Check',
                'mtype': 'Active',
                'tags': ['internal', 'test_tag1', 'test_tag2'],
                'description': '',
                'probeversion': 'ams-probe (0.1.11)',
                'parent': '',
                'probeexecutable': 'ams-probe',
                'config': [
                    {
                        'key': 'maxCheckAttempts',
                        'value': '4'
                    },
                    {
                        'key': 'timeout',
                        'value': '70'
                    },
                    {
                        'key': 'path',
                        'value': '/usr/libexec/argo-monitoring/'
                    },
                    {
                        'key': 'interval',
                        'value': '5'
                    },
                    {
                        'key': 'retryInterval',
                        'value': '3'
                    }
                ],
                'attribute': [
                    {
                        'key': 'argo.ams_TOKEN',
                        'value': '--token'
                    }
                ],
                'dependency': [],
                'flags': [
                    {
                        'key': 'OBSESS',
                        'value': '1'
                    }
                ],
                'parameter': [
                    {
                        'key': '--project',
                        'value': 'EGI'
                    }
                ]
            }
        )

    def test_get_metric_template_by_nonexisting_name_super_tenant(self):
        request = self.factory.get(self.url + 'nonexisting')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Metric template not found'})

    def test_get_metric_template_by_nonexisting_name_regular_tenant(self):
        request = self.factory.get(self.url + 'nonexisting')
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {'detail': 'Metric template not found'})


class ListMetricTemplatesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplates.as_view()
        self.url = '/api/v2/internal/metrictemplates/'

        mock_db()

        self.tenant.name = "test"
        self.tenant.save()

        self.public_tenant = Tenant.objects.get(name="public")
        self.tenant_superuser = CustUser.objects.get(username="tenant_poem")
        self.tenant_user = CustUser.objects.get(username='tenant_user')
        self.metrictemplate1 = admin_models.MetricTemplate.objects.get(
            name="argo.AMS-Check"
        )
        self.metrictemplate2 = admin_models.MetricTemplate.objects.get(
            name="org.apel.APEL-Pub"
        )
        self.metrictemplate3 = admin_models.MetricTemplate.objects.get(
            name="argo.AMSPublisher-Check"
        )
        self.metrictemplate4 = admin_models.MetricTemplate.objects.get(
            name="test.AMS-Check"
        )
        self.metrictemplate5 = admin_models.MetricTemplate.objects.get(
            name="argo.EGI-Connectors-Check"
        )
        self.metrictemplate6 = admin_models.MetricTemplate.objects.get(
            name="eu.seadatanet.org.nerc-sparql-check"
        )
        self.metrictemplate7 = admin_models.MetricTemplate.objects.get(
            name="test2.AMS-Check"
        )
        self.metrictemplate8 = admin_models.MetricTemplate.objects.get(
            name="grnet.agora.healthcheck"
        )

        self.template_active = admin_models.MetricTemplateType.objects.get(
            name="Active"
        )

        self.tag1 = admin_models.MetricTags.objects.get(name="internal")
        self.tag2 = admin_models.MetricTags.objects.get(name="deprecated")
        self.tag3 = admin_models.MetricTags.objects.get(name="test_tag1")
        self.tag4 = admin_models.MetricTags.objects.get(name="test_tag2")

        self.ams_probe_7 = admin_models.ProbeHistory.objects.get(
            name="ams-probe", comment="Initial version."
        )
        self.ams_probe_11 = admin_models.ProbeHistory.objects.get(
            name="ams-probe", comment="Newer version."
        )

        with schema_context(get_public_schema_name()):
            self.superuser = CustUser.objects.get(username="poem")
            self.user = CustUser.objects.get(username='admin_user')

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_sp_superuser(self, mock_inline, mock_sync):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(name='new-template')
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.mtype, self.template_active)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertEqual(mt.probekey, self.ams_probe_7)
        self.assertEqual(mt.description, 'New description for new-template.')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["attr-key attr-val"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertTrue(self.tag1 in versions[0].tags.all())
        self.assertTrue(self.tag3 in versions[0].tags.all())
        self.assertEqual(
            versions[0].probekey, mt.probekey
        )
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].version_user, 'poem')
        self.assertEqual(versions[0].version_comment, 'Initial version.')

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_sp_user(self, mocked_inline, mock_sync):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_tenant_superuser(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_tenant_user(self, mocked_inline, mock_sync):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_tag_sp_superuser(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'new_tag'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        new_tag = admin_models.MetricTags.objects.get(name='new_tag')
        mt = admin_models.MetricTemplate.objects.get(name='new-template')
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.mtype, self.template_active)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(new_tag in mt.tags.all())
        self.assertEqual(mt.probekey, self.ams_probe_7)
        self.assertEqual(mt.description, 'New description for new-template.')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["attr-key attr-val"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertTrue(self.tag1 in versions[0].tags.all())
        self.assertTrue(new_tag in versions[0].tags.all())
        self.assertEqual(
            versions[0].probekey, mt.probekey
        )
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].version_user, 'poem')
        self.assertEqual(versions[0].version_comment, 'Initial version.')

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_tag_sp_user(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'new_tag'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_tag_tenant_superuser(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'new_tag'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_tag_tenant_user(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'new_tag'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_tag_sp_superuser(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(name='new-template')
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.mtype, self.template_active)
        self.assertFalse(mt.tags.all())
        self.assertEqual(mt.probekey, self.ams_probe_7)
        self.assertEqual(mt.description, 'New description for new-template.')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["attr-key attr-val"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertFalse(versions[0].tags.all())
        self.assertEqual(
            versions[0].probekey, mt.probekey
        )
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].version_user, 'poem')
        self.assertEqual(versions[0].version_comment, 'Initial version.')

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_tag_sp_user(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_tag_tenant_superuser(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_tag_tenant_user(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_sync_error_sp_superuser(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_syncer_error
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["detail"],
            "Error syncing metric tags: 400 BAD REQUEST"
        )
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(name='new-template')
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.mtype, self.template_active)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertEqual(mt.probekey, self.ams_probe_7)
        self.assertEqual(mt.description, 'New description for new-template.')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["attr-key attr-val"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertTrue(self.tag1 in versions[0].tags.all())
        self.assertTrue(self.tag3 in versions[0].tags.all())
        self.assertEqual(
            versions[0].probekey, mt.probekey
        )
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)
        self.assertEqual(versions[0].version_user, 'poem')
        self.assertEqual(versions[0].version_comment, 'Initial version.')

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_sync_error_sp_user(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_syncer_error
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_sync_error_tenant_superuser(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_syncer_error
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_sync_error_tenant_user(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_syncer_error
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'cloned_from': '',
            'name': 'new-template',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag1'],
            'description': 'New description for new-template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': 'attr-key', 'value': 'attr-val'}]),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='new-template'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            name='new-template'
        )
        self.assertEqual(versions.count(), 0)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_existing_name_sp_superuser(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'Metric template with this name already exists.'
        )
        self.assertFalse(mock_sync.called)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_existing_name_sp_user(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_existing_name_tenant_superuser(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_existing_name_tenant_user(
            self, mocked_inline, mock_sync
    ):
        mocked_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'argo.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_probeversion_sp_superuser(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting (0.1.1)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Probe version does not exist.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_probeversion_sp_user(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting (0.1.1)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_probeversion_tenant_sprusr(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting (0.1.1)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_nonexisting_probeversion_tenant_user(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting (0.1.1)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_specifying_probes_version_sp_suprusr(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Probe version not specified.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_specifying_probes_version_sp_user(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_specifying_probes_version_tenant_spu(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_without_specifying_probes_version_tenant_usr(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'nonexisting',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_missing_data_key_sp_superuser(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Missing data key: flags'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_missing_data_key_sp_user(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_missing_data_key_tenant_superuser(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_post_metric_template_with_missing_data_key_tenant_user(
            self, mock_inline, mock_sync
    ):
        mock_inline.side_effect = mocked_inline_metric_for_db
        mock_sync.side_effect = mocked_func
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path',
             'value': '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'name': 'test.AMS-Check',
            'probeversion': 'ams-probe (0.1.7)',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'Description of argo.AMS-Check metric template.',
            'probeexecutable': 'ams-probe',
            'parent': '',
            'config': json.dumps(conf),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}])
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to add metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey_sp_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        update.assert_called_once()
        update.assert_called_with(mt, 'argo.AMS-Check', self.ams_probe_11)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "maxCheckAttempts", "retryInterval", '
                '"timeout"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag1"]}}',
                '{"added": {"fields": ["description", "parent"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(
            mt.description, 'New description for the metric template.'
        )
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey_tenant_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey_tenant_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_sync_error_sp_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_syncer_error
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["detail"],
            "Error syncing metric tags: 400 BAD REQUEST"
        )
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        update.assert_called_once()
        update.assert_called_with(mt, 'argo.AMS-Check', self.ams_probe_11)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "maxCheckAttempts", "retryInterval", '
                '"timeout"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag1"]}}',
                '{"added": {"fields": ["description", "parent"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(
            mt.description, 'New description for the metric template.'
        )
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_sync_error_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_syncer_error
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_sync_error_tenant_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_syncer_error
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_sync_error_tenant_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_syncer_error
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_mttemplate_without_changing_prbkey_with_nonexist_tag_sp_spusr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'new_tag'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        new_tag = admin_models.MetricTags.objects.get(name='new_tag')
        update.assert_called_once()
        update.assert_called_with(mt, 'argo.AMS-Check', self.ams_probe_11)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "maxCheckAttempts", "retryInterval", '
                '"timeout"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["tags"], "object": ["new_tag"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag2"]}}',
                '{"added": {"fields": ["description", "parent"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(new_tag in mt.tags.all())
        self.assertEqual(
            mt.description, 'New description for the metric template.'
        )
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_mttemplate_without_changing_prbkey_with_nonexist_tag_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'new_tag'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_mttemplate_without_changing_prbkey_with_nonexist_tag_ten_susr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'new_tag'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_mttemplate_without_changing_prbkey_with_nonexist_tag_tenn_usr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'new_tag'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(mock_sync.called)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey_with_no_tag_sp_spusr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        update.assert_called_once()
        update.assert_called_with(mt, 'argo.AMS-Check', self.ams_probe_11)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "maxCheckAttempts", "retryInterval", '
                '"timeout"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag1"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag2"]}}',
                '{"added": {"fields": ["description", "parent"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 0)
        self.assertEqual(
            mt.description, 'New description for the metric template.'
        )
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey_with_no_tag_sp_usr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey_with_no_tag_tenn_sus(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_changing_probekey_with_no_tag_tenn_usr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_sp_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.14)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(update.called)
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 3)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "path", "retryInterval"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["description", "parent"]}}',
                '{"changed": {"fields": ["name", '
                '"probeexecutable", "probekey"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe-new"]')
        self.assertEqual(mt.description, 'New description.')
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 2)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_tenant_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 2)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_tenant_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 2)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_nonexisting_tag_sp_superusr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'new_tag'],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.14)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(update.called)
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        new_tag = admin_models.MetricTags.objects.get(name='new_tag')
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 3)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "path", "retryInterval"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["description", "parent"]}}',
                '{"added": {"fields": ["tags"], "object": ["new_tag"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag2"]}}',
                '{"changed": {"fields": ["name", '
                '"probeexecutable", "probekey"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(new_tag in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe-new"]')
        self.assertEqual(mt.description, 'New description.')
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_nonexisting_tag_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'new_tag'],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 2)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_nonexisting_tag_tenant_susr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'new_tag'],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 2)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_nonexisting_tag_tenant_usr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'new_tag'],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name='new_tag'
        )
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 2)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_no_tag_sp_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.14)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(update.called)
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 3)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "path", "retryInterval"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["description", "parent"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag1"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["test_tag2"]}}',
                '{"changed": {"fields": ["name", '
                '"probeexecutable", "probekey"]}}',
                '{"deleted": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 0)
        self.assertEqual(mt.probeexecutable, '["ams-probe-new"]')
        self.assertEqual(mt.description, 'New description.')
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_no_tag_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 2)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_no_tag_tenant_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 2)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.description,
            'Some description of argo.AMS-Check metric template.'
        )
        self.assertEqual(mt.parent, '')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_no_tag_tenant_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 2)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_new_probekey_no_tag_tenant_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': [],
            'description': 'New description.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe-new',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 2)
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_passive_metric_template_sp_superusr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'id': self.metrictemplate2.id,
            'name': 'org.apel.APEL-Pub-new',
            'probeversion': '',
            'description': 'Added description for org.apel.APEL-Pub-new.',
            'mtype': 'Passive',
            'tags': ['test_tag1'],
            'probeexecutable': '',
            'parent': '',
            'config': json.dumps([{'key': '', 'value': ''}]),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': 'PASSIVE', 'value': '1'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate2.id)
        update.assert_called_once()
        update.assert_called_with(mt, 'org.apel.APEL-Pub', None)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.name, 'org.apel.APEL-Pub-new')
        self.assertEqual(mt.mtype.name, 'Passive')
        self.assertEqual(len(mt.tags.all()), 1)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertEqual(
            mt.description, 'Added description for org.apel.APEL-Pub-new.'
        )
        self.assertEqual(mt.probeexecutable, '')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.config, '')
        self.assertEqual(mt.attribute, '')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["PASSIVE 1"]')
        self.assertEqual(mt.parameter, '')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_passive_metric_template_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'id': self.metrictemplate2.id,
            'name': 'org.apel.APEL-Pub-new',
            'probeversion': '',
            'description': 'Added description for org.apel.APEL-Pub-new.',
            'mtype': 'Passive',
            'tags': ['test_tag1'],
            'probeexecutable': '',
            'parent': '',
            'config': json.dumps([{'key': '', 'value': ''}]),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': 'PASSIVE', 'value': '1'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate2.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.name, 'org.apel.APEL-Pub')
        self.assertEqual(mt.mtype.name, 'Passive')
        self.assertEqual(len(mt.tags.all()), 1)
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, '')
        self.assertEqual(mt.probeexecutable, '')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.config, '')
        self.assertEqual(mt.attribute, '')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1", "PASSIVE 1"]')
        self.assertEqual(mt.parameter, '')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_passive_metric_template_tenant_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'id': self.metrictemplate2.id,
            'name': 'org.apel.APEL-Pub-new',
            'probeversion': '',
            'description': 'Added description for org.apel.APEL-Pub-new.',
            'mtype': 'Passive',
            'tags': ['test_tag1'],
            'probeexecutable': '',
            'parent': '',
            'config': json.dumps([{'key': '', 'value': ''}]),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': 'PASSIVE', 'value': '1'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate2.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.name, 'org.apel.APEL-Pub')
        self.assertEqual(mt.mtype.name, 'Passive')
        self.assertEqual(len(mt.tags.all()), 1)
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, '')
        self.assertEqual(mt.probeexecutable, '')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.config, '')
        self.assertEqual(mt.attribute, '')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1", "PASSIVE 1"]')
        self.assertEqual(mt.parameter, '')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_passive_metric_template_tenant_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'id': self.metrictemplate2.id,
            'name': 'org.apel.APEL-Pub-new',
            'probeversion': '',
            'description': 'Added description for org.apel.APEL-Pub-new.',
            'mtype': 'Passive',
            'tags': ['test_tag1'],
            'probeexecutable': '',
            'parent': '',
            'config': json.dumps([{'key': '', 'value': ''}]),
            'attribute': json.dumps([{'key': '', 'value': ''}]),
            'dependency': json.dumps([{'key': '', 'value': ''}]),
            'parameter': json.dumps([{'key': '', 'value': ''}]),
            'flags': json.dumps([{'key': 'PASSIVE', 'value': '1'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate2.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        )
        self.assertEqual(versions.count(), 1)
        self.assertEqual(mt.name, 'org.apel.APEL-Pub')
        self.assertEqual(mt.mtype.name, 'Passive')
        self.assertEqual(len(mt.tags.all()), 1)
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, '')
        self.assertEqual(mt.probeexecutable, '')
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.config, '')
        self.assertEqual(mt.attribute, '')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1", "PASSIVE 1"]')
        self.assertEqual(mt.parameter, '')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].description, mt.description)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_existing_name_sp_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'org.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'ams-probe (0.1.7)',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'Metric template with this name already exists.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_existing_name_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'org.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'ams-probe (0.1.7)',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_existing_name_tenant_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'org.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'ams-probe (0.1.7)',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_existing_name_tenant_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'org.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'ams-probe (0.1.7)',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_nonexisting_probeversion_sp_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'test.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'nonexisting (1.0.0)',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Probe version does not exist.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_nonexisting_probeversion_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'test.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'nonexisting (1.0.0)',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_nonexisting_probeversion_tenant_superusr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'test.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'nonexisting (1.0.0)',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_with_nonexisting_probeversion_tenant_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'test.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'nonexisting (1.0.0)',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_specifying_probes_version_sp_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'test.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'nonexisting',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Probe version not specified.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_specifying_probes_version_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'test.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'nonexisting',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_specifying_probes_version_tenn_suprusr(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'test.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'nonexisting',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_without_specifying_probes_version_tenn_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '3'},
            {'key': 'timeout', 'value': '60'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '5'},
            {'key': 'retryInterval', 'value': '3'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'test.apel.APEL-Pub',
            'mtype': self.template_active,
            'tags': ['test_tag1', 'test_tag2'],
            'probeversion': 'nonexisting',
            'description': self.metrictemplate1.description,
            'parent': '',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        self.assertFalse(update.called)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplates_with_update_err_msgs(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.return_value = [
            'TENANT1: Error trying to update metric in metric profiles.\n'
            'Please update metric profiles manually.',
            'TENANT2: Error trying to update metric in metric profiles.\n'
            'Please update metric profiles manually.'
        ]
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['test_tag1', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}]),
            'flags': json.dumps([{'key': 'flag-key', 'value': 'flag-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_418_IM_A_TEAPOT)
        self.assertEqual(
            response.data,
            {
                'detail': 'TENANT1: Error trying to update metric in metric '
                          'profiles.\nPlease update metric profiles manually.\n'
                          'TENANT2: Error trying to update metric in metric '
                          'profiles.\nPlease update metric profiles manually.'
            }
        )
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        update.assert_called_once_with(mt, 'argo.AMS-Check', self.ams_probe_11)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["interval", "maxCheckAttempts", "retryInterval", '
                '"timeout"]}}',
                '{"deleted": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN"]}}',
                '{"added": {"fields": ["attribute"], '
                '"object": ["argo.ams_TOKEN2"]}}',
                '{"added": {"fields": ["dependency"], "object": ["dep-key"]}}',
                '{"deleted": {"fields": ["flags"], "object": ["OBSESS"]}}',
                '{"added": {"fields": ["flags"], "object": ["flag-key"]}}',
                '{"deleted": {"fields": ["parameter"], '
                '"object": ["--project"]}}',
                '{"added": {"fields": ["parameter"], "object": ["par-key"]}}',
                '{"added": {"fields": ["description", "parent"]}}',
                '{"changed": {"fields": ["name", "probekey"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check-new')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 2)
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(
            mt.description, 'New description for the metric template.'
        )
        self.assertEqual(mt.parent, '["argo.AMS-Check"]')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/probes/argo", '
            '"interval 6", "retryInterval 4"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN2 --token"]')
        self.assertEqual(mt.dependency, '["dep-key dep-val"]')
        self.assertEqual(mt.flags, '["flag-key flag-val"]')
        self.assertEqual(mt.parameter, '["par-key par-val"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_missing_data_key_sp_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.11)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        self.assertEqual(response.data['detail'], 'Missing data key: flags')
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_missing_data_key_sp_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_missing_data_key_tenant_superuser(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    @patch('Poem.api.internal_views.metrictemplates.update_metrics')
    @patch('Poem.api.internal_views.metrictemplates.inline_metric_for_db')
    def test_put_metrictemplate_missing_data_key_tenant_user(
            self, inline, update, mock_sync
    ):
        inline.side_effect = mocked_inline_metric_for_db
        update.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        attr = [
            {'key': 'argo.ams_TOKEN2', 'value': '--token'}
        ]
        conf = [
            {'key': 'maxCheckAttempts', 'value': '4'},
            {'key': 'timeout', 'value': '70'},
            {'key': 'path', 'value':
                '/usr/libexec/argo-monitoring/probes/argo'},
            {'key': 'interval', 'value': '6'},
            {'key': 'retryInterval', 'value': '4'}
        ]
        data = {
            'id': self.metrictemplate1.id,
            'name': 'argo.AMS-Check-new',
            'mtype': 'Active',
            'tags': ['internal', 'test_tag2'],
            'description': 'New description for the metric template.',
            'probeversion': 'ams-probe (0.1.8)',
            'parent': 'argo.AMS-Check',
            'probeexecutable': 'ams-probe',
            'config': json.dumps(conf),
            'attribute': json.dumps(attr),
            'dependency': json.dumps([{'key': 'dep-key', 'value': 'dep-val'}]),
            'parameter': json.dumps([{'key': 'par-key', 'value': 'par-val'}])
        }
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to change metric templates.'
        )
        self.assertFalse(update.called)
        self.assertFalse(mock_sync.called)
        mt = admin_models.MetricTemplate.objects.get(id=self.metrictemplate1.id)
        versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=mt
        ).order_by('-date_created')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions[1].version_comment, 'Initial version.')
        comment_set = set()
        for item in json.loads(versions[0].version_comment):
            comment_set.add(json.dumps(item))
        self.assertEqual(
            comment_set,
            {
                '{"changed": {"fields": ["config"], '
                '"object": ["maxCheckAttempts", "path", "timeout"]}}',
                '{"changed": {"fields": ["probekey"]}}',
                '{"added": {"fields": ["tags"], "object": ["internal"]}}'
            }
        )
        self.assertEqual(mt.name, 'argo.AMS-Check')
        self.assertEqual(mt.mtype.name, 'Active')
        self.assertEqual(len(mt.tags.all()), 3)
        self.assertTrue(self.tag1 in mt.tags.all())
        self.assertTrue(self.tag3 in mt.tags.all())
        self.assertTrue(self.tag4 in mt.tags.all())
        self.assertEqual(mt.description, "")
        self.assertEqual(mt.parent, '')
        self.assertEqual(mt.probeexecutable, '["ams-probe"]')
        self.assertEqual(
            mt.config,
            '["maxCheckAttempts 4", "timeout 70", '
            '"path /usr/libexec/argo-monitoring/", '
            '"interval 5", "retryInterval 3"]'
        )
        self.assertEqual(mt.attribute, '["argo.ams_TOKEN --token"]')
        self.assertEqual(mt.dependency, '')
        self.assertEqual(mt.flags, '["OBSESS 1"]')
        self.assertEqual(mt.parameter, '["--project EGI"]')
        self.assertEqual(versions[0].name, mt.name)
        self.assertEqual(versions[0].mtype, mt.mtype)
        self.assertEqual(set(versions[0].tags.all()), set(mt.tags.all()))
        self.assertEqual(versions[0].probekey, mt.probekey)
        self.assertEqual(versions[0].parent, mt.parent)
        self.assertEqual(versions[0].probeexecutable, mt.probeexecutable)
        self.assertEqual(versions[0].config, mt.config)
        self.assertEqual(versions[0].attribute, mt.attribute)
        self.assertEqual(versions[0].dependency, mt.dependency)
        self.assertEqual(versions[0].flags, mt.flags)
        self.assertEqual(versions[0].parameter, mt.parameter)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_sp_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.delete(self.url + 'argo.AMS-Check')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 7)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_sp_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.delete(self.url + 'argo.AMS-Check')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_tenant_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.delete(self.url + 'argo.AMS-Check')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_tenant_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.delete(self.url + 'argo.AMS-Check')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_error_sync_sp_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_syncer_error
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.delete(self.url + 'argo.AMS-Check')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            response.data["detail"],
            "Error syncing metric tags: 400 BAD REQUEST"
        )
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 7)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_error_sync_sp_user(self, mock_sync):
        mock_sync.side_effect = mocked_syncer_error
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.delete(self.url + 'argo.AMS-Check')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_error_sync_tenant_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_syncer_error
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.delete(self.url + 'argo.AMS-Check')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_error_sync_tenant_user(self, mock_sync):
        mock_sync.side_effect = mocked_syncer_error
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.delete(self.url + 'argo.AMS-Check')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'argo.AMS-Check')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_nonexisting_metric_template_sp_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        request = self.factory.delete(self.url + 'nonexisting')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data['detail'], 'Metric template does not exist.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_nonexisting_metric_template_sp_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        request = self.factory.delete(self.url + 'nonexisting')
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_nonexisting_metric_template_tenant_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        request = self.factory.delete(self.url + 'nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_nonexisting_metric_template_tenant_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        request = self.factory.delete(self.url + 'nonexisting')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, 'nonexisting')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_without_specifying_name_sp_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        request = self.factory.delete(self.url)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'], 'Metric template name not specified.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_without_specifying_name_sp_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        request = self.factory.delete(self.url)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_without_specifying_name_tenant_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        request = self.factory.delete(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_template_without_specifying_name_tenant_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        request = self.factory.delete(self.url)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)


class ListMetricTemplateTypesAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplateTypes.as_view()
        self.url = '/api/v2/internal/mttypes/'

        mock_db()

        self.user = CustUser.objects.get(username='tenant_poem')

    def test_get_metric_template_types(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            [r for r in response.data],
            [
                'Active',
                'Passive'
            ]
        )


class ListMetricTemplatesForProbeVersionAPIViewTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTemplatesForProbeVersion.as_view()
        self.url = '/api/v2/internal/metricsforprobes/'

        mock_db()

        self.user = CustUser.objects.get(username='tenant_user')

    def test_get_metric_templates_for_probe_version(self):
        request = self.factory.get(self.url + 'ams-probe(0.1.7)')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ams-probe(0.1.7)')
        self.assertEqual(
            [r for r in response.data],
            ['test2.AMS-Check', 'test.AMS-Check']
        )

    def test_get_metric_templates_if_empty(self):
        request = self.factory.get(self.url + 'ams-publisher-probe(0.1.7)')
        force_authenticate(request, user=self.user)
        response = self.view(request, 'ams-publisher-probe(0.1.7)')
        self.assertEqual(list(response.data), [])


class ListAvailableMetricTemplatesAPIViewTests(TenantTestCase):
    def setUp(self) -> None:
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListAvailableMetricTemplates.as_view()
        self.url = "/api/v2/internal/availmetrictemplates"

        mock_db()

        self.user = CustUser.objects.get(username='tenant_poem')

    def test_get_available_metrictemplates_if_no_auth(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_available_metrictemplates(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data, [
                {"name": "argo.AMS-Check"},
                {"name": "argo.AMSPublisher-Check"},
                {"name": "argo.EGI-Connectors-Check"},
                {"name": "eu.seadatanet.org.nerc-sparql-check"},
                {"name": "eudat.itsm.spmt-healthcheck"},
                {"name": "org.apel.APEL-Pub"},
                {"name": "test.AMS-Check"},
                {"name": "test2.AMS-Check"}
            ]
        )


class BulkDeleteMetricTemplatesTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.BulkDeleteMetricTemplates.as_view()
        self.url = '/api/v2/internal/deletetemplates/'

        mock_db()

        self.tenant_superuser = CustUser.objects.get(username="tenant_poem")
        self.tenant_user = CustUser.objects.get(username="tenant_user")

        with schema_context(get_public_schema_name()):
            self.sp_tenant = Tenant.objects.get(name="public")
            self.superuser = CustUser.objects.get(username="poem")
            self.user = CustUser.objects.get(username="admin_user")

        self.metric = poem_models.Metric.objects.get(name="test.AMS-Check")

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_sp_superuser(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted."
            }
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 6)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='argo.AMS-Check'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertEqual(mock_delete.call_count, 2)
        mock_delete.assert_has_calls([
            call('PROFILE1', ['test.AMS-Check'], "TENANT"),
            call('PROFILE2', ['test.AMS-Check'], "TENANT")
        ])
        mock_sync.assert_called_once()

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_sp_user(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            1
        )
        self.assertFalse(mock_delete.called)
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_tenant_superuser(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            1
        )
        self.assertFalse(mock_delete.called)
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_tenant_user(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            1
        )
        self.assertFalse(mock_delete.called)
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_sync_error_sp_superuser(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_syncer_error
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted.",
                "warning": "Error syncing metric tags: 400 BAD REQUEST"
            }
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 6)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='argo.AMS-Check'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertEqual(mock_delete.call_count, 2)
        mock_delete.assert_has_calls([
            call('PROFILE1', ['test.AMS-Check'], "TENANT"),
            call('PROFILE2', ['test.AMS-Check'], "TENANT")
        ])
        mock_sync.assert_called_once()

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_one_metric_templates_sp_superuser(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {'metrictemplates': ['test.AMS-Check']}
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {"info": "Metric template test.AMS-Check successfully deleted."}
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 7)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertEqual(mock_delete.call_count, 2)
        mock_delete.assert_has_calls([
            call('PROFILE1', ['test.AMS-Check'], "TENANT"),
            call('PROFILE2', ['test.AMS-Check'], "TENANT")
        ])
        mock_sync.assert_called_once()

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_one_metric_templates_sp_user(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {'metrictemplates': ['test.AMS-Check']}
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            1
        )
        self.assertFalse(mock_delete.called)
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_one_metric_templates_tenant_superuser(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {'metrictemplates': ['test.AMS-Check']}
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            1
        )
        self.assertFalse(mock_delete.called)
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_one_metric_templates_tenant_user(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {'metrictemplates': ['test.AMS-Check']}
        assert self.metric
        metric_id = self.metric.id
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            1
        )
        self.assertFalse(mock_delete.called)
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_get_exception_sp_superuser(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.side_effect = Exception(
            'Error fetching WEB API data: API key not found'
        )
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted.",
                "warning": "test: Metrics are not removed from metric "
                           "profiles. Unable to get metric profiles: "
                           "Error fetching WEB API data: API key not found"
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 6)
        metric_history = poem_models.TenantHistory.objects.filter(
            object_id=self.metric.id
        )
        assert self.metric, metric_history
        mock_sync.assert_called_once()

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_get_exception_sp_user(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.side_effect = Exception(
            'Error fetching WEB API data: API key not found'
        )
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        metric_history = poem_models.TenantHistory.objects.filter(
            object_id=self.metric.id
        )
        assert self.metric, metric_history
        self.assertFalse(mock_delete.called)
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_get_exception_tenant_superuser(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.side_effect = Exception(
            'Error fetching WEB API data: API key not found'
        )
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        metric_history = poem_models.TenantHistory.objects.filter(
            object_id=self.metric.id
        )
        assert self.metric, metric_history
        self.assertFalse(mock_delete.called)
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_get_exception_tenant_user(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.side_effect = Exception(
            'Error fetching WEB API data: API key not found'
        )
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        self.assertEqual(admin_models.MetricTemplate.objects.all().count(), 8)
        metric_history = poem_models.TenantHistory.objects.filter(
            object_id=self.metric.id
        )
        assert self.metric, metric_history
        self.assertFalse(mock_delete.called)
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_get_requests_exception_sp_sprusr(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.side_effect = requests.exceptions.HTTPError('Exception')
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted.",
                "warning": "test: Metrics are not removed from metric profiles."
                           " Unable to get metric profiles: Exception"
            }
        )
        metric_history = poem_models.TenantHistory.objects.filter(
            object_id=self.metric.id
        )
        assert self.metric, metric_history
        mock_sync.assert_called_once()

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_get_requests_exception_sp_user(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.side_effect = requests.exceptions.HTTPError('Exception')
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        metric_history = poem_models.TenantHistory.objects.filter(
            object_id=self.metric.id
        )
        assert self.metric, metric_history
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_get_requests_exception_tenant_susr(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.side_effect = requests.exceptions.HTTPError('Exception')
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        metric_history = poem_models.TenantHistory.objects.filter(
            object_id=self.metric.id
        )
        assert self.metric, metric_history
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_get_requests_exception_tenant_user(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.side_effect = requests.exceptions.HTTPError('Exception')
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to delete metric templates.'
        )
        metric_history = poem_models.TenantHistory.objects.filter(
            object_id=self.metric.id
        )
        assert self.metric, metric_history
        self.assertFalse(mock_sync.called)

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_delete_profile_exception_sp_spusr(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = Exception(
            'Error deleting metric from profile: Something went wrong'
        )
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        metric_id = self.metric.id
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted.",
                "warning": "test: Metric test.AMS-Check not deleted "
                           "from profile PROFILE1: Error deleting metric from "
                           "profile: Something went wrong; "
                           "test: Metric test.AMS-Check not deleted from "
                           "profile PROFILE2: Error deleting metric from "
                           "profile: Something went wrong"
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='argo.AMS-Check'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertEqual(mock_delete.call_count, 2)
        mock_delete.assert_has_calls([
            call('PROFILE1', ['test.AMS-Check'], "TENANT"),
            call('PROFILE2', ['test.AMS-Check'], "TENANT")
        ])
        mock_sync.assert_called_once()

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_metric_not_in_profile(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {}
        mock_delete.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        metric_id = self.metric.id
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted."
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='argo.AMS-Check'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertFalse(mock_delete.called)
        mock_sync.assert_called_once()

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_if_metric_not_in_profile(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {}
        mock_delete.side_effect = mocked_func
        mock_sync.side_effect = mocked_func
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        metric_id = self.metric.id
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted."
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='argo.AMS-Check'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertFalse(mock_delete.called)
        mock_sync.assert_called_once()

    @patch('Poem.api.internal_views.metrictemplates.sync_tags_webapi')
    @patch(
        'Poem.api.internal_views.metrictemplates.delete_metrics_from_profile')
    @patch('Poem.api.internal_views.metrictemplates.get_metrics_in_profiles')
    def test_bulk_delete_metric_templates_sync_error_with_other_excp_sp_spusr(
            self, mock_get, mock_delete, mock_sync
    ):
        mock_get.return_value = {'test.AMS-Check': ['PROFILE1', 'PROFILE2']}
        mock_delete.side_effect = Exception(
            'Error deleting metric from profile: Something went wrong'
        )
        mock_sync.side_effect = mocked_syncer_error
        data = {
            'metrictemplates': ['argo.AMS-Check', 'test.AMS-Check']
        }
        metric_id = self.metric.id
        request = self.factory.post(self.url, data, format='json')
        request.tenant = self.sp_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            {
                "info": "Metric templates argo.AMS-Check, test.AMS-Check "
                        "successfully deleted.",
                "warning": "test: Metric test.AMS-Check not deleted "
                           "from profile PROFILE1: Error deleting metric from "
                           "profile: Something went wrong; "
                           "test: Metric test.AMS-Check not deleted from "
                           "profile PROFILE2: Error deleting metric from "
                           "profile: Something went wrong\n"
                           "Error syncing metric tags: 400 BAD REQUEST"
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='argo.AMS-Check'
        )
        self.assertRaises(
            admin_models.MetricTemplate.DoesNotExist,
            admin_models.MetricTemplate.objects.get,
            name='test.AMS-Check'
        )
        self.assertRaises(
            poem_models.Metric.DoesNotExist,
            poem_models.Metric.objects.get,
            name='test.AMS-Check'
        )
        self.assertEqual(
            len(poem_models.TenantHistory.objects.filter(object_id=metric_id)),
            0
        )
        self.assertEqual(mock_delete.call_count, 2)
        mock_delete.assert_has_calls([
            call('PROFILE1', ['test.AMS-Check'], "TENANT"),
            call('PROFILE2', ['test.AMS-Check'], "TENANT")
        ])
        mock_sync.assert_called_once()


class MetricTagsTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListMetricTags.as_view()
        self.url = '/api/v2/internal/metrictags/'

        mock_db()

        self.tenant_superuser = CustUser.objects.get(username="tenant_poem")
        self.tenant_user = CustUser.objects.get(username="tenant_user")

        with schema_context(get_public_schema_name()):
            self.superuser = CustUser.objects.get(username="poem")
            self.user = CustUser.objects.get(username='admin_user')

            self.public_tenant = Tenant.objects.get(name="public")

        self.tag1 = admin_models.MetricTags.objects.get(name='internal')
        self.tag2 = admin_models.MetricTags.objects.get(name='deprecated')
        self.tag3 = admin_models.MetricTags.objects.get(name='test_tag1')
        self.tag4 = admin_models.MetricTags.objects.get(name='test_tag2')

        self.mt1 = admin_models.MetricTemplate.objects.get(
            name="argo.AMS-Check"
        )
        mt1_versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=self.mt1
        ).order_by("-date_created")
        self.mt1_version1 = mt1_versions[1]
        self.mt1_version2 = mt1_versions[0]
        self.mt2 = admin_models.MetricTemplate.objects.get(
            name="org.apel.APEL-Pub"
        )
        self.mt2_version1 = admin_models.MetricTemplateHistory.objects.filter(
            object_id=self.mt2
        ).order_by('-date_created')[0]
        self.mt3 = admin_models.MetricTemplate.objects.get(
            name="argo.AMSPublisher-Check"
        )
        self.mt3_version1 = admin_models.MetricTemplateHistory.objects.filter(
            object_id=self.mt3
        ).order_by('-date_created')[0]
        self.mt4 = admin_models.MetricTemplate.objects.get(
            name="test.AMS-Check"
        )
        self.mt4_version1 = admin_models.MetricTemplateHistory.objects.filter(
            object_id=self.mt4
        ).order_by('-date_created')[0]
        self.mt5 = admin_models.MetricTemplate.objects.get(
            name="argo.EGI-Connectors-Check"
        )
        mt5_versions = admin_models.MetricTemplateHistory.objects.filter(
            object_id=self.mt5
        ).order_by('-date_created')
        self.mt5_version1 = mt5_versions[1]
        self.mt5_version2 = mt5_versions[0]
        self.mt6 = admin_models.MetricTemplate.objects.get(
            name="eu.seadatanet.org.nerc-sparql-check"
        )
        self.mt6_version1 = admin_models.MetricTemplateHistory.objects.filter(
            object_id=self.mt6
        ).order_by('-date_created')[0]
        self.mt7 = admin_models.MetricTemplate.objects.get(
            name="test2.AMS-Check"
        )
        self.mt7_version1 = admin_models.MetricTemplateHistory.objects.filter(
            object_id=self.mt7
        ).order_by('-date_created')[0]
        self.metric1 = poem_models.Metric.objects.get(
            name="test.AMS-Check"
        )
        self.metric1_history = json.loads(
            poem_models.TenantHistory.objects.filter(
                object_id=self.metric1.id
            ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.metric2 = poem_models.Metric.objects.get(
            name="org.apel.APEL-Pub"
        )
        self.metric2_history = json.loads(
            poem_models.TenantHistory.objects.filter(
                object_id=self.metric2.id
            ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.metric3 = poem_models.Metric.objects.get(
            name="argo.AMS-Check"
        )
        self.metric3_history = json.loads(
            poem_models.TenantHistory.objects.filter(
                object_id=self.metric3.id
            ).order_by("-date_created")[0].serialized_data)[0]["fields"]

    def test_get_metric_tags_admin_superuser(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.tag2.id,
                    "name": "deprecated",
                    "metrics": []
                },
                {
                    "id": self.tag1.id,
                    "name": "internal",
                    "metrics": [{
                        "name": "argo.AMS-Check"
                    }]
                },
                {
                    "id": self.tag3.id,
                    "name": "test_tag1",
                    "metrics": [
                        {"name": "argo.AMS-Check"},
                        {"name": "argo.EGI-Connectors-Check"}
                    ]
                },
                {
                    "id": self.tag4.id,
                    "name": "test_tag2",
                    "metrics": [
                        {"name": "argo.AMS-Check"},
                        {"name": "org.apel.APEL-Pub"}
                    ]
                }
            ]
        )

    def test_get_metric_tags_admin_regular_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.tag2.id,
                    "name": "deprecated",
                    "metrics": []
                },
                {
                    "id": self.tag1.id,
                    "name": "internal",
                    "metrics": [
                        {"name": "argo.AMS-Check"}
                    ]
                },
                {
                    "id": self.tag3.id,
                    "name": "test_tag1",
                    "metrics": [
                        {"name": "argo.AMS-Check"},
                        {"name": "argo.EGI-Connectors-Check"}
                    ]
                },
                {
                    "id": self.tag4.id,
                    "name": "test_tag2",
                    "metrics": [
                        {"name": "argo.AMS-Check"},
                        {"name": "org.apel.APEL-Pub"}
                    ]
                }
            ]
        )

    def test_get_metric_tags_tenant_superuser(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.tag2.id,
                    "name": "deprecated",
                    "metrics": []
                },
                {
                    "id": self.tag1.id,
                    "name": "internal",
                    "metrics": [
                        {"name": "argo.AMS-Check"}
                    ]
                },
                {
                    "id": self.tag3.id,
                    "name": "test_tag1",
                    "metrics": [
                        {"name": "argo.AMS-Check"},
                        {"name": "argo.EGI-Connectors-Check"}
                    ]
                },
                {
                    "id": self.tag4.id,
                    "name": "test_tag2",
                    "metrics": [
                        {"name": "argo.AMS-Check"},
                        {"name": "org.apel.APEL-Pub"}
                    ]
                }
            ]
        )

    def test_get_metric_tags_tenant_regular_user(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.tag2.id,
                    "name": "deprecated",
                    "metrics": []
                },
                {
                    "id": self.tag1.id,
                    "name": "internal",
                    "metrics": [
                        {"name": "argo.AMS-Check"}
                    ]
                },
                {
                    "id": self.tag3.id,
                    "name": "test_tag1",
                    "metrics": [
                        {"name": "argo.AMS-Check"},
                        {"name": "argo.EGI-Connectors-Check"}
                    ]
                },
                {
                    "id": self.tag4.id,
                    "name": "test_tag2",
                    "metrics": [
                        {"name": "argo.AMS-Check"},
                        {"name": "org.apel.APEL-Pub"}
                    ]
                }
            ]
        )

    def test_get_metric_tags_if_not_auth(self):
        request = self.factory.get(self.url)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_metric_tag_by_name_admin_superuser(self):
        request = self.factory.get(self.url + "internal")
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "internal")
        self.assertEqual(
            response.data,
            {
                "id": self.tag1.id,
                "name": "internal",
                "metrics": [
                    {"name": "argo.AMS-Check"}
                ]
            }
        )

    def test_get_metric_tag_by_name_admin_regular_user(self):
        request = self.factory.get(self.url + "internal")
        force_authenticate(request, user=self.user)
        response = self.view(request, "internal")
        self.assertEqual(
            response.data,
            {
                "id": self.tag1.id,
                "name": "internal",
                "metrics": [
                    {"name": "argo.AMS-Check"}
                ]
            }
        )

    def test_get_metric_tag_by_name_tenant_superuser(self):
        request = self.factory.get(self.url + "internal")
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, "internal")
        self.assertEqual(
            response.data,
            {
                "id": self.tag1.id,
                "name": "internal",
                "metrics": [
                    {"name": "argo.AMS-Check"}
                ]
            }
        )

    def test_get_metric_tag_by_name_tenant_regular_user(self):
        request = self.factory.get(self.url + "internal")
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, "internal")
        self.assertEqual(
            response.data,
            {
                "id": self.tag1.id,
                "name": "internal",
                "metrics": [
                    {"name": "argo.AMS-Check"}
                ]
            }
        )

    def test_get_metric_tag_by_nonexisting_name(self):
        request = self.factory.get(self.url + "nonexisting")
        force_authenticate(request, user=self.user)
        response = self.view(request, "nonexisting")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Requested tag not found.")

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 5)
        tag = admin_models.MetricTags.objects.get(name="test_tag3")
        self.assertFalse(tag in self.mt1.tags.all())
        self.assertFalse(tag in self.mt1_version1.tags.all())
        self.assertFalse(tag in self.mt1_version2.tags.all())
        self.assertFalse(tag in self.mt2.tags.all())
        self.assertFalse(tag in self.mt2_version1.tags.all())
        self.assertFalse(tag in self.mt3.tags.all())
        self.assertFalse(tag in self.mt3_version1.tags.all())
        self.assertFalse(tag in self.mt4.tags.all())
        self.assertFalse(tag in self.mt4_version1.tags.all())
        self.assertFalse(tag in self.mt5.tags.all())
        self.assertFalse(tag in self.mt5_version1.tags.all())
        self.assertFalse(tag in self.mt5_version2.tags.all())
        self.assertFalse(tag in self.mt6.tags.all())
        self.assertFalse(tag in self.mt6_version1.tags.all())
        self.assertFalse(tag in self.mt7.tags.all())
        self.assertFalse(tag in self.mt7_version1.tags.all())

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_admin_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name="test_tag3"
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_tenant_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name="test_tag3"
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_tenant_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name="test_tag3"
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_sync_error_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_syncer_error
        data = {
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["detail"],
            "Error syncing metric tags: 400 BAD REQUEST"
        )
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 5)
        tag = admin_models.MetricTags.objects.get(name="test_tag3")
        self.assertFalse(tag in self.mt1.tags.all())
        self.assertFalse(tag in self.mt1_version1.tags.all())
        self.assertFalse(tag in self.mt1_version2.tags.all())
        self.assertFalse(tag in self.mt2.tags.all())
        self.assertFalse(tag in self.mt2_version1.tags.all())
        self.assertFalse(tag in self.mt3.tags.all())
        self.assertFalse(tag in self.mt3_version1.tags.all())
        self.assertFalse(tag in self.mt4.tags.all())
        self.assertFalse(tag in self.mt4_version1.tags.all())
        self.assertFalse(tag in self.mt5.tags.all())
        self.assertFalse(tag in self.mt5_version1.tags.all())
        self.assertFalse(tag in self.mt5_version2.tags.all())
        self.assertFalse(tag in self.mt6.tags.all())
        self.assertFalse(tag in self.mt6_version1.tags.all())
        self.assertFalse(tag in self.mt7.tags.all())
        self.assertFalse(tag in self.mt7_version1.tags.all())

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_sync_error_admin_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_syncer_error
        data = {
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name="test_tag3"
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_sync_error_tenant_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_syncer_error
        data = {
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name="test_tag3"
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_sync_error_tenant_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_syncer_error
        data = {
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertRaises(
            admin_models.MetricTags.DoesNotExist,
            admin_models.MetricTags.objects.get,
            name="test_tag3"
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_existing_metric_tag_without_metrics_admin_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "internal",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        with transaction.atomic():
            request = self.factory.post(self.url, data, format="json")
            request.tenant = self.public_tenant
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Metric tag with this name already exists."
            )
            self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_existing_metric_tag_without_metrics_admin_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "internal",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_existing_metric_tag_without_metrics_tenant_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "internal",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_existing_metric_tag_without_metrics_tenant_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "internal",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_without_name_admin_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "You must specify metric tag name."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_without_name_admin_reg_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_without_name_tenant_superusr(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_without_name_tenant_reg_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_faulty_json_admin_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Missing data key: name.")
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_faulty_json_admin_reg_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_faulty_json_tenant_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_without_metrics_faulty_json_tenant_reg_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_with_metrics_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "test2.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 5)
        tag = admin_models.MetricTags.objects.get(name="test_tag3")
        self.assertEqual(len(self.mt1.tags.all()), 4)
        self.assertTrue(tag in self.mt1.tags.all())
        self.assertEqual(len(self.mt1_version1.tags.all()), 2)
        self.assertFalse(tag in self.mt1_version1.tags.all())
        self.assertEqual(len(self.mt1_version2.tags.all()), 4)
        self.assertTrue(tag in self.mt1_version2.tags.all())
        self.assertFalse(tag in self.mt2.tags.all())
        self.assertFalse(tag in self.mt2_version1.tags.all())
        self.assertFalse(tag in self.mt3.tags.all())
        self.assertFalse(tag in self.mt3_version1.tags.all())
        self.assertFalse(tag in self.mt4.tags.all())
        self.assertFalse(tag in self.mt4_version1.tags.all())
        self.assertFalse(tag in self.mt5.tags.all())
        self.assertFalse(tag in self.mt5_version1.tags.all())
        self.assertFalse(tag in self.mt5_version2.tags.all())
        self.assertFalse(tag in self.mt6.tags.all())
        self.assertFalse(tag in self.mt6_version1.tags.all())
        self.assertEqual(len(self.mt7.tags.all()), 1)
        self.assertEqual(len(self.mt7_version1.tags.all()), 1)
        self.assertTrue(tag in self.mt7.tags.all())
        self.assertTrue(tag in self.mt7_version1.tags.all())

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_with_metrics_admin_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": ["test.AMS-Check", "test2.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_with_metrics_tenant_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": ["test.AMS-Check", "test2.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_with_metrics_tenant_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": ["test.AMS-Check", "test2.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_with_nonexisting_metrics_admin_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "mock.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["detail"], "Metric mock.AMS-Check does not exist."
        )
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 5)
        tag = admin_models.MetricTags.objects.get(name="test_tag3")
        self.assertEqual(len(self.mt1.tags.all()), 4)
        self.assertTrue(tag in self.mt1.tags.all())
        self.assertEqual(len(self.mt1_version1.tags.all()), 2)
        self.assertFalse(tag in self.mt1_version1.tags.all())
        self.assertEqual(len(self.mt1_version2.tags.all()), 4)
        self.assertTrue(tag in self.mt1_version2.tags.all())
        self.assertFalse(tag in self.mt2.tags.all())
        self.assertFalse(tag in self.mt2_version1.tags.all())
        self.assertFalse(tag in self.mt3.tags.all())
        self.assertFalse(tag in self.mt3_version1.tags.all())
        self.assertFalse(tag in self.mt4.tags.all())
        self.assertFalse(tag in self.mt4_version1.tags.all())
        self.assertFalse(tag in self.mt5.tags.all())
        self.assertFalse(tag in self.mt5_version1.tags.all())
        self.assertFalse(tag in self.mt5_version2.tags.all())
        self.assertFalse(tag in self.mt6.tags.all())
        self.assertFalse(tag in self.mt6_version1.tags.all())
        self.assertFalse(tag in self.mt7.tags.all())
        self.assertFalse(tag in self.mt7_version1.tags.all())

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_with_multi_nonexisting_metrics_admin_suprusr(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "mock.AMS-Check", "mock2.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["detail"],
            "Metrics mock.AMS-Check, mock2.AMS-Check do not exist."
        )
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 5)
        tag = admin_models.MetricTags.objects.get(name="test_tag3")
        self.assertEqual(len(self.mt1.tags.all()), 4)
        self.assertTrue(tag in self.mt1.tags.all())
        self.assertEqual(len(self.mt1_version1.tags.all()), 2)
        self.assertFalse(tag in self.mt1_version1.tags.all())
        self.assertEqual(len(self.mt1_version2.tags.all()), 4)
        self.assertTrue(tag in self.mt1_version2.tags.all())
        self.assertFalse(tag in self.mt2.tags.all())
        self.assertFalse(tag in self.mt2_version1.tags.all())
        self.assertFalse(tag in self.mt3.tags.all())
        self.assertFalse(tag in self.mt3_version1.tags.all())
        self.assertFalse(tag in self.mt4.tags.all())
        self.assertFalse(tag in self.mt4_version1.tags.all())
        self.assertFalse(tag in self.mt5.tags.all())
        self.assertFalse(tag in self.mt5_version1.tags.all())
        self.assertFalse(tag in self.mt5_version2.tags.all())
        self.assertFalse(tag in self.mt6.tags.all())
        self.assertFalse(tag in self.mt6_version1.tags.all())
        self.assertFalse(tag in self.mt7.tags.all())
        self.assertFalse(tag in self.mt7_version1.tags.all())

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_with_nonexisting_metrics_admin_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "mock.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_with_nonexisting_metrics_tenant_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "mock.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_with_nonexisting_metrics_tenant_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "mock.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_nonexisting_metrics_sync_error_admin_suprusr(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_syncer_error
        data = {
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "mock.AMS-Check", "mock2.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["detail"],
            "Error syncing metric tags: 400 BAD REQUEST\n"
            "Metrics mock.AMS-Check, mock2.AMS-Check do not exist."
        )
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 5)
        tag = admin_models.MetricTags.objects.get(name="test_tag3")
        self.assertEqual(len(self.mt1.tags.all()), 4)
        self.assertTrue(tag in self.mt1.tags.all())
        self.assertEqual(len(self.mt1_version1.tags.all()), 2)
        self.assertFalse(tag in self.mt1_version1.tags.all())
        self.assertEqual(len(self.mt1_version2.tags.all()), 4)
        self.assertTrue(tag in self.mt1_version2.tags.all())
        self.assertFalse(tag in self.mt2.tags.all())
        self.assertFalse(tag in self.mt2_version1.tags.all())
        self.assertFalse(tag in self.mt3.tags.all())
        self.assertFalse(tag in self.mt3_version1.tags.all())
        self.assertFalse(tag in self.mt4.tags.all())
        self.assertFalse(tag in self.mt4_version1.tags.all())
        self.assertFalse(tag in self.mt5.tags.all())
        self.assertFalse(tag in self.mt5_version1.tags.all())
        self.assertFalse(tag in self.mt5_version2.tags.all())
        self.assertFalse(tag in self.mt6.tags.all())
        self.assertFalse(tag in self.mt6_version1.tags.all())
        self.assertFalse(tag in self.mt7.tags.all())
        self.assertFalse(tag in self.mt7_version1.tags.all())

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_nonexisting_metrics_sync_error_admin_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_syncer_error
        data = {
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "mock.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_nonexisting_metrics_sync_error_tenant_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_syncer_error
        data = {
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "mock.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_post_metric_tag_nonexisting_metrics_sync_error_tenant_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "mock.AMS-Check"]
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to add metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_without_metrics_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag3"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag3"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag3"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag3"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_without_metrics_admin_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_without_metrics_tenant_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_without_metrics_tenant_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_sync_error_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_syncer_error
        data = {
            "id": self.tag4.id,
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["detail"],
            "Error syncing metric tags: 400 BAD REQUEST"
        )
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag3"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag3"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag3"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag3"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_existing_name_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "deprecated",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        with transaction.atomic():
            content, content_type = encode_data(data)
            request = self.factory.put(
                self.url, content, content_type=content_type
            )
            request.tenant = self.public_tenant
            force_authenticate(request, user=self.superuser)
            response = self.view(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(
                response.data["detail"],
                "Metric tag with this name already exists."
            )
            self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_existing_name_admin_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "deprecated",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_existing_name_tenant_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "deprecated",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_existing_name_tenant_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "deprecated",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_empty_name_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"], "You must specify metric tag name."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_empty_name_admin_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_empty_name_tenant_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_empty_name_tenant_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "name": "",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_empty_id_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": "",
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"], "You must specify metric tag ID."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_empty_id_admin_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": "",
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_empty_id_tenant_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": "",
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_empty_id_tenant_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": "",
            "name": "test_tag3",
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_faulty_json_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Missing data key: name.")
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_faulty_json_admin_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_faulty_json_tenant_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_faulty_json_tenant_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag4.id,
            "metrics": []
        }
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_metrics_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag2", "test_tag3"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag2", "test_tag3"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag2", "test_tag3"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()], ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt4.tags.all()], ["test_tag3"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt4_version1.tags.all()], ["test_tag3"]
        )
        self.assertEqual([tag.name for tag in self.mt5.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt5_version2.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual(
            [tag[0] for tag in metric1_history["tags"]], ["test_tag3"]
        )
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag2", "test_tag3"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_metrics_admin_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_metrics_tenant_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_metrics_tenant_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag3",
            "metrics": ["argo.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_metrics_without_rename_admin_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag1",
            "metrics": ["argo.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()], ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt4.tags.all()], ["test_tag1"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt4_version1.tags.all()], ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt5_version2.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual(
            [tag[0] for tag in metric1_history["tags"]], ["test_tag1"]
        )
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_metrics_without_rename_admin_reg_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag1",
            "metrics": ["argo.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_metrics_without_rename_tenant_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag1",
            "metrics": ["argo.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_metrics_without_rename_tenant_reg_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag1",
            "metrics": ["argo.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_nonexisting_metric_admin_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag3",
            "metrics": ["mock.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["detail"], "Metric mock.AMS-Check does not exist."
        )
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag2", "test_tag3"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()], ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt4.tags.all()], ["test_tag3"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt4_version1.tags.all()], ["test_tag3"]
        )
        self.assertEqual([tag.name for tag in self.mt5.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt5_version2.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual(
            [tag[0] for tag in metric1_history["tags"]], ["test_tag3"]
        )
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_nonexisting_metrics_admin_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag3",
            "metrics": ["mock.AMS-Check", "mock2.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["detail"],
            "Metrics mock.AMS-Check, mock2.AMS-Check do not exist."
        )
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag2", "test_tag3"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()], ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt4.tags.all()], ["test_tag3"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt4_version1.tags.all()], ["test_tag3"]
        )
        self.assertEqual([tag.name for tag in self.mt5.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt5_version2.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual(
            [tag[0] for tag in metric1_history["tags"]], ["test_tag3"]
        )
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_nonexisting_metric_admin_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag3",
            "metrics": ["mock.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_nonexisting_metric_tenant_superuser(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag3",
            "metrics": ["mock.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_put_metric_tag_with_nonexisting_metric_tenant_regular_user(
            self, mock_sync
    ):
        mock_sync.side_effect = mocked_func
        data = {
            "id": self.tag3.id,
            "name": "test_tag3",
            "metrics": ["mock.AMS-Check", "test.AMS-Check"]
        }
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        content, content_type = encode_data(data)
        request = self.factory.put(self.url, content, content_type=content_type)
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to change metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_tag_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.delete(self.url + "test_tag2")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "test_tag2")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 3)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt2.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt2_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual([tag[0] for tag in metric2_history["tags"]], [])
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_tag_sync_error_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_syncer_error
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.delete(self.url + "test_tag2")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "test_tag2")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            response.data["detail"],
            "Error syncing metric tags: 400 BAD REQUEST"
        )
        mock_sync.assert_called_once()
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 3)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt2.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt2_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual([tag[0] for tag in metric2_history["tags"]], [])
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_tag_admin_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.delete(self.url + "test_tag2")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "test_tag2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_tag_tenant_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.delete(self.url + "test_tag2")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, "test_tag2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_metric_tag_tenant_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.delete(self.url + "test_tag2")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, "test_tag2")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_nonexisting_metric_tag_admin_superuser(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.delete(self.url + "nonexisting")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request, "nonexisting")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data["detail"], "The requested metric tag does not exist."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_nonexisting_metric_tag_admin_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.delete(self.url + "nonexisting")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request, "nonexisting")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_nonexisting_metric_tag_tenant_superadmin(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.delete(self.url + "nonexisting")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request, "nonexisting")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )

    @patch("Poem.api.internal_views.metrictemplates.sync_tags_webapi")
    def test_delete_nonexisting_metric_tag_tenant_regular_user(self, mock_sync):
        mock_sync.side_effect = mocked_func
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        self.assertEqual([tag[0] for tag in self.metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in self.metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in self.metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        request = self.factory.delete(self.url + "nonexisting")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request, "nonexisting")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to delete metric tags."
        )
        self.assertFalse(mock_sync.called)
        self.assertEqual(admin_models.MetricTags.objects.all().count(), 4)
        self.assertEqual(
            sorted([tag.name for tag in self.mt1.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version1.tags.all()]),
            ["test_tag1", "test_tag2"]
        )
        self.assertEqual(
            sorted([tag.name for tag in self.mt1_version2.tags.all()]),
            ["internal", "test_tag1", "test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2.tags.all()],
            ["test_tag2"]
        )
        self.assertEqual(
            [tag.name for tag in self.mt2_version1.tags.all()], ["test_tag2"]
        )
        self.assertEqual([tag.name for tag in self.mt3.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt3_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt4_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt5_version1.tags.all()], [])
        self.assertEqual(
            [tag.name for tag in self.mt5_version2.tags.all()],
            ["test_tag1"]
        )
        self.assertEqual([tag.name for tag in self.mt6.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt6_version1.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7.tags.all()], [])
        self.assertEqual([tag.name for tag in self.mt7_version1.tags.all()], [])
        metric1_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric1.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric2_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric2.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        metric3_history = json.loads(poem_models.TenantHistory.objects.filter(
            object_id=self.metric3.id
        ).order_by("-date_created")[0].serialized_data)[0]["fields"]
        self.assertEqual([tag[0] for tag in metric1_history["tags"]], [])
        self.assertEqual(
            [tag[0] for tag in metric2_history["tags"]], ["test_tag2"]
        )
        self.assertEqual(
            sorted([tag[0] for tag in metric3_history["tags"]]),
            ["internal", "test_tag1", "test_tag2"]
        )


class ListDefaultPortsTests(TenantTestCase):
    def setUp(self):
        self.factory = TenantRequestFactory(self.tenant)
        self.view = views.ListDefaultPorts.as_view()
        self.url = '/api/v2/internal/default_ports/'

        mock_db()

        self.tenant_superuser = CustUser.objects.get(username="tenant_poem")
        self.tenant_user = CustUser.objects.get(username="tenant_user")

        with schema_context(get_public_schema_name()):
            self.superuser = CustUser.objects.get(username="poem")
            self.user = CustUser.objects.get(username='admin_user')

            self.public_tenant = Tenant.objects.get(name="public")

        self.port1 = admin_models.DefaultPort.objects.get(name="SITE_BDII_PORT")
        self.port2 = admin_models.DefaultPort.objects.get(name="BDII_PORT")
        self.port3 = admin_models.DefaultPort.objects.get(name="GRAM_PORT")
        self.port4 = admin_models.DefaultPort.objects.get(name="MYPROXY_PORT")

    def test_get_ports(self):
        request = self.factory.get(self.url)
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(
            response.data, [
                {
                    "id": self.port2.id,
                    "name": "BDII_PORT",
                    "value": "2170"
                },
                {
                    "id": self.port3.id,
                    "name": "GRAM_PORT",
                    "value": "2119"
                },
                {
                    "id": self.port4.id,
                    "name": "MYPROXY_PORT",
                    "value": "7512"
                },
                {
                    "id": self.port1.id,
                    "name": "SITE_BDII_PORT",
                    "value": "2170"
                }
            ]
        )

    def test_post_port_superuser(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "HTCondorCE_PORT", "value": "9619"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 5)
        port = admin_models.DefaultPort.objects.get(name="HTCondorCE_PORT")
        self.assertEqual(port.value, "9619")

    def test_post_port_regular_user(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "HTCondorCE_PORT", "value": "9619"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"], "You do not have permission to add ports"
        )
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        self.assertRaises(
            admin_models.DefaultPort.DoesNotExist,
            admin_models.DefaultPort.objects.get,
            name="HTCondorCE_PORT"
        )

    def test_post_port_tenant_superuser(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "HTCondorCE_PORT", "value": "9619"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"], "You do not have permission to add ports"
        )
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        self.assertRaises(
            admin_models.DefaultPort.DoesNotExist,
            admin_models.DefaultPort.objects.get,
            name="HTCondorCE_PORT"
        )

    def test_post_port_tenant_regular_user(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "HTCondorCE_PORT", "value": "9619"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"], "You do not have permission to add ports"
        )
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        self.assertRaises(
            admin_models.DefaultPort.DoesNotExist,
            admin_models.DefaultPort.objects.get,
            name="HTCondorCE_PORT"
        )

    def test_post_multiple_ports(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "HTCondorCE_PORT", "value": "9619"},
                {"name": "FTS_PORT", "value": "8446"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 6)
        port1 = admin_models.DefaultPort.objects.get(name="HTCondorCE_PORT")
        port2 = admin_models.DefaultPort.objects.get(name="FTS_PORT")
        self.assertEqual(port1.value, "9619")
        self.assertEqual(port2.value, "8446")

    def test_post_port_wrong_json_format_superuser(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "HTCondorCE_PORT", "val": "9619"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"], "Wrong JSON format: Missing key 'value'"
        )
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        self.assertRaises(
            admin_models.DefaultPort.DoesNotExist,
            admin_models.DefaultPort.objects.get,
            name="HTCondorCE_PORT"
        )

    def test_post_port_wrong_json_format_regular_user(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "HTCondorCE_PORT", "val": "9619"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"], "You do not have permission to add ports"
        )
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        self.assertRaises(
            admin_models.DefaultPort.DoesNotExist,
            admin_models.DefaultPort.objects.get,
            name="HTCondorCE_PORT"
        )

    def test_post_port_wrong_json_format_tenant_superuser(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "HTCondorCE_PORT", "val": "9619"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"], "You do not have permission to add ports"
        )
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        self.assertRaises(
            admin_models.DefaultPort.DoesNotExist,
            admin_models.DefaultPort.objects.get,
            name="HTCondorCE_PORT"
        )

    def test_post_port_wrong_json_format_tenant_regular_user(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "HTCondorCE_PORT", "val": "9619"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.tenant
        force_authenticate(request, user=self.tenant_user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"], "You do not have permission to add ports"
        )
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        self.assertRaises(
            admin_models.DefaultPort.DoesNotExist,
            admin_models.DefaultPort.objects.get,
            name="HTCondorCE_PORT"
        )

    def test_post_port_wrong_json_format_for_one_port_superuser(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "FTS_PORT", "value": "8446"},
                {"name": "HTCondorCE_PORT", "val": "9619"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"], "Wrong JSON format: Missing key 'value'"
        )
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        self.assertRaises(
            admin_models.DefaultPort.DoesNotExist,
            admin_models.DefaultPort.objects.get,
            name="HTCondorCE_PORT"
        )

    def test_post_port_wrong_json_format(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "prts": json.dumps([
                {"name": "HTCondorCE_PORT", "value": "9619"},
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "GRAM_PORT", "value": "2119"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"], "Wrong JSON format: Missing key 'ports'"
        )
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        self.assertRaises(
            admin_models.DefaultPort.DoesNotExist,
            admin_models.DefaultPort.objects.get,
            name="HTCondorCE_PORT"
        )

    def test_post_port_with_deletion_superuser(self):
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 4)
        data = {
            "ports": json.dumps([
                {"name": "BDII_PORT", "value": "2170"},
                {"name": "MYPROXY_PORT", "value": "7512"},
                {"name": "SITE_BDII_PORT", "value": "2170"}
            ])
        }
        request = self.factory.post(self.url, data, format="json")
        request.tenant = self.public_tenant
        force_authenticate(request, user=self.superuser)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(admin_models.DefaultPort.objects.all().count(), 3)
        self.assertRaises(
            admin_models.DefaultPort.DoesNotExist,
            admin_models.DefaultPort.objects.get,
            name="GRAM_PORT"
        )
