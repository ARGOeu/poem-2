from django.conf import settings
from django.contrib.contenttypes.models import ContentType

from Poem.api import serializers
from Poem.api.internal_views.utils import sync_webapi
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_profile_history
from Poem.poem import models as poem_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListAllServiceFlavours(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        service_flavours = poem_models.ServiceFlavour.objects.all()
        serializer = serializers.ServiceFlavourSerializer(
            service_flavours, many=True
        )
        data = []
        for item in serializer.data:
            data.append(
                {'name': item['name'], 'description': item['description']}
            )
        return Response(sorted(data, key=lambda k: k['name'].lower()))


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

            create_profile_history(
                profile, dict(request.data)['services'],
                request.user, request.data['description']
            )

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
            profiles = poem_models.MetricProfiles.objects.all().order_by('name')
            serializer = serializers.MetricProfileSerializer(profiles,
                                                             many=True)
            return Response(serializer.data)

    def put(self, request):
        if request.data['apiid']:
            profile = poem_models.MetricProfiles.objects.get(
                apiid=request.data['apiid']
            )
            profile.name = request.data['name']
            profile.description = request.data['description']
            profile.groupname = request.data['groupname']
            profile.save()

            groupprofile = poem_models.GroupOfMetricProfiles.objects.get(
                name=request.data['groupname']
            )
            groupprofile.metricprofiles.add(profile)

            create_profile_history(
                profile, dict(request.data)['services'],
                request.user, request.data['description']
            )

            return Response(status=status.HTTP_201_CREATED)

        else:
            return Response(
                {'detail': 'Apiid field undefined!'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, profile_name=None):
        if profile_name:
            try:
                profile = poem_models.MetricProfiles.objects.get(
                    apiid=profile_name
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
            return Response(
                {'detail': 'Metric profile not specified!'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ListPublicMetricProfiles(ListMetricProfiles):
    authentication_classes = ()
    permission_classes = ()

    def _denied(self):
        return Response(status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        return self._denied()

    def put(self, request, profile_name):
        return self._denied()

    def delete(self, request, profile_name):
        return self._denied()
