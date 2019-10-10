from django.conf import settings

from Poem.api import serializers
from Poem.api.internal_views.aggregationprofiles import sync_webapi
from Poem.api.views import NotFound
from Poem.poem import models as poem_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


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

        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, profile_name=None):
        if profile_name:
            try:
                profile = poem_models.MetricProfiles.objects.get(
                    name=profile_name
                )
                profile.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.MetricProfiles.DoesNotExist:
                raise NotFound(status=404,
                               detail='Metric profile not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
