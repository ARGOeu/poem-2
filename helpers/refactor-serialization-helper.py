#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Poem.settings')
django.setup()

from django.contrib.contenttypes.models import ContentType

import json

from Poem.poem.models import TenantHistory, Metric, MetricType, GroupOfMetrics
from Poem.poem_super_admin.models import History, MetricTemplate, Probe, \
    MetricTemplateType
from Poem.tenants.models import Tenant

from tenant_schemas.utils import schema_context, get_public_schema_name


def get_probekey():
    probes = History.objects.filter(
        content_type=ContentType.objects.get_for_model(Probe)
    )

    probekeys = dict()

    for probe in probes:
        probekeys.update({probe.id: probe.object_repr})

    return probekeys


def get_metric_type(mttype):
    if mttype == 'admin':
        mtypes = MetricTemplateType.objects.all()
    else:
        mtypes = MetricType.objects.all()

    mtypedict = dict()

    for mtype in mtypes:
        mtypedict.update({mtype.id: mtype.name})

    return mtypedict


def get_group_of_metrics():
    groups = GroupOfMetrics.objects.all()

    groupdict = dict()

    for group in groups:
        groupdict.update({group.id: group.name})

    return groupdict


def update_history_model():
    metrictemplates = History.objects.filter(
        content_type=ContentType.objects.get_for_model(MetricTemplate)
    )

    probekeys = get_probekey()
    mtypes = get_metric_type('admin')

    for metrictemplate in metrictemplates:
        ser_data = json.loads(metrictemplate.serialized_data)
        if ser_data[0]['fields']['probekey']:
            ser_data[0]['fields']['probekey'] = [
                probekeys[ser_data[0]['fields']['probekey']]
            ]
        ser_data[0]['fields']['mtype'] = [
            mtypes[ser_data[0]['fields']['mtype']]
        ]
        metrictemplate.serialized_data = json.dumps(ser_data)
        metrictemplate.save()


def update_tenant_history():
    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    for schema in schemas:
        with schema_context(schema):
            metrics = TenantHistory.objects.filter(
                content_type=ContentType.objects.get_for_model(Metric)
            )

            probekeys = get_probekey()
            mtypes = get_metric_type('tenant')
            groups = get_group_of_metrics()

            for metric in metrics:
                ser_data = json.loads(metric.serialized_data)
                if ser_data[0]['fields']['probekey']:
                    ser_data[0]['fields']['probekey'] = [
                        probekeys[ser_data[0]['fields']['probekey']]
                    ]
                ser_data[0]['fields']['mtype'] = [
                    mtypes[ser_data[0]['fields']['mtype']]
                ]
                ser_data[0]['fields']['group'] = [
                    groups[ser_data[0]['fields']['group']]
                ]
                metric.serialized_data = json.dumps(ser_data)
                metric.save()


def main():
    update_history_model()
    update_tenant_history()


main()
