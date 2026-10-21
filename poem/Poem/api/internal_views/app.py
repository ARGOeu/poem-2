from configparser import NoOptionError, NoSectionError

from Poem.api import serializers
from Poem.api.internal_views.users import get_all_groups, get_groups_for_user
from Poem.helpers.tenant_helpers import CombinedTenant

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection
from django_tenants.utils import get_public_schema_name

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from importlib.metadata import version, PackageNotFoundError


class ListGroupsForUser(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, group=None):
        user = request.user

        if user.is_superuser:
            results = get_all_groups()

        else:
            results = get_groups_for_user(user)

        if group:
            return Response(results[group.lower()])
        else:
            return Response({'result': results})


class IsSessionActive(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, istenant):
        userdetails = dict()

        user = get_user_model().objects.get(id=self.request.user.id)
        serializer = serializers.UsersSerializer(user)
        userdetails.update(serializer.data)

        rw_user = False
        if istenant == 'true':
            if user.is_superuser:
                groups = get_all_groups()

            else:
                groups = get_groups_for_user(user)

            userdetails['groups'] = groups
            rw_user = len(groups["metricprofiles"]) > 0

        tenantdetails = {"combined": request.tenant.combined}

        tenants = []
        if request.tenant.combined and rw_user:
            ct = CombinedTenant(request.tenant)
            tenants = ct.tenants()

        tenantdetails.update({"tenants": tenants})

        return Response({
            'active': True,
            'userdetails': userdetails,
            "tenantdetails": tenantdetails
        })


def get_use_service_titles(tenant):
    config = settings.GET_POEM_CONFIG(settings.CONFIG_FILE)

    try:
        if config.get(
                f"GENERAL_{tenant.upper()}", "useservicetitles"
        ) == "True":
            return True

        else:
            return False

    except (NoOptionError, NoSectionError):
        return False


class GetConfigOptions(APIView):
    authentication_classes = ()
    permission_classes = ()

    def get(self, request):
        options = dict()

        try:
            poem_ver = version("poem")
        except PackageNotFoundError:
            poem_ver = "undefined_version"

        tenant = request.tenant.name.lower()
        if tenant != 'all':
            options.update(use_service_title=get_use_service_titles(tenant))

        options.update(terms_privacy_links=settings.LINKS_TERMS_PRIVACY[tenant])

        options.update(version=poem_ver)
        options.update(tenant_name=tenant)

        return Response({'result': options})


class GetIsTenantSchema(APIView):
    authentication_classes = ()
    permission_classes = ()

    def get(self, request):
        schema = connection.schema_name

        if schema == get_public_schema_name():
            resp = False
        else:
            resp = True

        return Response({'isTenantSchema': resp})
