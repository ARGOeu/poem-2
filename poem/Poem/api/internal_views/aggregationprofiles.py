from django.conf import settings

from Poem.api import serializers
from Poem.api.models import MyAPIKey
from Poem.api.views import NotFound
from Poem.poem import models as poem_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

import requests


def sync_webapi(api, model):
    token = MyAPIKey.objects.get(name="WEB-API")

    headers = dict()
    headers = {'Accept': 'application/json', 'x-api-key': token.token}
    response = requests.get(api,
                            headers=headers,
                            timeout=180)
    response.raise_for_status()
    data = response.json()['data']

    data_api = set([p['id'] for p in data])
    data_db = set(model.objects.all().values_list('apiid', flat=True))
    entries_not_indb = data_api.difference(data_db)

    new_entries = []
    for p in data:
        if p['id'] in entries_not_indb:
            new_entries.append(
                model(name=p['name'], apiid=p['id'], groupname='')
            )
    if new_entries:
        model.objects.bulk_create(new_entries)

    entries_deleted_onapi = data_db.difference(data_api)
    for p in entries_deleted_onapi:
        model.objects.get(apiid=p).delete()


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

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        aggr = poem_models.Aggregation.objects.get(apiid=request.data['apiid'])
        aggr.groupname = request.data['groupname']
        aggr.save()

        groupaggr = poem_models.GroupOfAggregations.objects.get(
            name=request.data['groupname']
        )
        groupaggr.aggregations.add(aggr)

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
            aggregations = poem_models.Aggregation.objects.all()
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
                aggregation.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.Aggregation.DoesNotExist:
                raise NotFound(status=404,
                               detail='Aggregation not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
