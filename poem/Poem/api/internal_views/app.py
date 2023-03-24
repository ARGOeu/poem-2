import configparser

import pkg_resources
from Poem.api import serializers
from Poem.api.internal_views.users import get_all_groups, get_groups_for_user
from Poem.helpers.tenant_helpers import CombinedTenant
from Poem.poem.saml2.config import tenant_from_request, saml_login_string
from Poem.poem_super_admin.models import WebAPIKey
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection
from django_tenants.utils import get_public_schema_name
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


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

    def _have_rwperm(self, groups):
        perm = False

        for (key, value) in groups.items():
            if value:
                perm = True
                break

        return perm

    def _get_token(self, name):
        obj = None

        try:
            obj = WebAPIKey.objects.get(name=name)

        except WebAPIKey.DoesNotExist:
            pass

        if obj is not None:
            return obj.token
        else:
            return ''

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

            if self._have_rwperm(groups):
                token = self._get_token(f"WEB-API-{request.tenant.name}")

            else:
                token = self._get_token(f"WEB-API-{request.tenant.name}-RO")

            userdetails['token'] = token

        tenantdetails = {"combined": request.tenant.combined}

        if request.tenant.combined and rw_user:
            ct = CombinedTenant(request.tenant)
            tenants = ct.tenants()

            tenants_dict = dict()
            for tenant in tenants:
                token = WebAPIKey.objects.get(name=f"WEB-API-{tenant}-RO")
                tenants_dict.update({tenant: token.token})

            tenantdetails.update({"tenants": tenants_dict})

        return Response({
            'active': True,
            'userdetails': userdetails,
            "tenantdetails": tenantdetails
        })


def get_use_service_titles(tenant):
    config = configparser.ConfigParser()
    config.read(filenames=settings.CONFIG_FILE)

    try:
        if config.get(
                f"GENERAL_{tenant.upper()}", "useservicetitles"
        ) == "True":
            return True

        else:
            return False

    except configparser.NoOptionError:
        return False


class GetConfigOptions(APIView):
    authentication_classes = ()
    permission_classes = ()

    def get(self, request):
        options = dict()

        try:
            version = pkg_resources.get_distribution('poem').version
        except pkg_resources.DistributionNotFound:
            version = 'undefined_version'

        tenant = tenant_from_request(request)
        if tenant != 'all':
            options.update(saml_login_string=saml_login_string(tenant))
            options.update(use_service_title=get_use_service_titles(tenant))

        options.update(terms_privacy_links=settings.LINKS_TERMS_PRIVACY[tenant])

        options.update(webapimetric=settings.WEBAPI_METRIC)
        options.update(webapiaggregation=settings.WEBAPI_AGGREGATION)
        options.update(webapithresholds=settings.WEBAPI_THRESHOLDS)
        options.update(webapioperations=settings.WEBAPI_OPERATIONS)
        options.update(webapiservicetypes=settings.WEBAPI_SERVICETYPES)
        options.update(webapidatafeeds=settings.WEBAPI_DATAFEEDS)
        options.update(version=version)
        options.update(webapireports=dict(
            main=settings.WEBAPI_REPORTS,
            tags=settings.WEBAPI_REPORTSTAGS,
            topologygroups=settings.WEBAPI_REPORTSTOPOLOGYGROUPS,
            topologyendpoints=settings.WEBAPI_REPORTSTOPOLOGYENDPOINTS,
        ))
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
