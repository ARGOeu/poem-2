import json

from Poem.api.internal_views.metrics import one_value_inline, two_value_inline
from Poem.api.views import NotFound
from Poem.poem_super_admin.models import MetricTemplate, MetricTemplateType

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from reversion.models import Version


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

        return Response(status=status.HTTP_201_CREATED)



class ListMetricTemplateTypes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        types = MetricTemplateType.objects.all().values_list('name', flat=True)
        return Response(types)
