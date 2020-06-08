import json

import requests
from Poem.api.models import MyAPIKey
from Poem.helpers.history_helpers import create_history
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django.db import IntegrityError
from tenant_schemas.utils import schema_context, get_public_schema_name


def import_metrics(metrictemplates, tenant, user):
    imported = []
    warn_imported = []
    not_imported = []
    unavailable = []
    for template in metrictemplates:
        imported_different_version = False
        mt = admin_models.MetricTemplate.objects.get(name=template)
        mtype = poem_models.MetricType.objects.get(name=mt.mtype.name)
        gr = poem_models.GroupOfMetrics.objects.get(
            name=tenant.name.upper()
        )

        packages = []
        for m in poem_models.Metric.objects.all():
            if m.probekey:
                packages.append(m.probekey.package)

        package_names = [package.name for package in packages]

        try:
            if mt.probekey:
                if mt.probekey.package.name in package_names and \
                        mt.probekey.package not in packages:
                    package_version = [
                        package for package in packages
                        if package.name == mt.probekey.package.name
                    ][0]
                    ver = admin_models.ProbeHistory.objects.get(
                        name=mt.probekey.name,
                        package=package_version
                    )
                    try:
                        metrictemplate = \
                            admin_models.MetricTemplateHistory.objects.get(
                                name=mt.name, probekey=ver
                            )
                        imported_different_version = True

                    except admin_models.MetricTemplateHistory.DoesNotExist:
                        unavailable.append(mt.name)
                        continue

                else:
                    metrictemplate = mt
                    ver = mt.probekey

                metric = poem_models.Metric.objects.create(
                    name=metrictemplate.name,
                    mtype=mtype,
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
                    name=mt.name,
                    mtype=mtype,
                    description=mt.description,
                    parent=mt.parent,
                    flags=mt.flags,
                    group=gr
                )

            create_history(
                metric, user.username, comment='Initial version.'
            )

            if imported_different_version:
                warn_imported.append(mt.name)

            else:
                imported.append(mt.name)

        except IntegrityError:
            not_imported.append(mt.name)
            continue

    return imported, warn_imported, not_imported, unavailable


def update_metrics(metrictemplate, name, probekey, user=''):
    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    for schema in schemas:
        with schema_context(schema):
            try:
                met = poem_models.Metric.objects.get(
                    name=name, probekey=probekey
                )
                met.name = metrictemplate.name
                met.probekey = metrictemplate.probekey
                met.probeexecutable = metrictemplate.probeexecutable
                met.description = metrictemplate.description
                met.parent = metrictemplate.parent
                met.attribute = metrictemplate.attribute
                met.dependancy = metrictemplate.dependency
                met.flags = metrictemplate.flags
                met.files = metrictemplate.files
                met.parameter = metrictemplate.parameter
                met.fileparameter = metrictemplate.fileparameter

                if metrictemplate.config:
                    for item in json.loads(metrictemplate.config):
                        if item.split(' ')[0] == 'path':
                            objpath = item

                    metconfig = []
                    for item in json.loads(met.config):
                        if item.split(' ')[0] == 'path':
                            metconfig.append(objpath)
                        else:
                            metconfig.append(item)

                    met.config = json.dumps(metconfig)

                met.save()

                if met.probekey != probekey:
                    create_history(met, user)

                else:
                    history = poem_models.TenantHistory.objects.filter(
                        object_id=met.id,
                        content_type=ContentType.objects.get_for_model(
                            poem_models.Metric
                        )
                    )[0]
                    history.serialized_data = serializers.serialize(
                        'json', [met],
                        use_natural_foreign_keys=True,
                        use_natural_primary_keys=True
                    )
                    history.object_repr = met.__str__()
                    history.save()

                msgs = []
                if name != met.name:
                    msgs = update_metrics_in_profiles(name, met.name)

                return msgs

            except poem_models.Metric.DoesNotExist:
                continue


def update_metrics_in_profiles(old_name, new_name):
    error_msgs = []
    if old_name == new_name:
        pass

    else:
        schemas = list(Tenant.objects.all().values_list(
            'schema_name', flat=True
        ))
        schemas.remove(get_public_schema_name())

        for schema in schemas:
            with schema_context(schema):
                try:
                    token = MyAPIKey.objects.get(name='WEB-API')
                    headers = {
                        'Accept': 'application/json', 'x-api-key': token.token
                    }

                    response = requests.get(
                        settings.WEBAPI_METRIC, headers=headers, timeout=180
                    )
                    response.raise_for_status()

                    data = response.json()['data']

                    for profile in data:
                        flag = 0
                        new_services = []
                        for service in profile['services']:
                            new_metrics = []
                            for metric in service['metrics']:
                                if metric == old_name:
                                    flag += 1
                                    new_metrics.append(new_name)
                                else:
                                    new_metrics.append(metric)
                            new_services.append({
                                'service': service['service'],
                                'metrics': new_metrics
                            })

                        if flag > 0:
                            new_data = {
                                'id': profile['id'],
                                'name': profile['name'],
                                'description': profile['description'],
                                'services': new_services
                            }
                            response = requests.put(
                                settings.WEBAPI_METRIC + '/' + profile['id'],
                                headers=headers,
                                data=json.dumps(new_data)
                            )
                            response.raise_for_status()

                except requests.exceptions.HTTPError as e:
                    error_msgs.append(
                        '{}: Error trying to update metric in metric profiles: '
                        '{}.\nPlease update metric profiles manually.'.format(
                            schema.upper(), e
                        )
                    )
                    continue

                except MyAPIKey.DoesNotExist:
                    error_msgs.append(
                        '{}: No "WEB-API" key in the DB!'
                        '\nPlease update metric profiles manually.'.format(
                            schema.upper()
                        )
                    )
                    continue

    return error_msgs
