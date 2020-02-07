from django.conf import settings

from Poem.api import serializers
from Poem.api.internal_views.utils import sync_webapi
from Poem.api.views import NotFound
from Poem.poem.models import ThresholdsProfiles, GroupOfThresholdsProfiles

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListThresholdsProfiles(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        sync_webapi(settings.WEBAPI_THRESHOLDS, ThresholdsProfiles)

        if name:
            try:
                profile = ThresholdsProfiles.objects.get(
                    name=name
                )
                serializer = serializers.ThresholdsProfileSerializer(profile)
                return Response(serializer.data)

            except ThresholdsProfiles.DoesNotExist:
                raise NotFound(status=404,
                               detail='Thresholds profile not found.')

        else:
            profiles = ThresholdsProfiles.objects.all()
            serializer = serializers.ThresholdsProfileSerializer(profiles,
                                                                 many=True)
            return Response(serializer.data)

    def put(self, request):
        profile = ThresholdsProfiles.objects.get(
            apiid=request.data['apiid']
        )
        profile.groupname = request.data['groupname']
        profile.save()

        group = GroupOfThresholdsProfiles.objects.get(
            name=request.data['groupname']
        )
        group.thresholdsprofiles.add(profile)

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        serializer = serializers.ThresholdsProfileSerializer(data=request.data)

        if serializer.is_valid():
            tp = serializer.save()

            group = GroupOfThresholdsProfiles.objects.get(
                name=request.data['groupname']
            )
            group.thresholdsprofiles.add(tp)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        else:
            return Response(serializer.data, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, apiid=None):
        if apiid:
            try:
                ThresholdsProfiles.objects.get(apiid=apiid).delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except ThresholdsProfiles.DoesNotExist:
                raise NotFound(status=404,
                               detail='Thresholds profile not found.')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
