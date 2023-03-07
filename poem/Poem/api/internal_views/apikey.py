import datetime
import re

from Poem.api.models import MyAPIKey
from Poem.api.views import NotFound
from Poem.poem import models as poem_models
from Poem.poem_super_admin.models import WebAPIKey
from django.db.models import Q
from django_tenants.utils import get_public_schema_name
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


class ListAPIKeys(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            if request.user.is_superuser:
                try:
                    apikey = MyAPIKey.objects.get(name=name)

                    api_format = dict(
                        id=apikey.id,
                        name=apikey.name,
                        token=apikey.token,
                        created=datetime.datetime.strftime(
                            apikey.created, '%Y-%m-%d %H:%M:%S'
                        ),
                        revoked=apikey.revoked
                    )

                except MyAPIKey.DoesNotExist:
                    raise NotFound(status=404, detail='API key not found')

            else:
                return error_response(
                    detail='You do not have permission for fetching this '
                           'API key.',
                    status_code=status.HTTP_401_UNAUTHORIZED
                )

        else:
            if request.user.is_superuser:
                apikeys = MyAPIKey.objects.all().order_by('name')
            else:
                apikeys = MyAPIKey.objects.filter(
                    name__startswith='WEB-API'
                ).order_by('name')

            api_format = [
                dict(
                    id=e.id,
                    name=e.name,
                    created=datetime.datetime.strftime(
                        e.created, '%Y-%m-%d %H:%M:%S'
                    ),
                    revoked=e.revoked
                ) for e in apikeys
            ]

        return Response(api_format)

    def put(self, request):
        if request.user.is_superuser:
            try:
                names = MyAPIKey.objects.filter(
                    ~Q(id=request.data['id'])
                ).values_list('name', flat=True)
                if request.data['name'] not in names:
                    obj = MyAPIKey.objects.get(id=request.data['id'])
                    obj.name = request.data['name']
                    obj.revoked = request.data['revoked']
                    obj.save()

                else:
                    return error_response(
                        detail='API key with this name already exists',
                        status_code=status.HTTP_400_BAD_REQUEST
                    )

                return Response(status=status.HTTP_201_CREATED)

            except MyAPIKey.DoesNotExist:
                raise NotFound(status=404, detail='API key not found')

        else:
            return error_response(
                detail='You do not have permission to change API keys.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

    def post(self, request):
        if request.user.is_superuser:
            names = MyAPIKey.objects.get_usable_keys().values_list(
                'name', flat=True
            )
            if request.data['name'] not in names:
                token = request.data.get('token', False)
                if token:
                    MyAPIKey.objects.create_key(
                        name=request.data['name'],
                        token=token
                    )
                else:
                    MyAPIKey.objects.create_key(
                        name=request.data['name']
                    )

                return Response(status=status.HTTP_201_CREATED)

            else:
                return error_response(
                    detail='API key with this name already exists',
                    status_code=status.HTTP_400_BAD_REQUEST
                )

        else:
            return error_response(
                detail='You do not have permission to add API keys.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

    def delete(self, request, name=None):
        if request.user.is_superuser:
            if name:
                try:
                    apikey = MyAPIKey.objects.get(name=name)
                    apikey.delete()
                    return Response(status=status.HTTP_204_NO_CONTENT)

                except MyAPIKey.DoesNotExist:
                    raise NotFound(status=404, detail='API key not found')

            else:
                return error_response(
                    detail='API key name must be defined',
                    status_code=status.HTTP_400_BAD_REQUEST
                )

        else:
            return error_response(
                detail='You do not have permission to delete API keys.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )


class ListPublicAPIKey(APIView):
    authentication_classes = ()
    permission_classes = ()

    def get(self, request):
        try:
            apikey = MyAPIKey.objects.get(name='WEB-API-RO')
            api_format = dict(
                id=apikey.id,
                name=apikey.name,
                token=apikey.token,
                created=datetime.datetime.strftime(apikey.created,
                                                   '%Y-%m-%d %H:%M:%S'),
                revoked=apikey.revoked
            )

        except MyAPIKey.DoesNotExist:
            raise NotFound(status=404, detail='API key not found')

        return Response(api_format)


class ListWebAPIKeys(APIView):
    def get(self, request, name=None):
        if request.tenant.schema_name == get_public_schema_name():
            superuser = request.user.is_superuser
            tenant_superuser = None
            regular_user = None
            regular_user_no_perms = None
            if not superuser:
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="You do not have permission to view Web API keys"
                )

        else:
            try:
                userprofile = poem_models.UserProfile.objects.get(
                    user=request.user
                )

            except poem_models.UserProfile.DoesNotExist:
                raise NotFound(
                    status=404,
                    detail='User profile for authenticated user not found.'
                )

            superuser = None
            tenant_superuser = request.user.is_superuser
            regular_user = not tenant_superuser and (
                    len(userprofile.groupsofaggregations.all()) > 0 or
                    len(userprofile.groupsofmetricprofiles.all()) > 0 or
                    len(userprofile.groupsofthresholdsprofiles.all()) > 0
            )
            regular_user_no_perms = not tenant_superuser and (
                    len(userprofile.groupsofaggregations.all()) == 0 and
                    len(userprofile.groupsofmetricprofiles.all()) == 0 and
                    len(userprofile.groupsofthresholdsprofiles.all()) == 0
            )

        if name:
            if superuser or (
                    (regular_user or tenant_superuser) and
                    re.match(f"^WEB-API-{request.tenant.name}(-RO)?$", name)
            ) or (
                    regular_user_no_perms and
                    name == f"WEB-API-{request.tenant.name}-RO"
            ):
                apikey = WebAPIKey.objects.get(name=name)
                api_format = dict(
                    id=apikey.id,
                    name=apikey.name,
                    token=apikey.token,
                    created=datetime.datetime.strftime(
                        apikey.created, "%Y-%m-%d %H:%M:%S"
                    ),
                    revoked=apikey.revoked
                )

            else:
                return error_response(
                    detail="You do not have permission to view requested "
                           "Web API key",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )

        else:
            if superuser:
                apikeys = WebAPIKey.objects.all().order_by("name")

            else:
                if regular_user_no_perms:
                    apikeys = WebAPIKey.objects.filter(
                        name=f"WEB-API-{request.tenant.name}-RO"
                    )

                else:
                    apikeys = WebAPIKey.objects.filter(
                        name__iregex=rf"^WEB-API-{request.tenant.name}(-RO)?$"
                    ).order_by("name")

            api_format = [
                dict(
                    id=e.id,
                    name=e.name,
                    created=datetime.datetime.strftime(
                        e.created, '%Y-%m-%d %H:%M:%S'
                    ),
                    revoked=e.revoked
                ) for e in apikeys
            ]

        return Response(api_format)
