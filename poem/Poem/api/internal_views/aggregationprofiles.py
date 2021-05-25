import json

from Poem.api import serializers
from Poem.api.internal_views.utils import sync_webapi
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_profile_history
from Poem.poem import models as poem_models
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


class ListAggregations(APIView):
    authentication_classes = (SessionAuthentication,)

    def post(self, request):
        serializer = serializers.AggregationProfileSerializer(data=request.data)

        if serializer.is_valid():
            try:
                if request.data['groupname']:
                    groupaggr = poem_models.GroupOfAggregations.objects.get(
                        name=request.data['groupname']
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
                    details='No user profile for authenticated user.',
                    status_code=status.HTTP_404_NOT_FOUND
                )

            else:
                if groupaggr in userprofile.groupsofaggregations.all() or \
                        request.user.is_superuser:
                    serializer.save()

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

                    return Response(
                        serializer.data, status=status.HTTP_201_CREATED
                    )

                else:
                    return error_response(
                        detail='You do not have permission to add resources to '
                               'the given group.',
                        status_code=status.HTTP_401_UNAUTHORIZED
                    )

        else:
            details = []
            for error in serializer.errors:
                details.append(
                    '{}: {}'.format(error, serializer.errors[error][0])
                )

            return error_response(
                detail=' '.join(details),
                status_code=status.HTTP_400_BAD_REQUEST
            )

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
                        if request.data['groupname']:
                            groupaggr = \
                                poem_models.GroupOfAggregations.objects.get(
                                    name=request.data['groupname']
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
                            aggr.groupname = request.data['groupname']
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
                                'metric_profile': request.data[
                                    'metric_profile'
                                ],
                                'groups': json.loads(request.data['groups'])
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
