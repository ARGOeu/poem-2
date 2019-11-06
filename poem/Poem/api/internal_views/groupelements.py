from django.db import IntegrityError

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
            gr = poem_models.GroupOfMetrics.objects.filter(name__exact=group)
            if len(gr) > 0:
                metrics = poem_models.Metric.objects.filter(
                    group__name__exact=group
                )
            else:
                raise NotFound(status=404, detail='Group not found')
        else:
            metrics = poem_models.Metric.objects.filter(
                group=None
            )

        results = []
        for item in metrics:
            results.append({'id': item.id, 'name': item.name})

        results = sorted(results, key=lambda k: k['name'])

        return Response({'result': results})

    def put(self, request):
        group = poem_models.GroupOfMetrics.objects.get(
            name=request.data['name']
        )

        for name in dict(request.data)['items']:
            metric = poem_models.Metric.objects.get(name=name)
            metric.group = group
            metric.save()

        # remove the metrics that existed before, and now were removed
        metrics = poem_models.Metric.objects.filter(group=group)
        for metric in metrics:
            if metric.name not in dict(request.data)['items']:
                metric.group = None
                metric.save()

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfMetrics.objects.create(
                name=request.data['name']
            )

            if 'items' in dict(request.data):
                for name in dict(request.data)['items']:
                    metric = poem_models.Metric.objects.get(name=name)
                    metric.group = group
                    metric.save()

        except IntegrityError:
            return Response(
                {'detail': 'Group of metrics with this name already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

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
                groupname=group
            )
        else:
            aggr = poem_models.Aggregation.objects.filter(
                groupname=''
            )

        results = []
        for item in aggr:
            results.append({'id': item.id, 'name': item.name})

        results = sorted(results, key=lambda k: k['name'])
        return Response({'result': results})

    def put(self, request):
        group = poem_models.GroupOfAggregations.objects.get(
            name=request.data['name']
        )

        for aggr in dict(request.data)['items']:
            ag = poem_models.Aggregation.objects.get(name=aggr)
            group.aggregations.add(ag)
            ag.groupname = group.name
            ag.save()

        # remove removed aggregations:
        for aggr in group.aggregations.all():
            if aggr.name not in dict(request.data)['items']:
                group.aggregations.remove(aggr)
                aggr.groupname = ''
                aggr.save()

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfAggregations.objects.create(
                name=request.data['name']
            )

            if 'items' in dict(request.data):
                for aggr in dict(request.data)['items']:
                    ag = poem_models.Aggregation.objects.get(name=aggr)
                    group.aggregations.add(ag)
                    ag.groupname = group.name
                    ag.save()

        except IntegrityError:
            return Response(
                {
                    'detail':
                        'Group of aggregations with this name already exists.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

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
                groupname=group
            )
        else:
            mp = poem_models.MetricProfiles.objects.filter(
                groupname=''
            )

        results = []
        for item in mp:
            results.append({'id': item.id, 'name': item.name})

        results = sorted(results, key=lambda k: k['name'])

        return Response({'result': results})

    def put(self, request):
        group = poem_models.GroupOfMetricProfiles.objects.get(
            name=request.data['name']
        )

        for item in dict(request.data)['items']:
            mp = poem_models.MetricProfiles.objects.get(name=item)
            group.metricprofiles.add(mp)
            mp.groupname = group.name
            mp.save()

        # remove removed metric profiles
        for mp in group.metricprofiles.all():
            if mp.name not in dict(request.data)['items']:
                group.metricprofiles.remove(mp)
                mp.groupname = ''
                mp.save()

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfMetricProfiles.objects.create(
                name=request.data['name']
            )

            if 'items' in dict(request.data):
                for item in dict(request.data)['items']:
                    mp = poem_models.MetricProfiles.objects.get(name=item)
                    group.metricprofiles.add(mp)
                    mp.groupname = group.name
                    mp.save()

        except IntegrityError:
            return Response(
                {
                    'detail':
                        'Metric profiles group with this name already exists.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

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


class ListThresholdsProfilesInGroup(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        if group:
            tp = poem_models.ThresholdsProfiles.objects.filter(
                groupname=group
            )
        else:
            tp = poem_models.ThresholdsProfiles.objects.filter(
                groupname=''
            )

        results = []
        for item in tp:
            results.append({'id': item.id, 'name': item.name})

        results = sorted(results, key=lambda k: k['name'])

        return Response({'result': results})

    def put(self, request):
        group = poem_models.GroupOfThresholdsProfiles.objects.get(
            name=request.data['name']
        )

        for item in dict(request.data)['items']:
            tp = poem_models.ThresholdsProfiles.objects.get(name=item)
            group.thresholdsprofiles.add(tp)
            tp.groupname = group.name
            tp.save()

        # remove removed metric profiles
        for tp in group.thresholdsprofiles.all():
            if tp.name not in dict(request.data)['items']:
                group.thresholdsprofiles.remove(tp)
                tp.groupname = ''
                tp.save()

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfThresholdsProfiles.objects.create(
                name=request.data['name']
            )

            if 'items' in dict(request.data):
                for item in dict(request.data)['items']:
                    tp = poem_models.ThresholdsProfiles.objects.get(name=item)
                    group.thresholdsprofiles.add(tp)
                    tp.groupname = group.name
                    tp.save()

        except IntegrityError:
            return Response(
                {
                    'detail':
                        'Thresholds profiles group with this name already '
                        'exists.'
                },
                status=status.HTTP_400_BAD_REQUEST)

        else:
            return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, group=None):
        if group:
            try:
                gr = poem_models.GroupOfThresholdsProfiles.objects.get(
                    name=group
                )
                gr.delete()

                for tp in poem_models.ThresholdsProfiles.objects.filter(
                        groupname=group
                ):
                    tp.groupname = ''
                    tp.save()

                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.GroupOfThresholdsProfiles.DoesNotExist:
                raise NotFound(status=404,
                               detail='Group of threshold profiles not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
