import datetime
import re
from itertools import chain

from Poem.api.models import MyAPIKey
from Poem.api.views import NotFound
from Poem.helpers.tenant_helpers import CombinedTenant
from Poem.poem import models as poem_models
from Poem.poem_super_admin.models import WebAPIKey
from django.db.models import Value
from django_tenants.utils import get_public_schema_name
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


class ListAPIKeys(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if request.tenant.combined:
            ct = CombinedTenant(request.tenant)
            tenants = ct.tenants()
            keynames = "|".join([f"{tenant}-RO" for tenant in tenants])

            pattern = \
                f"^WEB-API-({request.tenant.name}(-RO)?|{keynames})$"

        else:
            pattern = f"^WEB-API-{request.tenant.name}(-RO)?$"

        if request.tenant.schema_name == get_public_schema_name():
            superuser = request.user.is_superuser
            tenant_superuser = None
            regular_user = None
            regular_user_no_perms = None
            if not superuser:
                return error_response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="You do not have permission to view API keys"
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
                    tenant_superuser and
                    (not name.startswith("WEB-API-") or
                     (name.startswith("WEB-API-") and re.match(pattern, name)))
            ) or (
                    regular_user and re.match(pattern, name)
            ) or (
                    regular_user_no_perms and
                    name == f"WEB-API-{request.tenant.name}-RO"
            ):
                try:
                    apikey = MyAPIKey.objects.get(name=name)
                    used_by = "poem"

                except MyAPIKey.DoesNotExist:
                    try:
                        apikey = WebAPIKey.objects.get(name=name)
                        used_by = "webapi"

                    except WebAPIKey.DoesNotExist:
                        raise NotFound(status=404, detail='API key not found')

                api_format = dict(
                    id=apikey.id,
                    name=apikey.name,
                    token=apikey.token,
                    created=datetime.datetime.strftime(
                        apikey.created, '%Y-%m-%d %H:%M:%S'
                    ),
                    revoked=apikey.revoked,
                    used_by=used_by
                )

            else:
                return error_response(
                    detail='You do not have permission to view requested '
                           'API key',
                    status_code=status.HTTP_401_UNAUTHORIZED
                )

        else:
            apikeys = sorted(list(chain(
                MyAPIKey.objects.annotate(used_by=Value("poem")),
                WebAPIKey.objects.annotate(used_by=Value("webapi"))
            )), key=lambda k: k.name)
            if superuser:
                apikeys = apikeys

            else:
                if regular_user_no_perms:
                    apikeys = [
                        key for key in apikeys if
                        key.name == f"WEB-API-{request.tenant.name}-RO"
                    ]

                elif regular_user:
                    apikeys = [
                        key for key in apikeys if re.match(pattern, key.name)
                    ]

                else:
                    apikeys = [
                        key for key in apikeys if
                        (key.name.startswith("WEB-API-") and
                         re.match(pattern, key.name)) or
                        not key.name.startswith("WEB-API-")
                    ]

            api_format = [
                dict(
                    id=e.id,
                    name=e.name,
                    created=datetime.datetime.strftime(
                        e.created, '%Y-%m-%d %H:%M:%S'
                    ),
                    revoked=e.revoked,
                    used_by=e.used_by
                ) for e in apikeys
            ]

        return Response(api_format)

    def put(self, request):
        is_superuser = request.user.is_superuser
        is_public_tenant = \
            request.tenant.schema_name == get_public_schema_name()
        if is_superuser:
            try:
                if is_public_tenant and request.data["used_by"] == "webapi":
                    obj = WebAPIKey.objects.get(id=request.data["id"])

                elif request.data["used_by"] == "poem":
                    obj = MyAPIKey.objects.get(id=request.data['id'])

                else:
                    return error_response(
                        detail="You do not have permission to change API keys",
                        status_code=status.HTTP_401_UNAUTHORIZED
                    )

                obj.revoked = request.data['revoked']
                obj.save()

                return Response(status=status.HTTP_201_CREATED)

            except MyAPIKey.DoesNotExist:
                raise NotFound(status=404, detail='API key not found')

        else:
            return error_response(
                detail='You do not have permission to change API keys',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

    def post(self, request):
        if request.user.is_superuser:
            if request.data["used_by"] == "poem":
                model = MyAPIKey
            else:
                if request.tenant.schema_name != get_public_schema_name():
                    return error_response(
                        detail="You do not have permission to add API keys",
                        status_code=status.HTTP_401_UNAUTHORIZED
                    )
                else:
                    model = WebAPIKey
                    if not re.match(
                            "^WEB-API-\S*(-RO)?$", request.data["name"]
                    ):
                        return error_response(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Wrong API key name - web API key name must "
                                   "have the form WEB-API-<tenant_name> or "
                                   "WEB-API-<tenant_name>-RO"
                        )

            names = model.objects.get_usable_keys().values_list(
                'name', flat=True
            )

            if request.data['name'] not in names:
                token = request.data.get('token', False)
                if token:
                    model.objects.create_key(
                        name=request.data['name'],
                        token=token
                    )

                else:
                    model.objects.create_key(
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
                detail='You do not have permission to add API keys',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

    def delete(self, request, name=None):
        is_tenant = request.tenant.schema_name != get_public_schema_name()
        is_superuser = request.user.is_superuser
        if is_superuser:
            if name:
                if name.startswith("poem_"):
                    name = name[5:]
                    model = MyAPIKey

                elif name.startswith("webapi_"):
                    if is_tenant:
                        return error_response(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="You do not have permission to delete web "
                                   "API keys"
                        )

                    name = name[7:]
                    model = WebAPIKey

                else:
                    return error_response(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Missing API key name prefix"
                    )

                try:
                    apikey = model.objects.get(name=name)
                    apikey.delete()
                    return Response(status=status.HTTP_204_NO_CONTENT)

                except model.DoesNotExist:
                    raise NotFound(status=404, detail='API key not found')

            else:
                return error_response(
                    detail='API key name must be defined',
                    status_code=status.HTTP_400_BAD_REQUEST
                )

        else:
            return error_response(
                detail='You do not have permission to delete API keys',
                status_code=status.HTTP_401_UNAUTHORIZED
            )


class ListPublicAPIKey(APIView):
    authentication_classes = ()
    permission_classes = ()

    def get(self, request):
        try:
            apikey = WebAPIKey.objects.get(
                name=f"WEB-API-{request.tenant.name}-RO"
            )
            api_format = dict(
                id=apikey.id,
                name=apikey.name,
                token=apikey.token,
                created=datetime.datetime.strftime(apikey.created,
                                                   '%Y-%m-%d %H:%M:%S'),
                revoked=apikey.revoked
            )

        except WebAPIKey.DoesNotExist:
            raise NotFound(status=404, detail='API key not found')

        return Response(api_format)
