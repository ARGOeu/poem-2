import json

from Poem.api.internal_views.metrics import one_value_inline, two_value_inline
from Poem.api.views import NotFound
from Poem.poem.models import Metric
from Poem.poem_super_admin.models import MetricTemplate, MetricTemplateType
from Poem.tenants.models import Tenant

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from reversion.models import Version

from tenant_schemas.utils import get_public_schema_name, schema_context


def inline_metric_for_db(input):
    result = []

    for item in input:
        if item['key'] and item['value']:
            result.append('{} {}'.format(item['key'], item['value']))

    if result:
        return json.dumps(result)
    else:
        return ''


class ListMetricTemplates(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            metrictemplates = MetricTemplate.objects.filter(name=name)
            if metrictemplates.count() == 0:
                raise NotFound(status=404, detail='Metric template not found')
        else:
            metrictemplates = MetricTemplate.objects.all()

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
                probekey = metrictemplate.probekey.id
            else:
                probekey = ''

            results.append(dict(
                id=metrictemplate.id,
                name=metrictemplate.name,
                mtype=metrictemplate.mtype.name,
                probeversion=metrictemplate.probeversion,
                probekey=probekey,
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

        if request.data['mtype'] == 'Active':
            MetricTemplate.objects.create(
                name=request.data['name'],
                mtype=MetricTemplateType.objects.get(
                    name=request.data['mtype']
                ),
                probeversion=request.data['probeversion'],
                probekey=Version.objects.get(
                    object_repr=request.data['probeversion']
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
            MetricTemplate.objects.create(
                name=request.data['name'],
                mtype=MetricTemplateType.objects.get(
                    name=request.data['mtype']
                ),
                parent=parent,
                flags=inline_metric_for_db(request.data['flags'])
            )

        return Response(status=status.HTTP_201_CREATED)

    def put(self, request):
        schemas = list(Tenant.objects.all().values_list('schema_name',
                                                        flat=True))
        schemas.remove(get_public_schema_name())

        metrictemplate = MetricTemplate.objects.get(name=request.data['name'])

        if request.data['parent']:
            parent = json.dumps([request.data['parent']])
        else:
            parent = ''

        if request.data['probeexecutable']:
            probeexecutable = json.dumps([request.data['probeexecutable']])
        else:
            probeexecutable = ''

        if request.data['mtype'] == 'Active':
            metrictemplate.probeversion = request.data['probeversion']
            metrictemplate.probekey = Version.objects.get(
                object_repr=request.data['probeversion']
            )
            metrictemplate.parent = parent
            metrictemplate.probeexecutable = probeexecutable
            metrictemplate.config = inline_metric_for_db(request.data['config'])
            metrictemplate.attribute = inline_metric_for_db(
                request.data['attribute']
            )
            metrictemplate.dependency = inline_metric_for_db(
                request.data['dependency']
            )
            metrictemplate.flags = inline_metric_for_db(request.data['flags'])
            metrictemplate.files = inline_metric_for_db(request.data['files'])
            metrictemplate.parameter = inline_metric_for_db(
                request.data['parameter']
            )
            metrictemplate.fileparameter = inline_metric_for_db(
                request.data['fileparameter']
            )

        else:
            metrictemplate.parent = parent
            metrictemplate.flags = inline_metric_for_db(request.data['flags'])

        metrictemplate.save()

        for schema in schemas:
            with schema_context(schema):
                try:
                    changes = 0
                    met = Metric.objects.get(name=metrictemplate.name)

                    if met.probeversion != metrictemplate.probeversion:
                        met.probeversion = metrictemplate.probeversion
                        changes += 1

                    if met.probeexecutable != metrictemplate.probeexecutable:
                        met.probeexecutable = metrictemplate.probeexecutable

                    if met.parent != metrictemplate.parent:
                        met.parent = metrictemplate.parent
                        changes += 1

                    if met.attribute != metrictemplate.attribute:
                        met.attribute = metrictemplate.attribute
                        changes += 1

                    if met.dependancy != metrictemplate.dependency:
                        met.dependancy = metrictemplate.dependency
                        changes += 1

                    if met.flags != metrictemplate.flags:
                        met.flags = metrictemplate.flags
                        changes += 1

                    if met.files != metrictemplate.files:
                        met.files = metrictemplate.files
                        changes += 1

                    if met.parameter != metrictemplate.parameter:
                        met.parameter = metrictemplate.parameter
                        changes += 1

                    if met.fileparameter != metrictemplate.fileparameter:
                        met.fileparameter = metrictemplate.fileparameter
                        changes += 1

                    if metrictemplate.config:
                        for item in json.loads(metrictemplate.config):
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
                    else:
                        if met.config != '':
                            met.config = ''
                            changes += 1

                    if changes > 0:
                        met.save()

                except Metric.DoesNotExist:
                    pass

        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, name=None):
        schemas = list(Tenant.objects.all().values_list('schema_name',
                                                        flat=True))
        schemas.remove(get_public_schema_name())
        if name:
            try:
                MetricTemplate.objects.get(name=name).delete()
                for schema in schemas:
                    with schema_context(schema):
                        Metric.objects.get(name=name).delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except MetricTemplate.DoesNotExist:
                raise NotFound(status=404, detail='Metric template not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListMetricTemplateTypes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        types = MetricTemplateType.objects.all().values_list('name', flat=True)
        return Response(types)
