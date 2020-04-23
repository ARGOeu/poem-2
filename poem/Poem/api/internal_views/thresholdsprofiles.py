from django.conf import settings
from django.contrib.contenttypes.models import ContentType

from Poem.api import serializers
from Poem.api.internal_views.utils import sync_webapi
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_profile_history
from Poem.poem.models import ThresholdsProfiles, GroupOfThresholdsProfiles, \
    TenantHistory

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListThresholdsProfiles(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, profile_apiid=None):
        sync_webapi(settings.WEBAPI_THRESHOLDS, ThresholdsProfiles)

        if profile_apiid:
            try:
                profile = ThresholdsProfiles.objects.get(apiid=profile_apiid)
                serializer = serializers.ThresholdsProfileSerializer(profile)
                return Response(serializer.data)

            except ThresholdsProfiles.DoesNotExist:
                raise NotFound(
                    status=404, detail='Thresholds profile not found.'
                )

        else:
            profiles = ThresholdsProfiles.objects.all().order_by('name')
            serializer = serializers.ThresholdsProfileSerializer(
                profiles, many=True
            )
            return Response(serializer.data)

    def put(self, request):
        if request.data['apiid']:
            profile = ThresholdsProfiles.objects.get(
                apiid=request.data['apiid']
            )
            profile.name = request.data['name']
            profile.groupname = request.data['groupname']
            profile.save()

            group = GroupOfThresholdsProfiles.objects.get(
                name=request.data['groupname']
            )
            group.thresholdsprofiles.add(profile)

            data = {'rules': request.data['rules']}

            create_profile_history(profile, data, request.user)

            return Response(status=status.HTTP_201_CREATED)

        else:
            return Response(
                {'detail': 'Apiid field undefined!'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def post(self, request):
        serializer = serializers.ThresholdsProfileSerializer(data=request.data)

        if serializer.is_valid():
            tp = serializer.save()

            group = GroupOfThresholdsProfiles.objects.get(
                name=request.data['groupname']
            )
            group.thresholdsprofiles.add(tp)

            data = {'rules': request.data['rules']}

            create_profile_history(tp, data, request.user)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        else:
            details = []
            for error in serializer.errors:
                details.append(
                    '{}: {}'.format(error, serializer.errors[error][0])
                )
            return Response(
                {'detail': ' '.join(details)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, profile_apiid=None):
        if profile_apiid:
            try:
                tp = ThresholdsProfiles.objects.get(apiid=profile_apiid)
                TenantHistory.objects.filter(
                    object_id=tp.id,
                    content_type=ContentType.objects.get_for_model(tp)
                ).delete()
                tp.delete()

                return Response(status=status.HTTP_204_NO_CONTENT)

            except ThresholdsProfiles.DoesNotExist:
                raise NotFound(
                    status=404, detail='Thresholds profile not found.'
                )

        else:
            return Response(
                {'detail': 'Thresholds profile not specified!'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ListPublicThresholdsProfiles(ListThresholdsProfiles):
    authentication_classes = ()
    permission_classes = ()

    def _denied(self):
        return Response(status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        return self._denied()

    def put(self, request):
        return self._denied()

    def delete(self, request, profile_apiid=None):
        return self._denied()
