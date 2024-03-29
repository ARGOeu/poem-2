from Poem.api import serializers
from Poem.api.internal_views.utils import sync_webapi
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_profile_history
from Poem.helpers.metrics_helpers import sync_metrics
from Poem.poem import models as poem_models
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


class ListMetricProfiles(APIView):
    authentication_classes = (SessionAuthentication,)

    def post(self, request):
        serializer = serializers.MetricProfileSerializer(data=request.data)

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

        else:
            if serializer.is_valid():
                try:
                    groupprofile = \
                        poem_models.GroupOfMetricProfiles.objects.get(
                            name=request.data['groupname']
                        )

                    add_permission = \
                        request.user.is_superuser or \
                        groupprofile in userprofile.groupsofmetricprofiles.all()

                    if add_permission:
                        serializer.save()

                        profile = poem_models.MetricProfiles.objects.get(
                            apiid=request.data['apiid']
                        )
                        groupprofile.metricprofiles.add(profile)

                        create_profile_history(
                            profile, dict(request.data)['services'],
                            request.user, request.data['description']
                        )

                        imported, warn, err, unavailable, deleted = \
                            sync_metrics(request.tenant, request.user)

                        data = dict()

                        if len(imported) > 0:
                            if len(imported) == 1:
                                msg = f"Metric {imported[0]} has"

                            else:
                                msg = f"Metrics {', '.join(imported)} have"

                            data.update({
                                "imported": f"{msg} been imported"
                            })

                        if len(warn) > 0:
                            if len(warn) == 1:
                                msg = f"Metric {warn[0]} has"

                            else:
                                msg = f"Metrics {', '.join(warn)} have"

                            data.update({
                                "warning":
                                    f"{msg} been imported with package version "
                                    f"used by {request.tenant.name} tenant"
                            })

                        if len(unavailable) > 0:
                            if len(unavailable) == 1:
                                msg = f"Metric {unavailable[0]}"

                            else:
                                msg = f"Metrics {', '.join(unavailable)}"

                            data.update({
                                "unavailable":
                                    f"{msg} not available for package used by "
                                    f"{request.tenant.name} tenant"
                            })

                        if len(deleted) > 0:
                            if len(deleted) == 1:
                                msg = f"Metric {deleted[0]} has"

                            else:
                                msg = f"Metrics {', '.join(deleted)} have"

                            data.update({
                                "deleted": f"{msg} been deleted"
                            })

                        return Response(
                            data=data, status=status.HTTP_201_CREATED
                        )

                    else:
                        return error_response(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='You do not have permission to assign '
                                   'metric profiles to the given group.'
                        )

                except poem_models.GroupOfMetricProfiles.DoesNotExist:
                    return error_response(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail='Group of metric profiles not found.'
                    )

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

        else:
            try:
                groupprofile = poem_models.GroupOfMetricProfiles.objects.get(
                    name=request.data['groupname']
                )

                change_permission = request.user.is_superuser or \
                    groupprofile in userprofile.groupsofmetricprofiles.all()

                if request.data['apiid']:
                    try:
                        profile = poem_models.MetricProfiles.objects.get(
                            apiid=request.data['apiid']
                        )
                        init_group = \
                            poem_models.GroupOfMetricProfiles.objects.get(
                                name=profile.groupname
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

                    else:
                        if not request.user.is_superuser and \
                                init_group not in \
                                userprofile.groupsofmetricprofiles.all():
                            return error_response(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='You do not have permission to change '
                                       'metric profiles in the given group.'
                            )

                        else:
                            profile.description = request.data['description']
                            profile.groupname = request.data['groupname']

                            if change_permission:
                                profile.save()

                                groupprofile.metricprofiles.add(profile)

                                create_profile_history(
                                    profile, dict(request.data)['services'],
                                    request.user, request.data['description']
                                )

                                imported, warn, err, unavailable, deleted = \
                                    sync_metrics(request.tenant, request.user)

                                data = dict()

                                if len(imported) > 0:
                                    if len(imported) == 1:
                                        msg = f"Metric {imported[0]} has"

                                    else:
                                        msg = f"Metrics " \
                                              f"{', '.join(imported)} have"

                                    data.update({
                                        "imported": f"{msg} been imported"
                                    })

                                if len(warn) > 0:
                                    if len(warn) == 1:
                                        msg = f"Metric {warn[0]} has"

                                    else:
                                        msg = f"Metrics {', '.join(warn)} have"

                                    data.update({
                                        "warning":
                                            f"{msg} been imported with package "
                                            f"version used by "
                                            f"{request.tenant.name} tenant"
                                    })

                                if len(unavailable) > 0:
                                    if len(unavailable) == 1:
                                        msg = f"Metric {unavailable[0]}"

                                    else:
                                        msg = f"Metrics " \
                                              f"{', '.join(unavailable)}"

                                    data.update({
                                        "unavailable":
                                            f"{msg} not available for package "
                                            f"used by {request.tenant.name} "
                                            f"tenant"
                                    })

                                if len(deleted) > 0:
                                    if len(deleted) == 1:
                                        msg = f"Metric {deleted[0]} has"

                                    else:
                                        msg = f"Metrics {', '.join(deleted)} " \
                                              f"have"

                                    data.update({
                                        "deleted": f"{msg} been deleted"
                                    })

                                return Response(
                                    status=status.HTTP_201_CREATED, data=data
                                )

                            else:
                                return error_response(
                                    status_code=status.HTTP_401_UNAUTHORIZED,
                                    detail='You do not have permission to '
                                           'assign metric profiles to the given'
                                           ' group.'
                                )

                else:
                    if change_permission:
                        return error_response(
                            detail='Apiid field undefined!',
                            status_code=status.HTTP_400_BAD_REQUEST
                        )

                    else:
                        return error_response(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='You do not have permission to assign '
                                   'metric profiles to the given group.'
                        )

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
