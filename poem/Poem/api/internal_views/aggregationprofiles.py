import json

from Poem.api import serializers
from Poem.api.internal_views.utils import sync_webapi
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_profile_history
from Poem.poem import models as poem_models
from Poem.services.profile_operations import (
    create_profile,
    update_profile,
    delete_profile,
    ProfileOperationError,
)
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


def _parse_groups(groups):
    """Normalize the ``groups`` field to a list (accepts a JSON string)."""
    if isinstance(groups, str):
        return json.loads(groups)
    return groups


def _metric_profile_ref(metric_profile):
    """Return the upstream ``{name, id}`` reference for a metric profile.

    Accepts either an object (used directly) or a name string (the id is
    looked up from the local ``MetricProfiles`` row).
    """
    if isinstance(metric_profile, dict):
        return metric_profile

    try:
        mp = poem_models.MetricProfiles.objects.get(name=metric_profile)
        return {'name': mp.name, 'id': mp.apiid}
    except poem_models.MetricProfiles.DoesNotExist:
        return {'name': metric_profile, 'id': None}


def _metric_profile_name(metric_profile):
    """Return the metric-profile name for local history storage."""
    if isinstance(metric_profile, dict):
        return metric_profile.get('name')
    return metric_profile


class ListAggregations(APIView):
    authentication_classes = (SessionAuthentication,)

    def post(self, request):
        try:
            if request.data.get('groupname', ''):
                groupaggr = poem_models.GroupOfAggregations.objects.get(
                    name=request.data.get('groupname', '')
                )

            else:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='You must provide a group of aggregations.'
                )

            userprofile = poem_models.UserProfile.objects.get(
                user=request.user
            )

        except poem_models.GroupOfAggregations.DoesNotExist:
            return error_response(
                detail='Given group of aggregations does not exist.',
                status_code=status.HTTP_404_NOT_FOUND
            )

        except poem_models.UserProfile.DoesNotExist:
            return error_response(
                detail='No user profile for authenticated user.',
                status_code=status.HTTP_404_NOT_FOUND
            )

        if not (groupaggr in userprofile.groupsofaggregations.all() or
                request.user.is_superuser):
            return error_response(
                detail='You do not have permission to add resources to the '
                       'given group.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        # Validate the local fields with a placeholder apiid; the real id is
        # derived from the upstream create below.
        data = request.data.copy()
        data['apiid'] = 'placeholder'
        serializer = serializers.AggregationProfileSerializer(data=data)
        if not serializer.is_valid():
            details = []
            for error in serializer.errors:
                details.append(
                    '{}: {}'.format(error, serializer.errors[error][0])
                )
            return error_response(
                detail=' '.join(details),
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # Perform the upstream create first so the local row stores the real
        # WEB-API id.
        upstream_payload = {
            'name': request.data['name'],
            'namespace': request.tenant.name,
            'endpoint_group': request.data['endpoint_group'],
            'metric_operation': request.data['metric_operation'],
            'profile_operation': request.data['profile_operation'],
            'metric_profile': _metric_profile_ref(
                request.data['metric_profile']
            ),
            'groups': _parse_groups(request.data['groups']),
        }
        try:
            upstream_id = create_profile(
                'aggregations', request.tenant.name, upstream_payload
            )
        except ProfileOperationError as exc:
            return error_response(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.detail
            )

        serializer.save(apiid=upstream_id)

        aggr = poem_models.Aggregation.objects.get(apiid=upstream_id)
        groupaggr.aggregations.add(aggr)

        data = {
            'endpoint_group': request.data['endpoint_group'],
            'metric_operation': request.data['metric_operation'],
            'profile_operation': request.data['profile_operation'],
            'metric_profile': _metric_profile_name(
                request.data['metric_profile']
            ),
            'groups': _parse_groups(request.data['groups']),
        }

        create_profile_history(aggr, data, request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request):
        if request.data['apiid']:
            try:
                aggr = poem_models.Aggregation.objects.get(
                    apiid=request.data['apiid']
                )

                init_groupaggr = None
                if aggr.groupname and not request.user.is_superuser:
                    try:
                        init_groupaggr = \
                            poem_models.GroupOfAggregations.objects.get(
                                name=aggr.groupname
                            )

                    except poem_models.GroupOfAggregations.DoesNotExist:
                        return error_response(
                            detail="Initial profile's group of aggregations "
                                   "does not exist.",
                            status_code=status.HTTP_404_NOT_FOUND
                        )

                userprofile = poem_models.UserProfile.objects.get(
                    user=request.user
                )

            except poem_models.Aggregation.DoesNotExist:
                return error_response(
                    detail='Aggregation profile with given apiid does not '
                           'exist.',
                    status_code=status.HTTP_404_NOT_FOUND
                )

            except poem_models.UserProfile.DoesNotExist:
                return error_response(
                    detail='User profile for the given user does not exist.',
                    status_code=status.HTTP_404_NOT_FOUND
                )

            else:
                if init_groupaggr in userprofile.groupsofaggregations.all() or \
                        request.user.is_superuser:
                    try:
                        if request.data.get('groupname', ''):
                            groupaggr = \
                                poem_models.GroupOfAggregations.objects.get(
                                    name=request.data.get('groupname', '')
                                )

                        else:
                            return error_response(
                                detail='Please provide group of aggregations.',
                                status_code=status.HTTP_400_BAD_REQUEST
                            )

                    except poem_models.GroupOfAggregations.DoesNotExist:
                        return error_response(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail='Given group of aggregations does not exist.'
                        )

                    else:
                        if groupaggr in userprofile.groupsofaggregations.all() \
                                or request.user.is_superuser:
                            # Perform the upstream update before persisting
                            # local metadata.
                            upstream_payload = {
                                'id': request.data['apiid'],
                                'name': request.data['name'],
                                'namespace': request.tenant.name,
                                'endpoint_group': request.data[
                                    'endpoint_group'
                                ],
                                'metric_operation': request.data[
                                    'metric_operation'
                                ],
                                'profile_operation': request.data[
                                    'profile_operation'
                                ],
                                'metric_profile': _metric_profile_ref(
                                    request.data['metric_profile']
                                ),
                                'groups': _parse_groups(
                                    request.data['groups']
                                ),
                            }
                            try:
                                update_profile(
                                    'aggregations', request.tenant.name,
                                    request.data['apiid'], upstream_payload
                                )
                            except ProfileOperationError as exc:
                                return error_response(
                                    status_code=status.HTTP_502_BAD_GATEWAY,
                                    detail=exc.detail
                                )

                            aggr.groupname = request.data.get('groupname', '')
                            aggr.save()

                            groupaggr.aggregations.add(aggr)

                            data = {
                                'endpoint_group': request.data[
                                    'endpoint_group'
                                ],
                                'metric_operation': request.data[
                                    'metric_operation'
                                ],
                                'profile_operation': request.data[
                                    'profile_operation'
                                ],
                                'metric_profile': _metric_profile_name(
                                    request.data['metric_profile']
                                ),
                                'groups': _parse_groups(
                                    request.data['groups']
                                )
                            }

                            create_profile_history(aggr, data, request.user)

                            return Response(status=status.HTTP_201_CREATED)

                        else:
                            return error_response(
                                detail='You do not have permission to change '
                                       'resources in the given group.',
                                status_code=status.HTTP_401_UNAUTHORIZED
                            )

                else:
                    return error_response(
                        detail='You do not have permission to change resources '
                               'in the given group.',
                        status_code=status.HTTP_401_UNAUTHORIZED
                    )

        else:
            return error_response(
                detail='Apiid field undefined!',
                status_code=status.HTTP_400_BAD_REQUEST
            )

    def get(self, request, aggregation_name=None):
        sync_webapi(
            settings.WEBAPI_AGGREGATION, poem_models.Aggregation,
            request.tenant.name
        )

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
                raise NotFound(
                    status=404, detail='Aggregation not found'
                )

        else:
            aggregations = poem_models.Aggregation.objects.all().order_by(
                'name'
            )
            serializer = serializers.AggregationProfileSerializer(
                aggregations, many=True
            )
            return Response(serializer.data)

    def delete(self, request, aggregation_name=None):
        if aggregation_name:
            try:
                aggregation = poem_models.Aggregation.objects.get(
                    apiid=aggregation_name
                )
                groupname = None
                if aggregation.groupname:
                    try:
                        groupname = poem_models.GroupOfAggregations.objects.get(
                            name=aggregation.groupname
                        )

                    except poem_models.GroupOfAggregations.DoesNotExist:
                        pass

                userprofile = poem_models.UserProfile.objects.get(
                    user=request.user
                )

                if (
                        groupname and groupname in
                        userprofile.groupsofaggregations.all()
                ) or request.user.is_superuser:
                    # Perform the upstream delete before removing the local
                    # row and history.
                    try:
                        delete_profile(
                            'aggregations', request.tenant.name,
                            aggregation_name
                        )
                    except ProfileOperationError as exc:
                        return error_response(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=exc.detail
                        )

                    poem_models.TenantHistory.objects.filter(
                        object_id=aggregation.id,
                        content_type=ContentType.objects.get_for_model(
                            aggregation
                        )
                    ).delete()
                    aggregation.delete()
                    return Response(status=status.HTTP_204_NO_CONTENT)

                else:
                    return error_response(
                        detail='You do not have group permission to delete this'
                               ' aggregation profile.',
                        status_code=status.HTTP_401_UNAUTHORIZED
                    )

            except poem_models.Aggregation.DoesNotExist:
                raise NotFound(
                    status=404, detail='Aggregation not found'
                )

            except poem_models.UserProfile.DoesNotExist:
                return error_response(
                    detail='No user profile for authenticated user.',
                    status_code=status.HTTP_404_NOT_FOUND
                )

        else:
            return error_response(
                detail='Aggregation profile not specified!',
                status_code=status.HTTP_400_BAD_REQUEST
            )


class ListPublicAggregations(ListAggregations):
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
