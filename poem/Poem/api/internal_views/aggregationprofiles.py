from django.conf import settings
from django.contrib.contenttypes.models import ContentType

import json

from Poem.api import serializers
from Poem.api.internal_views.utils import sync_webapi
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_profile_history
from Poem.poem import models as poem_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListAggregations(APIView):
    authentication_classes = (SessionAuthentication,)

    def post(self, request):
        serializer = serializers.AggregationProfileSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            groupaggr = poem_models.GroupOfAggregations.objects.get(
                name=request.data['groupname']
            )
            aggr = poem_models.Aggregation.objects.get(
                apiid=request.data['apiid']
            )
            groupaggr.aggregations.add(aggr)

            data = {
                'endpoint_group': request.data['endpoint_group'],
                'metric_operation': request.data['metric_operation'],
                'profile_operation': request.data['profile_operation'],
                'metric_profile': request.data['metric_profile'],
                'groups': json.loads(request.data['groups'])
            }

            create_profile_history(aggr, data, request.user)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        aggr = poem_models.Aggregation.objects.get(apiid=request.data['apiid'])
        aggr.groupname = request.data['groupname']
        aggr.name = request.data['name']
        aggr.save()

        groupaggr = poem_models.GroupOfAggregations.objects.get(
            name=request.data['groupname']
        )
        groupaggr.aggregations.add(aggr)

        data = {
            'endpoint_group': request.data['endpoint_group'],
            'metric_operation': request.data['metric_operation'],
            'profile_operation': request.data['profile_operation'],
            'metric_profile': request.data['metric_profile'],
            'groups': json.loads(request.data['groups'])
        }

        create_profile_history(aggr, data, request.user)

        return Response(status=status.HTTP_201_CREATED)

    def get(self, request, aggregation_name=None):
        sync_webapi(settings.WEBAPI_AGGREGATION, poem_models.Aggregation)

        if aggregation_name:
            try:
                aggregation = poem_models.Aggregation.objects.get(
                    name=aggregation_name
                )
                serializer = serializers.AggregationProfileSerializer(
                    aggregation
                )
                return Response(serializer.data)

            except poem_models.Aggregation.DoesNotExist:
                raise NotFound(status=404,
                               detail='Aggregation not found')

        else:
            aggregations = poem_models.Aggregation.objects.all().order_by('name')
            serializer = serializers.AggregationProfileSerializer(
                aggregations, many=True
            )
            return Response(serializer.data)

    def delete(self, request, aggregation_name):
        if aggregation_name:
            try:
                aggregation = poem_models.Aggregation.objects.get(
                    apiid=aggregation_name
                )
                poem_models.TenantHistory.objects.filter(
                    object_id=aggregation.id,
                    content_type=ContentType.objects.get_for_model(aggregation)
                ).delete()
                aggregation.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.Aggregation.DoesNotExist:
                raise NotFound(status=404,
                               detail='Aggregation not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
