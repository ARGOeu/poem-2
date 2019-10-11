from Poem.api import serializers
from Poem.api.views import NotFound
from Poem.poem import models as poem_models
from Poem.users.models import CustUser

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


def get_groups_for_user(user):
    groupsofaggregations = user.userprofile.groupsofaggregations.all().values_list('name', flat=True)
    results = {'aggregations': groupsofaggregations}

    groupsofmetrics = user.userprofile.groupsofmetrics.all().values_list('name', flat=True)
    results.update({'metrics': groupsofmetrics})

    groupsofmetricprofiles = user.userprofile.groupsofmetricprofiles.all().values_list('name', flat=True)
    results.update({'metricprofiles': groupsofmetricprofiles})

    return results


def get_all_groups():
    groupsofaggregations = poem_models.GroupOfAggregations.objects.all().values_list('name', flat=True)
    results = {'aggregations': groupsofaggregations}

    groupsofmetrics = poem_models.GroupOfMetrics.objects.all().values_list('name', flat=True)
    results.update({'metrics': groupsofmetrics})

    groupsofmetricprofiles = poem_models.GroupOfMetricProfiles.objects.all().values_list('name', flat=True)
    results.update({'metricprofiles': groupsofmetricprofiles})

    return results


class ListUsers(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, username=None):
        if username:
            try:
                user = CustUser.objects.get(username=username)
                serializer = serializers.UsersSerializer(user)
                return Response(serializer.data)

            except CustUser.DoesNotExist:
                raise NotFound(status=404,
                               detail='User not found')

        else:
            users = CustUser.objects.all()
            serializer = serializers.UsersSerializer(users, many=True)

            data = sorted(serializer.data, key=lambda k: k['username'].lower())

            return Response(data)

    def put(self, request):
        user = CustUser.objects.get(username=request.data['username'])
        user.first_name = request.data['first_name']
        user.last_name = request.data['last_name']
        user.email = request.data['email']
        user.is_superuser = request.data['is_superuser']
        user.is_staff = request.data['is_staff']
        user.is_active = request.data['is_active']
        user.save()

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        try:
            CustUser.objects.create_user(
                username=request.data['username'],
                password=request.data['password'],
                email=request.data['email'],
                first_name=request.data['first_name'],
                last_name=request.data['last_name'],
                is_superuser=request.data['is_superuser'],
                is_staff=request.data['is_staff'],
                is_active=request.data['is_active']
            )

            return Response(status=status.HTTP_201_CREATED)

        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, username=None):
        if username:
            try:
                user = CustUser.objects.get(username=username)
                user.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except CustUser.DoesNotExist:
                raise(NotFound(status=404, detail='User not found'))

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class GetUserprofileForUsername(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, username):
        try:
            user = CustUser.objects.get(username=username)
        except CustUser.DoesNotExist:
            raise NotFound(status=404, detail='User not found')
        else:
            try:
                user_profile = poem_models.UserProfile.objects.get(user=user)
                serializer = serializers.UserProfileSerializer(user_profile)
                return Response(serializer.data)

            except poem_models.UserProfile.DoesNotExist:
                raise NotFound(status=404, detail='User profile not found')

    def put(self, request):
        user = CustUser.objects.get(username=request.data['username'])
        userprofile = poem_models.UserProfile.objects.get(user=user)
        userprofile.displayname = request.data['displayname']
        userprofile.subject = request.data['subject']
        userprofile.egiid = request.data['egiid']
        userprofile.save()

        for group in request.data['groupsofaggregations']:
            userprofile.groupsofaggregations.add(
                poem_models.GroupOfAggregations.objects.get(name=group)
            )

        for group in request.data['groupsofmetrics']:
            userprofile.groupsofmetrics.add(
                poem_models.GroupOfMetrics.objects.get(name=group)
            )

        for group in request.data['groupsofmetricprofiles']:
            userprofile.groupsofmetricprofiles.add(
                poem_models.GroupOfMetricProfiles.objects.get(name=group)
            )

        # remove the groups that existed before, and now were removed:
        for group in userprofile.groupsofaggregations.all():
            if group.name not in request.data['groupsofaggregations']:
                userprofile.groupsofaggregations.remove(
                    poem_models.GroupOfAggregations.objects.get(name=group)
                )

        for group in userprofile.groupsofmetrics.all():
            if group.name not in request.data['groupsofmetrics']:
                userprofile.groupsofmetrics.remove(
                    poem_models.GroupOfMetrics.objects.get(name=group)
                )

        for group in userprofile.groupsofmetricprofiles.all():
            if group.name not in request.data['groupsofmetricprofiles']:
                userprofile.groupsofmetricprofiles.remove(
                    poem_models.GroupOfMetricProfiles.objects.get(name=group)
                )

        return Response(status=status.HTTP_201_CREATED)

    def post(self, request):
        user = CustUser.objects.get(username=request.data['username'])

        userprofile = poem_models.UserProfile.objects.create(
            user=user,
            displayname=request.data['displayname'],
            subject=request.data['subject'],
            egiid=request.data['egiid']
        )

        for group in request.data['groupsofaggregations']:
            userprofile.groupsofaggregations.add(
                poem_models.GroupOfAggregations.objects.get(name=group)
            )

        for group in request.data['groupsofmetrics']:
            userprofile.groupsofmetrics.add(
                poem_models.GroupOfMetrics.objects.get(name=group)
            )

        for group in request.data['groupsofmetricprofiles']:
            userprofile.groupsofmetricprofiles.add(
                poem_models.GroupOfMetricProfiles.objects.get(name=group)
            )

        return Response(status=status.HTTP_201_CREATED)


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
