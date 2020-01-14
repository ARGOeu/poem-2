from django.contrib.contenttypes.models import ContentType
from django.core import serializers
from django.db import IntegrityError

import json

from Poem.api.internal_views.utils import one_value_inline, two_value_inline
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_history
from Poem.poem.models import Metric, TenantHistory
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from tenant_schemas.utils import get_public_schema_name, schema_context


def inline_metric_for_db(data):
    result = []

    for item in data:
        if item['key']:
            result.append('{} {}'.format(item['key'], item['value']))

    if result:
        return json.dumps(result)
    else:
        return ''


def update_metrics(metrictemplate, name):
    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    for schema in schemas:
        with schema_context(schema):
            try:
                met = Metric.objects.get(name=name)
                met.name = metrictemplate.name
                met.probeexecutable = metrictemplate.probeexecutable
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

                history = TenantHistory.objects.filter(
                    object_id=met.id,
                    content_type=ContentType.objects.get_for_model(Metric)
                )[0]
                history.serialized_data = serializers.serialize(
                    'json', [met],
                    use_natural_foreign_keys=True,
                    use_natural_primary_keys=True
                )
                history.object_repr = met.__str__()
                history.save()

            except Metric.DoesNotExist:
                continue


class ListMetricTemplates(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            metrictemplates = admin_models.MetricTemplate.objects.filter(
                name=name
            )
            if metrictemplates.count() == 0:
                raise NotFound(status=404, detail='Metric template not found')
        else:
            metrictemplates = admin_models.MetricTemplate.objects.all()

        results = []
        for metrictemplate in metrictemplates:
            config = two_value_inline(metrictemplate.config)
            parent = one_value_inline(metrictemplate.parent)
            probeexecutable = one_value_inline(metrictemplate.probeexecutable)
            attribute = two_value_inline(metrictemplate.attribute)
            dependency = two_value_inline(metrictemplate.dependency)
            flags = two_value_inline(metrictemplate.flags)
            files = two_value_inline(metrictemplate.files)
            parameter = two_value_inline(metrictemplate.parameter)
            fileparameter = two_value_inline(metrictemplate.fileparameter)

            if metrictemplate.probekey:
                probeversion = metrictemplate.probekey.__str__()
            else:
                probeversion = ''

            results.append(dict(
                id=metrictemplate.id,
                name=metrictemplate.name,
                mtype=metrictemplate.mtype.name,
                probeversion=probeversion,
                parent=parent,
                probeexecutable=probeexecutable,
                config=config,
                attribute=attribute,
                dependency=dependency,
                flags=flags,
                files=files,
                parameter=parameter,
                fileparameter=fileparameter
            ))

        results = sorted(results, key=lambda k: k['name'])

        if name:
            return Response(results[0])
        else:
            return Response(results)

    def post(self, request):
        if request.data['parent']:
            parent = json.dumps([request.data['parent']])
        else:
            parent = ''

        if request.data['probeexecutable']:
            probeexecutable = json.dumps([request.data['probeexecutable']])
        else:
            probeexecutable = ''

        try:
            if request.data['mtype'] == 'Active':
                mt = admin_models.MetricTemplate.objects.create(
                    name=request.data['name'],
                    mtype=admin_models.MetricTemplateType.objects.get(
                        name=request.data['mtype']
                    ),
                    probekey=admin_models.ProbeHistory.objects.get(
                        name=request.data['probeversion'].split(' ')[0],
                        package__version=request.data['probeversion'].split(
                            ' '
                        )[1][1:-1]
                    ),
                    parent=parent,
                    probeexecutable=probeexecutable,
                    config=inline_metric_for_db(request.data['config']),
                    attribute=inline_metric_for_db(request.data['attribute']),
                    dependency=inline_metric_for_db(request.data['dependency']),
                    flags=inline_metric_for_db(request.data['flags']),
                    files=inline_metric_for_db(request.data['files']),
                    parameter=inline_metric_for_db(request.data['parameter']),
                    fileparameter=inline_metric_for_db(
                        request.data['fileparameter']
                    )
                )
            else:
                mt = admin_models.MetricTemplate.objects.create(
                    name=request.data['name'],
                    mtype=admin_models.MetricTemplateType.objects.get(
                        name=request.data['mtype']
                    ),
                    parent=parent,
                    flags=inline_metric_for_db(request.data['flags'])
                )

            if request.data['cloned_from']:
                clone = admin_models.MetricTemplate.objects.get(
                    id=request.data['cloned_from']
                )
                comment = 'Derived from ' + clone.name
                create_history(mt, request.user.username, comment=comment)
            else:
                create_history(mt, request.user.username)

            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(
                {'detail':
                 'Metric template with this name already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def put(self, request):
        metrictemplate = admin_models.MetricTemplate.objects.get(
            id=request.data['id']
        )
        old_name = metrictemplate.name
        old_probekey = metrictemplate.probekey

        if request.data['parent']:
            parent = json.dumps([request.data['parent']])
        else:
            parent = ''

        if request.data['probeexecutable']:
            probeexecutable = json.dumps([request.data['probeexecutable']])
        else:
            probeexecutable = ''

        if request.data['probeversion']:
            new_probekey = admin_models.ProbeHistory.objects.get(
                name=request.data['probeversion'].split(' ')[0],
                package__version=request.data['probeversion'].split(
                    ' '
                )[1][1:-1]
            )
        else:
            new_probekey = None

        try:
            if request.data['mtype'] == 'Active' and \
                    old_probekey != new_probekey:
                metrictemplate.name = request.data['name']
                metrictemplate.probekey = new_probekey
                metrictemplate.parent = parent
                metrictemplate.probeexecutable = probeexecutable
                metrictemplate.config = inline_metric_for_db(
                    request.data['config']
                )
                metrictemplate.attribute = inline_metric_for_db(
                    request.data['attribute']
                )
                metrictemplate.dependency = inline_metric_for_db(
                    request.data['dependency']
                )
                metrictemplate.flags = inline_metric_for_db(
                    request.data['flags']
                )
                metrictemplate.files = inline_metric_for_db(
                    request.data['files']
                )
                metrictemplate.parameter = inline_metric_for_db(
                    request.data['parameter']
                )
                metrictemplate.fileparameter = inline_metric_for_db(
                    request.data['fileparameter']
                )
                metrictemplate.save()

                create_history(metrictemplate, request.user.username)

            else:
                new_data = {
                    'name': request.data['name'],
                    'probekey': new_probekey,
                    'mtype': admin_models.MetricTemplateType.objects.get(
                        name=request.data['mtype']
                    ),
                    'parent': parent,
                    'probeexecutable': probeexecutable,
                    'config': inline_metric_for_db(request.data['config']),
                    'attribute': inline_metric_for_db(
                        request.data['attribute']
                    ),
                    'dependency': inline_metric_for_db(
                        request.data['dependency']
                    ),
                    'flags': inline_metric_for_db(request.data['flags']),
                    'files': inline_metric_for_db(request.data['files']),
                    'parameter': inline_metric_for_db(
                        request.data['parameter']
                    ),
                    'fileparameter': inline_metric_for_db(
                        request.data['fileparameter']
                    )
                }
                admin_models.MetricTemplate.objects.filter(
                    id=request.data['id']
                ).update(**new_data)

                admin_models.MetricTemplateHistory.objects.filter(
                    name=old_name, probekey=old_probekey
                ).update(**new_data)

                mt = admin_models.MetricTemplate.objects.get(
                    pk=request.data['id']
                )

                update_metrics(mt, old_name)

            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(
                {'detail': 'Metric template with this name already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, name=None):
        schemas = list(Tenant.objects.all().values_list('schema_name',
                                                        flat=True))
        schemas.remove(get_public_schema_name())
        if name:
            try:
                mt = admin_models.MetricTemplate.objects.get(name=name)
                for schema in schemas:
                    with schema_context(schema):
                        try:
                            admin_models.History.objects.filter(
                                object_id=mt.id,
                                content_type=ContentType.objects.get_for_model(
                                    mt)
                            ).delete()
                            m = Metric.objects.get(name=name)
                            TenantHistory.objects.filter(
                                object_id=m.id,
                                content_type=ContentType.objects.get_for_model(
                                    m
                                )
                            ).delete()
                            m.delete()
                        except Metric.DoesNotExist:
                            pass
                        
                mt.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except admin_models.MetricTemplate.DoesNotExist:
                raise NotFound(status=404, detail='Metric template not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListMetricTemplatesForProbeVersion(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, probeversion):
        if probeversion:
            metrics = admin_models.MetricTemplate.objects.filter(
                probekey__name=probeversion.split('(')[0],
                probekey__package__version=probeversion.split('(')[1][0:-1]
            )

            if metrics.count() == 0:
                raise NotFound(status=404, detail='Metrics not found')
            else:
                return Response(
                    metrics.order_by('name').values_list('name', flat=True)
                )


class ListMetricTemplateTypes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        types = admin_models.MetricTemplateType.objects.all().values_list(
            'name', flat=True
        )
        return Response(types)
