from Poem.api.views import NotFound
from Poem.poem import models as poem_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListMetricsInGroup(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        if group:
            metrics = poem_models.Metrics.objects.filter(
                groupofmetrics__name__exact=group
            )
        else:
            metrics = poem_models.Metrics.objects.filter(
                groupofmetrics__exact=None
            )
        results = []
        for item in metrics:
            results.append({'id': item.id, 'name': item.name})

        results = sorted(results, key=lambda k: k['name'])

        if results or (not results and
                       poem_models.GroupOfMetrics.objects.filter(
                           name__exact=group)):
            return Response({'result': results})
        else:
            raise NotFound(status=404,
                           detail='Group not found')

    def put(self, request):
        group = poem_models.GroupOfMetrics.objects.get(
            name=request.data['name']
        )

        for metric in request.data['items']:
            group.metrics.add(poem_models.Metrics.objects.get(name=metric))

        # remove the metrics that existed before, and now were removed
        for metric in group.metrics.all():
            if metric.name not in request.data['items']:
                group.metrics.remove(
                    poem_models.Metrics.objects.get(name=metric)
                )

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfMetrics.objects.create(
                name=request.data['name']
            )

            for metric in request.data['items']:
                group.metrics.add(poem_models.Metrics.objects.get(name=metric))

        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        else:
            return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, group=None):
        if group:
            try:
                group = poem_models.GroupOfMetrics.objects.get(name=group)
                group.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.GroupOfMetrics.DoesNotExist:
                raise(NotFound(status=404, detail='Group of metrics not found'))

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListAggregationsInGroup(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        if group:
            aggr = poem_models.Aggregation.objects.filter(
                groupofaggregations__name__exact=group
            )
        else:
            aggr = poem_models.Aggregation.objects.filter(
                groupofaggregations__exact=None
            )

        results = []
        for item in aggr:
            results.append({'id': item.id, 'name': item.name})

        results = sorted(results, key=lambda k: k['name'])

        if results or (not results and
                       poem_models.GroupOfAggregations.objects.filter(
                           name__exact=group
                       )):
            return Response({'result': results})
        else:
            raise NotFound(status=404,
                           detail='Group not found')

    def put(self, request):
        group = poem_models.GroupOfAggregations.objects.get(
            name=request.data['name']
        )

        for aggr in request.data['items']:
            ag = poem_models.Aggregation.objects.get(name=aggr)
            group.aggregations.add(ag)
            ag.groupname = group.name
            ag.save()

        # remove removed aggregations:
        for aggr in group.aggregations.all():
            if aggr.name not in request.data['items']:
                group.aggregations.remove(aggr)
                aggr.groupname = ''
                aggr.save()

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfAggregations.objects.create(
                name=request.data['name']
            )

            for aggr in request.data['items']:
                ag = poem_models.Aggregation.objects.get(name=aggr)
                group.aggregations.add(ag)
                ag.groupname = group.name
                ag.save()

        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        else:
            return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, group=None):
        if group:
            try:
                gr = poem_models.GroupOfAggregations.objects.get(name=group)
                gr.delete()

                for aggr in poem_models.Aggregation.objects.filter(
                        groupname=group
                ):
                    aggr.groupname = ''
                    aggr.save()

                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.GroupOfAggregations.DoesNotExist:
                raise NotFound(status=404,
                               detail='Group of aggregations not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListMetricProfilesInGroup(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        if group:
            mp = poem_models.MetricProfiles.objects.filter(
                groupofmetricprofiles__name__exact=group
            )
        else:
            mp = poem_models.MetricProfiles.objects.filter(
                groupofmetricprofiles__exact=None
            )

        results = []
        for item in mp:
            results.append({'id': item.id, 'name': item.name})

        results = sorted(results, key=lambda k: k['name'])

        if results or (not results and
                       poem_models.GroupOfMetricProfiles.objects.filter(
                           name__exact=group
                       )):
            return Response({'result': results})
        else:
            raise NotFound(status=404,
                           detail='Group of metric profiles not found')

    def put(self, request):
        group = poem_models.GroupOfMetricProfiles.objects.get(
            name=request.data['name']
        )

        for item in request.data['items']:
            mp = poem_models.MetricProfiles.objects.get(name=item)
            group.metricprofiles.add(mp)
            mp.groupname = group.name
            mp.save()

        # remove removed metric profiles
        for mp in group.metricprofiles.all():
            if mp.name not in request.data['items']:
                group.metricprofiles.remove(mp)
                mp.groupname = ''
                mp.save()

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfMetricProfiles.objects.create(
                name=request.data['name']
            )

            for item in request.data['items']:
                mp = poem_models.MetricProfiles.objects.get(name=item)
                group.metricprofiles.add(mp)
                mp.groupname = group.name
                mp.save()

        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        else:
            return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, group=None):
        if group:
            try:
                gr = poem_models.GroupOfMetricProfiles.objects.get(
                    name=group
                )
                gr.delete()

                for mp in poem_models.MetricProfiles.objects.filter(
                    groupname=group
                ):
                    mp.groupname = ''
                    mp.save()

                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.GroupOfMetricProfiles.DoesNotExist:
                raise NotFound(status=404,
                               detail='Group of metric profiles not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
