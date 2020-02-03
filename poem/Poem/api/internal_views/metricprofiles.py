from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core import serializers as django_serializers

import json

from Poem.api import serializers
from Poem.api.internal_views.aggregationprofiles import sync_webapi
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_comment
from Poem.poem import models as poem_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


def create_metricprofile_history(instance, services, user):
    ct = ContentType.objects.get_for_model(instance)

    serialized_data = json.loads(
        django_serializers.serialize(
            'json', [instance],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
    )

    mis = []
    for item in services:
        if isinstance(item, str):
            item = json.loads(item.replace('\'', '\"'))

        mis.append([item['service'], item['metric']])

    serialized_data[0]['fields'].update({
        'metricinstances': mis
    })

    comment = create_comment(instance, ct, json.dumps(serialized_data))

    poem_models.TenantHistory.objects.create(
        object_id=instance.id,
        serialized_data=json.dumps(serialized_data),
        object_repr=instance.__str__(),
        comment=comment,
        user=user.username,
        content_type=ct
    )


class ListAllServiceFlavours(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        service_flavours = poem_models.ServiceFlavour.objects.all()
        serializer = serializers.ServiceFlavourSerializer(service_flavours,
                                                          many=True)
        return Response(serializer.data)


class ListMetricProfiles(APIView):
    authentication_classes = (SessionAuthentication,)

    def post(self, request):
        serializer = serializers.MetricProfileSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            groupprofile = poem_models.GroupOfMetricProfiles.objects.get(
                name=request.data['groupname']
            )
            profile = poem_models.MetricProfiles.objects.get(
                apiid=request.data['apiid']
            )
            groupprofile.metricprofiles.add(profile)

            create_metricprofile_history(
                profile, dict(request.data)['services'], request.user
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, profile_name=None):
        sync_webapi(settings.WEBAPI_METRIC, poem_models.MetricProfiles)

        if profile_name:
            try:
                profile = poem_models.MetricProfiles.objects.get(
                    name=profile_name
                )
                serializer = serializers.MetricProfileSerializer(profile)
                return Response(serializer.data)

            except poem_models.MetricProfiles.DoesNotExist:
                raise NotFound(status=404,
                               detail='Metric profile not found')

        else:
            profiles = poem_models.MetricProfiles.objects.all()
            serializer = serializers.MetricProfileSerializer(profiles,
                                                             many=True)
            return Response(serializer.data)

    def put(self, request):
        profile = poem_models.MetricProfiles.objects.get(
            apiid=request.data['apiid']
        )
        profile.groupname = request.data['groupname']
        profile.save()

        groupprofile = poem_models.GroupOfMetricProfiles.objects.get(
            name=request.data['groupname']
        )
        groupprofile.metricprofiles.add(profile)

        create_metricprofile_history(
            profile, dict(request.data)['services'], request.user
        )

        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, profile_name=None):
        if profile_name:
            try:
                profile = poem_models.MetricProfiles.objects.get(
                    name=profile_name
                )

                poem_models.TenantHistory.objects.filter(
                    object_id=profile.id,
                    content_type=ContentType.objects.get_for_model(profile)
                ).delete()

                profile.delete()

                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.MetricProfiles.DoesNotExist:
                raise NotFound(status=404,
                               detail='Metric profile not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
