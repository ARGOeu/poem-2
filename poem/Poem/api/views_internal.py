from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework import status

from rest_framework_api_key import models as api_models

from Poem.poem import models as poem_models

from .views import NotFound
from . import serializers


class ListMetricsInGroup(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group):
        metrics = poem_models.Metrics.objects.\
            filter(groupofmetrics__name__exact=group).\
            values_list('name', flat=True)
        results = sorted(metrics, key=lambda m: m.lower())
        if results or (not results and
                       poem_models.GroupOfMetrics.objects.filter(
                           name__exact=group)):
            return Response({'result': results})
        else:
            raise NotFound(status=404,
                           detail='Group not found')


class ListTokens(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        tokens = api_models.APIKey.objects.all().values_list('client_id', 'token')
        api_format = [dict(name=e[0], token=e[1]) for e in tokens]
        return Response(api_format)


class ListTokenForTenant(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name):
        try:
            e = api_models.APIKey.objects.get(client_id=name)

            return Response(e.token)

        except api_models.APIKey.DoesNotExist:
            raise NotFound(status=404,
                           detail='Tenant not found')


class ListUsers(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        users = poem_models.CustUser.objects.all().values_list('username',
                                                               flat=True)
        results = sorted(users)
        return Response({'result': results})


class ListGroupsForUser(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        user = request.user

        if user.is_superuser:
            groupsofaggregations = poem_models.GroupOfAggregations.objects.all().values_list('name', flat=True)
            results = {'aggregations': groupsofaggregations}

            groupsofprofiles = poem_models.GroupOfProfiles.objects.all().values_list('name', flat=True)
            results.update({'profiles': groupsofprofiles})

            groupsofprobes = poem_models.GroupOfProbes.objects.all().values_list('name', flat=True)
            results.update({'probes': groupsofprobes})

            groupsofmetrics = poem_models.GroupOfMetrics.objects.all().values_list('name', flat=True)
            results.update({'metrics': groupsofmetrics})

        else:
            groupsofaggregations = user.groupsofaggregations.all().values_list('name', flat=True)
            results = {'aggregations': groupsofaggregations}

            groupsofprofiles = user.groupsofprofiles.all().values_list('name', flat=True)
            results.update({'profiles': groupsofprofiles})

            groupsofprobes = user.groupsofprobes.all().values_list('name', flat=True)
            results.update({'probes': groupsofprobes})

            groupsofmetrics = user.groupsofmetrics.all().values_list('name', flat=True)
            results.update({'metrics': groupsofmetrics})

        if group:
            return Response(results[group.lower()])
        else:
            return Response({'result': results})


class ListAggregations(APIView):
    authentication_classes= (SessionAuthentication,)

    def post(self, request):
        serializer = serializers.AggregationProfileSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            groupaggr = poem_models.GroupOfAggregations.objects.get(name=request.data['groupname'])
            aggr = poem_models.Aggregation.objects.get(apiid=request.data['apiid'])
            groupaggr.aggregations.add(aggr)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        aggr = poem_models.Aggregation.objects.get(apiid=request.data['apiid'])
        aggr.groupname = request.data['groupname']
        aggr.save()

        groupaggr = poem_models.GroupOfAggregations.objects.get(name=request.data['groupname'])
        groupaggr.aggregations.add(aggr)

        return Response(status=status.HTTP_201_CREATED)

    def get(self, request, aggregation_name=None):
        if aggregation_name:
            try:
                aggregation = poem_models.Aggregation.objects.get(name=aggregation_name)
                serializer = serializers.AggregationProfileSerializer(aggregation)
                return Response(serializer.data)

            except poem_models.Aggregation.DoesNotExist:
                raise NotFound(status=404,
                            detail='Aggregation not found')

        else:
            aggregations = poem_models.Aggregation.objects.all()
            serializer = serializers.AggregationProfileSerializer(aggregations, many=True)
            return Response(serializer.data)


class ListProbes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, probe_name):
        try:
            probes = poem_models.Probe.objects.get(name=probe_name)
        except poem_models.Probe.DoesNotExist:
            result = dict()
        else:
            result = dict(id=probes.id,
                          name=probes.name,
                          description=probes.description,
                          comment=probes.comment)
        return Response(result)
