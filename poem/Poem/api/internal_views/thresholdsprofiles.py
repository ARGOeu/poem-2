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


class ListThresholdsProfiles(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        sync_webapi(settings.WEBAPI_THRESHOLDS, poem_models.ThresholdsProfiles)

        if name:
            try:
                profile = poem_models.ThresholdsProfiles.objects.get(name=name)
                serializer = serializers.ThresholdsProfileSerializer(profile)
                return Response(serializer.data)

            except poem_models.ThresholdsProfiles.DoesNotExist:
                raise NotFound(
                    status=404, detail='Thresholds profile does not exist.'
                )

        else:
            profiles = poem_models.ThresholdsProfiles.objects.all().order_by(
                'name'
            )
            serializer = serializers.ThresholdsProfileSerializer(
                profiles, many=True
            )
            return Response(serializer.data)

    def put(self, request):
        try:
            userprofile = poem_models.UserProfile.objects.get(user=request.user)
            userprofile_groups = userprofile.groupsofthresholdsprofiles.all()

            if userprofile_groups.count() == 0 and \
                    not request.user.is_superuser:
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='You do not have permission to change thresholds '
                           'profiles.'
                )

            else:
                if request.data['apiid']:
                    profile = poem_models.ThresholdsProfiles.objects.get(
                        apiid=request.data['apiid']
                    )

                    group0 = None
                    if profile.groupname:
                        group0 = \
                            poem_models.GroupOfThresholdsProfiles.objects.get(
                                name=profile.groupname
                            )

                        if group0 not in userprofile_groups and \
                                not request.user.is_superuser:
                            return error_response(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='You do not have permission to change '
                                       'thresholds profiles assigned to this '
                                       'group.'
                            )

                    else:
                        if not request.user.is_superuser:
                            return error_response(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='You do not have permission to change '
                                       'thresholds profiles without assigned '
                                       'group.'
                            )

                    group = poem_models.GroupOfThresholdsProfiles.objects.get(
                        name=request.data['groupname']
                    )

                    change_perm = request.user.is_superuser or \
                        group in userprofile_groups

                    if change_perm:
                        profile.name = request.data['name']
                        profile.groupname = request.data['groupname']
                        profile.save()

                        group.thresholdsprofiles.add(profile)
                        if group0:
                            group0.thresholdsprofiles.remove(profile)

                        data = {'rules': request.data['rules']}

                        create_profile_history(profile, data, request.user)

                        return Response(status=status.HTTP_201_CREATED)

                    else:
                        return error_response(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='You do not have permission to assign '
                                   'thresholds profiles to the given group.'
                        )

                else:
                    return error_response(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='Apiid field should be specified.'
                    )

        except poem_models.UserProfile.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='No user profile for authenticated user.'
            )

        except poem_models.ThresholdsProfiles.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Thresholds profile does not exist.'
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

    def post(self, request):
        serializer = serializers.ThresholdsProfileSerializer(data=request.data)

        try:
            userprofile = poem_models.UserProfile.objects.get(user=request.user)
            userprofile_groups = userprofile.groupsofthresholdsprofiles.all()

            if userprofile_groups.count() == 0 and \
                    not request.user.is_superuser:
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='You do not have permission to add thresholds '
                           'profiles.'
                )

            else:
                group = None
                if 'groupname' in request.data and request.data['groupname']:
                    group = poem_models.GroupOfThresholdsProfiles.objects.get(
                        name=request.data['groupname']
                    )

                add_perm = request.user.is_superuser or \
                    group and group in userprofile_groups

                if add_perm:
                    if serializer.is_valid():
                        tp = serializer.save()

                        if group:
                            group.thresholdsprofiles.add(tp)

                        data = {'rules': request.data['rules']}

                        create_profile_history(tp, data, request.user)

                        return Response(
                            serializer.data, status=status.HTTP_201_CREATED
                        )

                    else:
                        details = []
                        for error in serializer.errors:
                            details.append(
                                '{}: {}'.format(error,
                                                serializer.errors[error][0])
                            )
                        return error_response(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=' '.join(details)
                        )

                else:
                    return error_response(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail='You do not have permission to assign '
                               'thresholds profiles to the given group.'
                    )

        except poem_models.UserProfile.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='No user profile for authenticated user.'
            )

        except poem_models.GroupOfThresholdsProfiles.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Group of thresholds profiles does not exist.'
            )

    def delete(self, request, apiid=None):
        try:
            userprofile = poem_models.UserProfile.objects.get(user=request.user)
            groups = userprofile.groupsofthresholdsprofiles.all()

            if groups.count() == 0 and not request.user.is_superuser:
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='You do not have permission to delete thresholds '
                           'profiles.'
                )

            else:
                if apiid:
                    tp = poem_models.ThresholdsProfiles.objects.get(apiid=apiid)

                    delete_perm = request.user.is_superuser
                    if tp.groupname:
                        group = \
                            poem_models.GroupOfThresholdsProfiles.objects.get(
                                name=tp.groupname
                            )
                        delete_perm = request.user.is_superuser or \
                            group in groups

                    else:
                        if not request.user.is_superuser:
                            return error_response(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='You do not have permission to delete '
                                       'thresholds profiles without assigned '
                                       'group.'
                            )

                    if delete_perm:
                        poem_models.TenantHistory.objects.filter(
                            object_id=tp.id,
                            content_type=ContentType.objects.get_for_model(tp)
                        ).delete()
                        tp.delete()

                        return Response(status=status.HTTP_204_NO_CONTENT)

                    else:
                        return error_response(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='You do not have permission to delete '
                                   'thresholds profiles assigned to this group.'
                        )

                else:
                    return error_response(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='Thresholds profile not specified.'
                    )

        except poem_models.UserProfile.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='No userprofile for authenticated user.'
            )

        except poem_models.ThresholdsProfiles.DoesNotExist:
            raise NotFound(
                status=404, detail='Thresholds profile not found.'
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

    def delete(self, request, apiid=None):
        return self._denied()
