#!/usr/bin/env python
import django
import json
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Poem.settings')
django.setup()

from Poem.poem.models import Metric, MetricProbeExecutable, MetricType, \
    MetricParent, MetricAttribute, MetricDependancy, MetricFlags, MetricFiles, \
    MetricParameter, MetricFileParameter, MetricConfig
from Poem.poem_super_admin.models import MetricTemplate
from Poem.tenants.models import Tenant
from reversion.models import Version
from tenant_schemas.utils import schema_context, get_public_schema_name


def main():
    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    for schema in schemas:
        with schema_context(schema):
            for mt in MetricTemplate.objects.all():
                try:
                    changes = 0
                    met = Metric.objects.get(name=mt.name)
                    if met.mtype != mt.mtype:
                        met.mtype = MetricType.objects.get(name=mt.mtype)
                        changes += 1

                    if met.probeversion != mt.probeversion:
                        met.probeversion = mt.probeversion
                        changes += 1
                        met.probekey = Version.objects.get(
                            object_repr__exact=mt.probeversion
                        )

                    if met.probeexecutable != mt.probeexecutable:
                        met.probeexecutable = mt.probeexecutable
                        mpe = MetricProbeExecutable.objects.get(metric=met)
                        mpe.value = json.loads(mt.probeexecutable)[0]
                        mpe.save()

                    if met.parent != mt.parent:
                        met.parent = mt.parent
                        changes += 1
                        mp = MetricParent.objects.get(metric=met)
                        mp.value = json.loads(mt.parent)[0]
                        mp.save()

                    if met.attribute != mt.attribute:
                        MetricAttribute.objects.filter(metric=met).delete()
                        met.attribute = mt.attribute
                        changes += 1
                        if met.attribute:
                            for item in json.loads(met.attribute):
                                MetricAttribute.objects.create(
                                    key=item.split(' ')[0],
                                    value=item.split(' ')[1],
                                    metric=met
                                )

                    if met.dependancy != mt.dependency:
                        MetricDependancy.objects.filter(metric=met).delete()
                        met.dependancy = mt.dependency
                        changes += 1
                        if met.dependancy:
                            for item in json.loads(met.dependancy):
                                MetricDependancy.objects.create(
                                    key=item.split(' ')[0],
                                    value=item.split(' ')[1],
                                    metric=met
                                )

                    if met.flags != mt.flags:
                        MetricFlags.objects.filter(metric=met).delete()
                        met.flags = mt.flags
                        changes += 1
                        if met.flags:
                            for item in json.loads(met.flags):
                                MetricFlags.objects.create(
                                    key=item.split(' ')[0],
                                    value=item.split(' ')[1],
                                    metric=met
                                )

                    if met.files != mt.files:
                        MetricFiles.objects.filter(metric=met).delete()
                        met.files = mt.files
                        changes += 1
                        if met.files:
                            for item in json.loads(met.files):
                                MetricFiles.objects.create(
                                    key=item.split(' ')[0],
                                    value=item.split(' ')[1],
                                    metric=met
                                )

                    if met.parameter != mt.parameter:
                        MetricParameter.objects.filter(metric=met).delete()
                        met.parameter = mt.parameter
                        changes += 1
                        if met.parameter:
                            for item in json.loads(met.parameter):
                                MetricParameter.objects.create(
                                    key=item.split(' ')[0],
                                    value=item.split(' ')[1],
                                    metric=met
                                )

                    if met.fileparameter != mt.fileparameter:
                        MetricFileParameter.objects.filter(metric=met).delete()
                        met.fileparameter = mt.fileparameter
                        changes += 1
                        if met.fileparameter:
                            for item in json.loads(met.fileparameter):
                                MetricFileParameter.objects.create(
                                    key=item.split(' ')[0],
                                    value=item.split(' ')[1],
                                    metric=met
                                )

                    if mt.config:
                        for item in json.loads(mt.config):
                            if item.split(' ')[0] == 'path':
                                objpath = item

                        for item in json.loads(met.config):
                            if item.split(' ')[0] == 'path':
                                oldpath = item

                        if oldpath != objpath:
                            metconfig = []
                            for item in json.loads(met.config):
                                if item.split(' ')[0] == 'path':
                                    metconfig.append(objpath)
                                else:
                                    metconfig.append(item)

                            met.config = json.dumps(metconfig)
                            changes += 1
                            mc = MetricConfig.objects.get(
                                metric=met, key='path'
                            )
                            mc.value = objpath.split(' ')[1]
                            mc.save()
                    else:
                        if met.config != '':
                            met.config = ''
                            changes += 1

                    if changes > 0:
                        met.save()

                except Metric.DoesNotExist:
                    pass


main()
