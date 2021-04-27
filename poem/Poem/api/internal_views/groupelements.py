from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_history
from Poem.poem import models as poem_models
from django.db import IntegrityError
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


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
            results.append(item.name)

        return Response({'result': sorted(results)})

    def put(self, request):
        if request.user.is_superuser:
            try:
                group = poem_models.GroupOfMetrics.objects.get(
                    name=request.data['name']
                )

                for name in dict(request.data)['items']:
                    metric = poem_models.Metric.objects.get(name=name)
                    if metric.group != group:
                        metric.group = group
                        metric.save()
                        create_history(metric, request.user.username)

                # remove the metrics that existed before, and now were removed
                metrics = poem_models.Metric.objects.filter(group=group)
                for metric in metrics:
                    if metric.name not in dict(request.data)['items']:
                        metric.group = None
                        metric.save()
                        create_history(metric, request.user.username)

                return Response(status=status.HTTP_201_CREATED)

            except poem_models.GroupOfMetrics.DoesNotExist:
                raise NotFound(
                    status=404, detail='Group of metrics does not exist.'
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to change groups of metrics.'
            )

    def post(self, request):
        if request.user.is_superuser:
            try:
                group = poem_models.GroupOfMetrics.objects.create(
                    name=request.data['name']
                )

                if 'items' in dict(request.data):
                    for name in dict(request.data)['items']:
                        metric = poem_models.Metric.objects.get(name=name)
                        metric.group = group
                        metric.save()
                        create_history(metric, request.user.username)

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Group of metrics with this name already exists.'
                )

            else:
                return Response(status=status.HTTP_201_CREATED)

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to add groups of metrics.'
            )

    def delete(self, request, group=None):
        if request.user.is_superuser:
            if group:
                try:
                    group = poem_models.GroupOfMetrics.objects.get(name=group)
                    group.delete()
                    return Response(status=status.HTTP_204_NO_CONTENT)

                except poem_models.GroupOfMetrics.DoesNotExist:
                    raise NotFound(
                        status=404, detail='Group of metrics not found'
                    )

            else:
                return Response(status=status.HTTP_400_BAD_REQUEST)

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to delete groups of metrics.'
            )


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
            results.append(item.name)

        return Response({'result': sorted(results)})

    def put(self, request):
        if request.user.is_superuser:
            try:
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

            except poem_models.GroupOfAggregations.DoesNotExist:
                raise NotFound(
                    status=404, detail='Group of aggregations does not exist.'
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to change groups of '
                       'aggregations.'
            )

    def post(self, request):
        if request.user.is_superuser:
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
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Group of aggregations with this name already '
                           'exists.'
                )

            else:
                return Response(status=status.HTTP_201_CREATED)

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to add groups of '
                       'aggregations.'
            )

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
            results.append(item.name)

        return Response({'result': sorted(results)})

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


class ListReportsInGroup(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        if group:
            reports = poem_models.Reports.objects.filter(
                groupname=group
            )
        else:
            reports = poem_models.Reports.objects.filter(
                groupname=''
            )

        results = []
        for item in reports:
            results.append(item.name)

        return Response({'result': sorted(results)})

    def put(self, request):
        group = poem_models.GroupOfReports.objects.get(
            name=request.data['name']
        )

        for item in dict(request.data)['items']:
            report = poem_models.Reports.objects.get(name=item)
            group.reports.add(report)
            report.groupname = group.name
            report.save()

        # remove removed reports
        for report in group.reports.all():
            if report.name not in dict(request.data)['items']:
                group.reports.remove(report)
                report.groupname = ''
                report.save()

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            group = poem_models.GroupOfReports.objects.create(
                name=request.data['name']
            )

            if 'items' in dict(request.data):
                for item in dict(request.data)['items']:
                    report = poem_models.Reports.objects.get(name=item)
                    group.reports.add(report)
                    report.groupname = group.name
                    report.save()

        except IntegrityError:
            return Response(
                {
                    'detail':
                        'Reports group with this name already exists.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        else:
            return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, group=None):
        if group:
            try:
                gr = poem_models.GroupOfReports.objects.get(
                    name=group
                )
                gr.delete()

                for report in poem_models.Reports.objects.filter(
                    groupname=group
                ):
                    report.groupname = ''
                    report.save()

                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.GroupOfReports.DoesNotExist:
                raise NotFound(status=404,
                               detail='Group of reports not found')

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
            results.append(item.name)

        return Response({'result': sorted(results)})

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
