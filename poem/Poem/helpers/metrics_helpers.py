import json

import requests
from Poem.helpers.history_helpers import create_history, serialize_metric
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.poem_super_admin.models import WebAPIKey
from Poem.tenants.models import Tenant
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError
from django_tenants.utils import schema_context, get_public_schema_name


def import_metrics(metrictemplates, tenant, user):
    imported = []
    warn_imported = []
    not_imported = []
    unavailable = []
    for template in metrictemplates:
        imported_different_version = False
        try:
            mt = admin_models.MetricTemplate.objects.get(name=template)

        except admin_models.MetricTemplate.DoesNotExist:
            continue

        gr = poem_models.GroupOfMetrics.objects.get(
            name=tenant.name.upper()
        )

        packages = []
        for m in poem_models.Metric.objects.all():
            if m.probeversion:
                metric_probe = m.probeversion.split(" (")
                probe_name = metric_probe[0].strip()
                probe_version = metric_probe[1][:-1].strip()
                probe = admin_models.ProbeHistory.objects.get(
                    name=probe_name,
                    package__version=probe_version
                )
                packages.append(probe.package)

        package_names = [package.name for package in packages]

        try:
            if mt.probekey:
                if mt.probekey.package.name in package_names and \
                        mt.probekey.package not in packages:
                    package_version = [
                        package for package in packages
                        if package.name == mt.probekey.package.name
                    ][0]
                    try:
                        ver = admin_models.ProbeHistory.objects.get(
                            name=mt.probekey.name,
                            package=package_version
                        )

                        mt = admin_models.MetricTemplateHistory.objects.get(
                            name=mt.name, probekey=ver
                        )
                        imported_different_version = True

                    except admin_models.ProbeHistory.DoesNotExist:
                        unavailable.append(mt.name)
                        continue

                    except admin_models.MetricTemplateHistory.DoesNotExist:
                        unavailable.append(mt.name)
                        continue

                else:
                    ver = mt.probekey

                metric = poem_models.Metric.objects.create(
                    name=mt.name,
                    probeversion=f"{ver.name} ({ver.package.version})",
                    group=gr,
                    config=mt.config
                )

            else:
                metric = poem_models.Metric.objects.create(
                    name=mt.name,
                    group=gr
                )

            new_tags = [tag for tag in mt.tags.all()]

            create_history(
                metric, user.username, comment='Initial version.', tags=new_tags
            )

            if imported_different_version:
                warn_imported.append(mt.name)

            else:
                imported.append(mt.name)

        except IntegrityError:
            not_imported.append(mt.name)
            continue

    return imported, warn_imported, not_imported, unavailable


def get_metrics_in_profiles(tenant):
    with schema_context(tenant.schema_name):
        try:
            token = WebAPIKey.objects.get(name=f"WEB-API-{tenant.name}")
            headers = {
                'Accept': 'application/json', 'x-api-key': token.token
            }

            response = requests.get(
                settings.WEBAPI_METRIC, headers=headers, timeout=180
            )
            response.raise_for_status()

            data = response.json()['data']
            metrics_dict = dict()
            for item in data:
                for service in item['services']:
                    if 'metrics' in service:
                        for metric in service['metrics']:
                            if metric not in metrics_dict:
                                metrics_dict.update({
                                    metric: [item['name']]
                                })

                            else:
                                metrics_dict.update({
                                    metric:
                                        metrics_dict[metric] + [item['name']]
                                })

            return metrics_dict

        except requests.exceptions.HTTPError:
            raise

        except WebAPIKey.DoesNotExist:
            raise Exception('Error fetching WEB API data: API key not found.')


def update_metric_in_schema(
        mt_id, name, pk_id, schema, update_from_history=False, user=''
):
    if update_from_history:
        mt_model = admin_models.MetricTemplateHistory

    else:
        mt_model = admin_models.MetricTemplate

    metrictemplate = mt_model.objects.get(pk=mt_id)

    if pk_id:
        probekey = admin_models.ProbeHistory.objects.get(pk=pk_id)

    else:
        probekey = None

    msgs = ''
    with schema_context(schema):
        try:
            if probekey:
                met = poem_models.Metric.objects.get(
                    name=name, probeversion=probekey.__str__()
                )

            else:
                met = poem_models.Metric.objects.get(name=name)

            met.name = metrictemplate.name
            if metrictemplate.probekey:
                met.probeversion = metrictemplate.probekey.__str__()

            else:
                met.probeversion = None

            if metrictemplate.config:
                if update_from_history:
                    met.config = metrictemplate.config

                else:
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

            tags = [tag for tag in metrictemplate.tags.all()]

            if update_from_history or (
                    probekey and met.probeversion != probekey.__str__()
            ):
                create_history(met, user, tags=tags)

            else:
                history = poem_models.TenantHistory.objects.filter(
                    object_id=met.id,
                    content_type=ContentType.objects.get_for_model(
                        poem_models.Metric
                    )
                )[0]
                history.serialized_data = serialize_metric(met, tags=tags)
                history.object_repr = met.__str__()
                history.save()

            if name != met.name:
                msgs = update_metrics_in_profiles(name, met.name)

        except poem_models.Metric.DoesNotExist:
            pass

    return msgs


def update_metrics(metrictemplate, name, probekey, user=''):
    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    msgs = []
    for schema in schemas:
        if probekey:
            msg = update_metric_in_schema(
                mt_id=metrictemplate.id, name=name, pk_id=probekey.id,
                schema=schema, user=user
            )

        else:
            msg = update_metric_in_schema(
                mt_id=metrictemplate.id, name=name, pk_id=None,
                schema=schema, user=user
            )

        if msg:
            msgs.append(msg)

    return msgs


def update_metrics_in_profiles(old_name, new_name):
    error_msgs = []
    if old_name == new_name:
        pass

    else:
        tenants = Tenant.objects.all()
        tenants = [
            tenant for tenant in tenants if
            tenant.schema_name != get_public_schema_name()
        ]

        for tenant in tenants:
            with schema_context(tenant.schema_name):
                try:
                    token = WebAPIKey.objects.get(name=f"WEB-API-{tenant.name}")
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
                            if 'metrics' in service:
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
                            tenant.schema_name.upper(), e
                        )
                    )
                    continue

                except WebAPIKey.DoesNotExist:
                    error_msgs.append(
                        '{}: No "WEB-API" key in the DB!'
                        '\nPlease update metric profiles manually.'.format(
                            tenant.schema_name.upper()
                        )
                    )
                    continue

    return error_msgs


def delete_metrics_from_profile(profile, metrics, tenant):
    try:
        profile_id = poem_models.MetricProfiles.objects.get(name=profile).apiid
        token = WebAPIKey.objects.get(name=f"WEB-API-{tenant}")
        headers = {
            'Accept': 'application/json', 'x-api-key': token.token
        }
        if settings.WEBAPI_METRIC.endswith('/'):
            url = settings.WEBAPI_METRIC + profile_id

        else:
            url = settings.WEBAPI_METRIC + '/' + profile_id

        response = requests.get(url, headers=headers, timeout=180)
        response.raise_for_status()

        data = response.json()['data'][0]

        for metric in metrics:
            for item in data['services']:
                if 'metrics' in item:
                    if metric in item['metrics']:
                        item['metrics'].remove(metric)
                        if not item['metrics']:
                            data['services'].remove(item)

        send_data = {
            'id': data['id'],
            'name': data['name'],
            'description': data['description'],
            'services': data['services']
        }

        response = requests.put(
            url, headers=headers, data=json.dumps(send_data)
        )
        response.raise_for_status()

    except WebAPIKey.DoesNotExist:
        raise Exception(
            'Error deleting metric from profile: API key not found.'
        )

    except poem_models.MetricProfiles.DoesNotExist:
        raise Exception(
            'Error deleting metric from profile: Profile not found.'
        )

    except requests.exceptions.HTTPError:
        raise


def sync_metrics(tenant, user):
    metrics_in_profiles = [
        key for key in get_metrics_in_profiles(tenant=tenant)
    ]
    metrics = poem_models.Metric.objects.all().values_list("name", flat=True)

    missing_metrics = list(set(metrics_in_profiles).difference(set(metrics)))
    extra_metrics = list(set(metrics).difference(set(metrics_in_profiles)))

    imported, warn, err, unavailable = import_metrics(
        missing_metrics, tenant, user
    )

    deleted = list()
    for metric in extra_metrics:
        m = poem_models.Metric.objects.get(name=metric)
        poem_models.TenantHistory.objects.filter(
            object_id=m.id,
            content_type=ContentType.objects.get_for_model(
                poem_models.Metric
            )
        ).delete()
        m.delete()
        deleted.append(metric)

    return imported, warn, err, unavailable, deleted
