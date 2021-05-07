import datetime

from Poem.api import serializers
from Poem.api.views import NotFound
from Poem.poem import models as poem_models
from Poem.users.models import CustUser
from django.db import IntegrityError
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


def get_groups_for_user(user):
    groupsofaggregations = list(
        user.userprofile.groupsofaggregations.all().values_list(
            'name', flat=True
        )
    )
    results = {'aggregations': groupsofaggregations}

    groupsofmetrics = list(
        user.userprofile.groupsofmetrics.all().values_list('name', flat=True)
    )
    results.update({'metrics': groupsofmetrics})

    groupsofmetricprofiles = list(
        user.userprofile.groupsofmetricprofiles.all().values_list(
            'name', flat=True
        )
    )
    results.update({'metricprofiles': groupsofmetricprofiles})

    groupsofthresholdsprofiles = list(
        user.userprofile.groupsofthresholdsprofiles.all().values_list(
            'name', flat=True
        )
    )
    results.update({'thresholdsprofiles': groupsofthresholdsprofiles})

    groupsofreports = list(
        user.userprofile.groupsofreports.all().values_list(
            'name', flat=True
        )
    )
    results.update({'reports': groupsofreports})

    return results


def get_all_groups():
    groupsofaggregations = list(
        poem_models.GroupOfAggregations.objects.all().values_list(
            'name', flat=True
        )
    )
    results = {'aggregations': groupsofaggregations}

    groupsofmetrics = list(
        poem_models.GroupOfMetrics.objects.all().values_list('name', flat=True)
    )
    results.update({'metrics': groupsofmetrics})

    groupsofmetricprofiles = list(
        poem_models.GroupOfMetricProfiles.objects.all().values_list(
            'name', flat=True
        )
    )
    results.update({'metricprofiles': groupsofmetricprofiles})

    groupsofthresholdsprofiles = list(
        poem_models.GroupOfThresholdsProfiles.objects.all().values_list(
            'name', flat=True
        )
    )
    results.update({'thresholdsprofiles': groupsofthresholdsprofiles})

    groupsofreports = list(
        poem_models.GroupOfReports.objects.all().values_list(
            'name', flat=True
        )
    )
    results.update({'reports': groupsofreports})

    return results


class ListUsers(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, username=None):
        if username:
            if request.user.is_superuser or (
                    not request.user.is_superuser and
                    request.user.username == username
            ):
                users = CustUser.objects.filter(username=username)
                if users.count() == 0:
                    raise NotFound(status=404, detail='User does not exist.')

            else:
                return error_response(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail='You do not have permission to fetch users other '
                           'than yourself.'
                )

        else:
            if request.user.is_superuser:
                users = CustUser.objects.all()
            else:
                users = CustUser.objects.filter(username=request.user.username)

        results = []
        for user in users:
            if user.last_login:
                last_login = datetime.datetime.strftime(
                    user.last_login, '%Y-%m-%d %H:%M:%S'
                )
            else:
                last_login = ''

            results.append(dict(
                pk=user.pk,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                email=user.email,
                date_joined=datetime.datetime.strftime(
                    user.date_joined, '%Y-%m-%d %H:%M:%S'
                ),
                last_login=last_login
            ))

        results = sorted(results, key=lambda k: k['username'])

        if username:
            return Response(results[0])
        else:
            return Response(results)

    def put(self, request):
        if request.user.is_superuser:
            try:
                user = CustUser.objects.get(pk=request.data['pk'])
                user.username = request.data['username']
                user.first_name = request.data['first_name']
                user.last_name = request.data['last_name']
                user.email = request.data['email']
                user.is_superuser = request.data['is_superuser']
                user.is_active = request.data['is_active']
                user.save()

                return Response(status=status.HTTP_201_CREATED)

            except CustUser.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='User does not exist.'
                )

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='User with this username already exists.'
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Missing data key: {}'.format(e.args[0])
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to change users.'
            )

    def post(self, request):
        if request.user.is_superuser:
            try:
                CustUser.objects.create_user(
                    username=request.data['username'],
                    password=request.data['password'],
                    email=request.data['email'],
                    first_name=request.data['first_name'],
                    last_name=request.data['last_name'],
                    is_superuser=request.data['is_superuser'],
                    is_active=request.data['is_active']
                )

                return Response(status=status.HTTP_201_CREATED)

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='User with this username already exists.'
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Missing data key: {}'.format(e.args[0])
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to add users.'
            )

    def delete(self, request, username=None):
        if request.user.is_superuser:
            if username:
                if request.user.username == username:
                    return error_response(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='You cannot delete yourself.'
                    )

                else:
                    try:
                        user = CustUser.objects.get(username=username)
                        user.delete()
                        return Response(status=status.HTTP_204_NO_CONTENT)

                    except CustUser.DoesNotExist:
                        raise NotFound(
                            status=404, detail='User does not exist.'
                        )

            else:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Username should be specified.'
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to delete users.'
            )


class GetUserprofileForUsername(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, username):
        try:
            user = CustUser.objects.get(username=username)
        except CustUser.DoesNotExist:
            raise NotFound(status=404, detail='User does not exist.')
        else:
            try:
                user_profile = poem_models.UserProfile.objects.get(user=user)
                serializer = serializers.UserProfileSerializer(user_profile)
                return Response(serializer.data)

            except poem_models.UserProfile.DoesNotExist:
                raise NotFound(
                    status=404, detail='User profile does not exist.'
                )

    def put(self, request):
        if request.user.is_superuser:
            try:
                user = CustUser.objects.get(username=request.data['username'])
                userprofile = poem_models.UserProfile.objects.get(user=user)

                groupsofaggregations = []
                if 'groupsofaggregations' in dict(request.data):
                    for group in dict(request.data)['groupsofaggregations']:
                        groupsofaggregations.append(
                            poem_models.GroupOfAggregations.objects.get(
                                name=group
                            )
                        )

                groupsofmetrics = []
                if 'groupsofmetrics' in dict(request.data):
                    for group in dict(request.data)['groupsofmetrics']:
                        groupsofmetrics.append(
                            poem_models.GroupOfMetrics.objects.get(name=group)
                        )

                groupsofmetricprofiles = []
                if 'groupsofmetricprofiles' in dict(request.data):
                    for group in dict(request.data)['groupsofmetricprofiles']:
                        groupsofmetricprofiles.append(
                            poem_models.GroupOfMetricProfiles.objects.get(
                                name=group
                            )
                        )

                groupsofthresholdsprofiles = []
                if 'groupsofthresholdsprofiles' in dict(request.data):
                    for group in dict(request.data)[
                        'groupsofthresholdsprofiles'
                    ]:
                        groupsofthresholdsprofiles.append(
                            poem_models.GroupOfThresholdsProfiles.objects.get(
                                name=group
                            )
                        )

                userprofile.displayname = request.data['displayname']
                userprofile.subject = request.data['subject']
                userprofile.egiid = request.data['egiid']
                userprofile.save()

                if len(groupsofaggregations) > 0:
                    userprofile.groupsofaggregations.add(*groupsofaggregations)

                if len(groupsofmetrics) > 0:
                    userprofile.groupsofmetrics.add(*groupsofmetrics)

                if len(groupsofmetricprofiles) > 0:
                    userprofile.groupsofmetricprofiles.add(
                        *groupsofmetricprofiles
                    )

                if len(groupsofthresholdsprofiles) > 0:
                    userprofile.groupsofthresholdsprofiles.add(
                        *groupsofthresholdsprofiles
                    )

                # remove the groups that existed before, and now were removed:
                if 'groupsofaggregations' in dict(request.data):
                    for group in userprofile.groupsofaggregations.all():
                        if group.name not in dict(request.data)[
                            'groupsofaggregations'
                        ]:
                            userprofile.groupsofaggregations.remove(group)

                if 'groupsofmetrics' in dict(request.data):
                    for group in userprofile.groupsofmetrics.all():
                        if group.name not in dict(request.data)[
                            'groupsofmetrics'
                        ]:
                            userprofile.groupsofmetrics.remove(group)

                if 'groupsofmetricprofiles' in dict(request.data):
                    for group in userprofile.groupsofmetricprofiles.all():
                        if group.name not in dict(request.data)[
                            'groupsofmetricprofiles'
                        ]:
                            userprofile.groupsofmetricprofiles.remove(group)

                if 'groupsofthresholdsprofiles' in dict(request.data):
                    for group in userprofile.groupsofthresholdsprofiles.all():
                        if group.name not in dict(request.data)[
                            'groupsofthresholdsprofiles'
                        ]:
                            userprofile.groupsofthresholdsprofiles.remove(group)

                return Response(status=status.HTTP_201_CREATED)

            except CustUser.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='User does not exist.'
                )

            except poem_models.UserProfile.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='User profile does not exist.'
                )

            except poem_models.GroupOfAggregations.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Group of aggregations does not exist.'
                )

            except poem_models.GroupOfMetrics.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Group of metrics does not exist.'
                )

            except poem_models.GroupOfMetricProfiles.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Group of metric profiles does not exist.'
                )

            except poem_models.GroupOfThresholdsProfiles.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Group of thresholds profiles does not exist.'
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Missing data key: {}'.format(e.args[0])
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to change user profiles.'
            )

    def post(self, request):
        if request.user.is_superuser:
            try:
                user = CustUser.objects.get(username=request.data['username'])

                groupsofaggregations = []
                if 'groupsofaggregations' in dict(request.data):
                    for group in dict(request.data)['groupsofaggregations']:
                        groupsofaggregations.append(
                            poem_models.GroupOfAggregations.objects.get(
                                name=group
                            )
                        )

                groupsofmetrics = []
                if 'groupsofmetrics' in dict(request.data):
                    for group in dict(request.data)['groupsofmetrics']:
                        groupsofmetrics.append(
                            poem_models.GroupOfMetrics.objects.get(name=group)
                        )

                groupsofmetricprofiles = []
                if 'groupsofmetricprofiles' in dict(request.data):
                    for group in dict(request.data)['groupsofmetricprofiles']:
                        groupsofmetricprofiles.append(
                            poem_models.GroupOfMetricProfiles.objects.get(
                                name=group
                            )
                        )

                groupsofthreholdsprofiles = []
                if 'groupsofthresholdsprofiles' in dict(request.data):
                    for group in dict(request.data)[
                        'groupsofthresholdsprofiles'
                    ]:
                        groupsofthreholdsprofiles.append(
                            poem_models.GroupOfThresholdsProfiles.objects.get(
                                name=group
                            )
                        )

                userprofile = poem_models.UserProfile.objects.create(
                    user=user,
                    displayname=request.data['displayname'],
                    subject=request.data['subject'],
                    egiid=request.data['egiid']
                )

                if len(groupsofaggregations) > 0:
                    userprofile.groupsofaggregations.add(*groupsofaggregations)

                if len(groupsofmetrics) > 0:
                    userprofile.groupsofmetrics.add(*groupsofmetrics)

                if len(groupsofmetricprofiles) > 0:
                    userprofile.groupsofmetricprofiles.add(
                        *groupsofmetricprofiles
                    )

                if len(groupsofthreholdsprofiles) > 0:
                    userprofile.groupsofthresholdsprofiles.add(
                        *groupsofthreholdsprofiles
                    )

                return Response(status=status.HTTP_201_CREATED)

            except CustUser.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='User does not exist.'
                )

            except poem_models.GroupOfAggregations.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Group of aggregations does not exist.'
                )

            except poem_models.GroupOfMetrics.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Group of metrics does not exist.'
                )

            except poem_models.GroupOfMetricProfiles.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Group of metric profiles does not exist.'
                )

            except poem_models.GroupOfThresholdsProfiles.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Group of thresholds profiles does not exist.'
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Missing data key: {}'.format(e.args[0])
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to add user profiles.'
            )


class ListGroupsForGivenUser(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, username=None):
        if username:
            try:
                user = CustUser.objects.get(username=username)

            except CustUser.DoesNotExist:
                raise NotFound(status=404, detail='User not found')

            else:
                results = get_groups_for_user(user)

        else:
            results = get_all_groups()

        return Response({'result': results})


class ListPublicGroupsForGivenUser(APIView):
    authentication_classes = ()
    permission_classes = ()

    def get(self, request, username=None):
        return Response({'result': get_all_groups()})


class ChangePassword(APIView):
    authentication_classes = (SessionAuthentication,)

    def put(self, request):
        try:
            user = CustUser.objects.get(username=request.data['username'])
            if user == request.user:
                user.set_password(request.data['new_password'])
                user.save()
                return Response(status=status.HTTP_201_CREATED)

            else:
                return Response(
                    {'detail': 'Trying to change password for another user.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        except CustUser.DoesNotExist:
            raise NotFound(status=404, detail='User not found.')
