from Poem.api import serializers
from Poem.api.internal_views.utils import sync_webapi
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_profile_history
from Poem.helpers.metrics_helpers import sync_metrics
from Poem.poem import models as poem_models
from Poem.services.profile_operations import (
    create_profile,
    update_profile,
    delete_profile,
    group_services,
    extract_services,
    ProfileOperationError,
)
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


def _sync_metrics_response(request):
    """Run metric synchronization and build the imported/warning/unavailable/
    deleted response payload shared by create and update."""
    imported, warn, err, unavailable, deleted = sync_metrics(
        request.tenant, request.user
    )

    data = dict()

    if len(imported) > 0:
        if len(imported) == 1:
            msg = f"Metric {imported[0]} has"
        else:
            msg = f"Metrics {', '.join(imported)} have"
        data.update({"imported": f"{msg} been imported"})

    if len(warn) > 0:
        if len(warn) == 1:
            msg = f"Metric {warn[0]} has"
        else:
            msg = f"Metrics {', '.join(warn)} have"
        data.update({
            "warning": f"{msg} been imported with package version used by "
                       f"{request.tenant.name} tenant"
        })

    if len(unavailable) > 0:
        if len(unavailable) == 1:
            msg = f"Metric {unavailable[0]}"
        else:
            msg = f"Metrics {', '.join(unavailable)}"
        data.update({
            "unavailable": f"{msg} not available for package used by "
                           f"{request.tenant.name} tenant"
        })

    if len(deleted) > 0:
        if len(deleted) == 1:
            msg = f"Metric {deleted[0]} has"
        else:
            msg = f"Metrics {', '.join(deleted)} have"
        data.update({"deleted": f"{msg} been deleted"})

    return data


class ListMetricProfiles(APIView):
    authentication_classes = (SessionAuthentication,)

    def post(self, request):
        try:
            userprofile = poem_models.UserProfile.objects.get(
                user=request.user
            )

            if len(userprofile.groupsofmetricprofiles.all()) == 0 and \
                    not request.user.is_superuser:
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='You do not have permission to add metric '
                           'profiles.'
                )

        except poem_models.UserProfile.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='No user profile for authenticated user.'
            )

        # Validate the local fields with a placeholder apiid; the real id is
        # derived from the upstream create below.
        data = request.data.copy()
        data['apiid'] = 'placeholder'
        serializer = serializers.MetricProfileSerializer(data=data)
        if not serializer.is_valid():
            details = []
            for error in serializer.errors:
                details.append(
                    '{}: {}'.format(error, serializer.errors[error][0])
                )
            return Response(
                {'detail': ' '.join(details)},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            groupprofile = poem_models.GroupOfMetricProfiles.objects.get(
                name=request.data.get('groupname', '')
            )

        except poem_models.GroupOfMetricProfiles.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Group of metric profiles not found.'
            )

        add_permission = request.user.is_superuser or \
            groupprofile in userprofile.groupsofmetricprofiles.all()

        if not add_permission:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to assign metric profiles '
                       'to the given group.'
            )

        # Perform the upstream create first so the local row stores the real
        # WEB-API id.
        upstream_payload = {
            'name': request.data['name'],
            'description': request.data.get('description', ''),
            'services': group_services(extract_services(request.data)),
        }
        try:
            upstream_id = create_profile(
                'metricprofiles', request.tenant.name, upstream_payload
            )
        except ProfileOperationError as exc:
            return error_response(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.detail
            )

        serializer.save(apiid=upstream_id)

        profile = poem_models.MetricProfiles.objects.get(apiid=upstream_id)
        groupprofile.metricprofiles.add(profile)

        create_profile_history(
            profile, dict(request.data)['services'],
            request.user, request.data['description']
        )

        data = _sync_metrics_response(request)

        return Response(data=data, status=status.HTTP_201_CREATED)

    def get(self, request, profile_name=None):
        sync_webapi(
            settings.WEBAPI_METRIC, poem_models.MetricProfiles,
            request.tenant.name
        )

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
        try:
            userprofile = poem_models.UserProfile.objects.get(
                user=request.user
            )

            if len(userprofile.groupsofmetricprofiles.all()) == 0 and \
                    not request.user.is_superuser:
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='You do not have permission to change metric '
                           'profiles.'
                )

        except poem_models.UserProfile.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='No user profile for authenticated user.'
            )

        try:
            groupprofile = poem_models.GroupOfMetricProfiles.objects.get(
                name=request.data.get('groupname', '')
            )

            change_permission = request.user.is_superuser or \
                groupprofile in userprofile.groupsofmetricprofiles.all()

            if not request.data['apiid']:
                if change_permission:
                    return error_response(
                        detail='Apiid field undefined!',
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    return error_response(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail='You do not have permission to assign metric '
                               'profiles to the given group.'
                    )

            try:
                profile = poem_models.MetricProfiles.objects.get(
                    apiid=request.data['apiid']
                )
                if profile.groupname:
                    init_group = \
                        poem_models.GroupOfMetricProfiles.objects.get(
                            name=profile.groupname
                        )
                else:
                    init_group = \
                        poem_models.GroupOfMetricProfiles.objects.get(
                            name=groupprofile
                        )

            except poem_models.MetricProfiles.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Metric profile does not exist.'
                )

            except poem_models.GroupOfMetricProfiles.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Group of metric profiles does not exist.'
                )

            if not request.user.is_superuser and \
                    init_group not in userprofile.groupsofmetricprofiles.all():
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='You do not have permission to change metric '
                           'profiles in the given group.'
                )

            if not change_permission:
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='You do not have permission to assign metric '
                           'profiles to the given group.'
                )

            # Perform the upstream update before persisting local metadata.
            upstream_payload = {
                'id': request.data['apiid'],
                'name': request.data['name'],
                'description': request.data.get('description', ''),
                'services': group_services(extract_services(request.data)),
            }
            try:
                update_profile(
                    'metricprofiles', request.tenant.name,
                    request.data['apiid'], upstream_payload
                )
            except ProfileOperationError as exc:
                return error_response(
                    status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.detail
                )

            profile.description = request.data['description']
            profile.groupname = request.data.get('groupname', '')
            profile.save()

            groupprofile.metricprofiles.add(profile)

            create_profile_history(
                profile, dict(request.data)['services'],
                request.user, request.data['description']
            )

            data = _sync_metrics_response(request)

            return Response(status=status.HTTP_201_CREATED, data=data)

        except poem_models.GroupOfMetricProfiles.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Given group of metric profiles does not exist.'
            )

    def delete(self, request, profile_name=None):
        if profile_name:
            try:
                userprofile = poem_models.UserProfile.objects.get(
                    user=request.user
                )
                usergroups = \
                    userprofile.groupsofmetricprofiles.all().values_list(
                        'name', flat=True
                    )

                if not request.user.is_superuser and len(usergroups) == 0:
                    return error_response(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail='You do not have permission to delete metric '
                               'profiles.'
                    )

                else:
                    try:
                        profile = poem_models.MetricProfiles.objects.get(
                            apiid=profile_name
                        )
                        user_perm = request.user.is_superuser or \
                            profile.groupname in usergroups

                        if user_perm:
                            # Perform the upstream delete before removing the
                            # local row and history.
                            try:
                                delete_profile(
                                    'metricprofiles', request.tenant.name,
                                    profile_name
                                )
                            except ProfileOperationError as exc:
                                return error_response(
                                    status_code=status.HTTP_502_BAD_GATEWAY,
                                    detail=exc.detail
                                )

                            poem_models.TenantHistory.objects.filter(
                                object_id=profile.id,
                                content_type=ContentType.objects.get_for_model(
                                    profile
                                )
                            ).delete()

                            profile.delete()
                            deleted = sync_metrics(
                                request.tenant, request.user
                            )[4]

                            data = dict()

                            if len(deleted) > 0:
                                if len(deleted) == 1:
                                    msg = f"Metric {deleted[0]} has"

                                else:
                                    msg = f"Metrics {', '.join(deleted)} have"

                                data.update({"deleted": f"{msg} been deleted"})

                            return Response(
                                data=data, status=status.HTTP_204_NO_CONTENT
                            )

                        else:
                            return error_response(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='You do not have permission to delete '
                                       'metric profiles assigned to this group.'
                            )

                    except poem_models.MetricProfiles.DoesNotExist:
                        raise NotFound(
                            status=404, detail='Metric profile not found'
                        )
            except poem_models.UserProfile.DoesNotExist:
                return error_response(
                    detail='No user profile for authenticated user.',
                    status_code=status.HTTP_404_NOT_FOUND
                )

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
