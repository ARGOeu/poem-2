import json

from Poem.api.views import NotFound
from Poem.poem import models as poem_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


def one_value_inline(input):
    if input:
        return json.loads(input)[0]
    else:
        return ''


def two_value_inline(input):
    results = []

    if input:
        data = json.loads(input)

        for item in data:
            results.append(({'key': item.split(' ')[0],
                             'value': item.split(' ')[1]}))

    return results


def inline_metric_for_db(input):
    result = []

    for item in input:
        result.append('{} {}'.format(item['key'], item['value']))

    return result


class ListMetric(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            metrics = poem_models.Metric.objects.filter(name=name)
            if metrics.count() == 0:
                raise NotFound(status=404,
                               detail='Metric not found')
        else:
            metrics = poem_models.Metric.objects.all()

        results = []
        for metric in metrics:
            config = two_value_inline(metric.config)
            parent = one_value_inline(metric.parent)
            probeexecutable = one_value_inline(metric.probeexecutable)
            attribute = two_value_inline(metric.attribute)
            dependancy = two_value_inline(metric.dependancy)
            flags = two_value_inline(metric.flags)
            files = two_value_inline(metric.files)
            parameter = two_value_inline(metric.parameter)
            fileparameter = two_value_inline(metric.fileparameter)

            if metric.probekey:
                probekey = metric.probekey.id
            else:
                probekey = ''

            results.append(dict(
                id=metric.id,
                name=metric.name,
                tag=metric.tag.name,
                mtype=metric.mtype.name,
                probeversion=metric.probeversion,
                probekey=probekey,
                group=metric.group.name,
                parent=parent,
                probeexecutable=probeexecutable,
                config=config,
                attribute=attribute,
                dependancy=dependancy,
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

    def put(self, request):
        metric = poem_models.Metric.objects.get(name=request.data['name'])
        config = inline_metric_for_db(request.data['config'])

        if request.data['group'] != metric.group.name:
            metric.group = poem_models.GroupOfMetrics.objects.get(
                name=request.data['group']
            )

        if request.data['tag'] != metric.tag.name:
            metric.tag = poem_models.Tags.objects.get(
                name=request.data['tag']
            )

        if set(config) != set(json.loads(metric.config)):
            metric.config = json.dumps(config)

        metric.save()

        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, name=None):
        if name:
            try:
                metric = poem_models.Metric.objects.get(name=name)
                metric.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.Metric.DoesNotExist:
                raise NotFound(status=404, detail='Metric not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListTags(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        tags = poem_models.Tags.objects.all().values_list('name', flat=True)
        return Response(tags)


class ListMetricTypes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        types = poem_models.MetricType.objects.all().values_list(
            'name', flat=True
        )
        return Response(types)
