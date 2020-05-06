from Poem.helpers.history_helpers import create_history
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from django.db import IntegrityError


def import_metrics(metrictemplates, tenant, user):
    imported = not_imported = []
    for template in metrictemplates:
        metrictemplate = admin_models.MetricTemplate.objects.get(
            name=template
        )
        mt = poem_models.MetricType.objects.get(
            name=metrictemplate.mtype.name
        )
        gr = poem_models.GroupOfMetrics.objects.get(
            name=tenant.name.upper()
        )

        try:
            if metrictemplate.probekey:
                ver = admin_models.ProbeHistory.objects.get(
                    name=metrictemplate.probekey.name,
                    package__version=metrictemplate.probekey.package.version
                )

                metric = poem_models.Metric.objects.create(
                    name=metrictemplate.name,
                    mtype=mt,
                    probekey=ver,
                    description=metrictemplate.description,
                    parent=metrictemplate.parent,
                    group=gr,
                    probeexecutable=metrictemplate.probeexecutable,
                    config=metrictemplate.config,
                    attribute=metrictemplate.attribute,
                    dependancy=metrictemplate.dependency,
                    flags=metrictemplate.flags,
                    files=metrictemplate.files,
                    parameter=metrictemplate.parameter,
                    fileparameter=metrictemplate.fileparameter
                )
            else:
                metric = poem_models.Metric.objects.create(
                    name=metrictemplate.name,
                    mtype=mt,
                    description=metrictemplate.description,
                    parent=metrictemplate.parent,
                    flags=metrictemplate.flags,
                    group=gr
                )

            create_history(
                metric, user.username, comment='Initial version.'
            )

            imported.append(metrictemplate.name)

        except IntegrityError:
            not_imported.append(metrictemplate.name)
            continue

    return imported, not_imported
