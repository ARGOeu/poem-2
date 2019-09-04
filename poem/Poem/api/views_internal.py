from django.core.cache import cache
from django.contrib.contenttypes.models import ContentType
from django.db.utils import IntegrityError

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework_api_key.crypto import _generate_token, hash_token
from rest_framework import status

from rest_framework_api_key import models as api_models

from Poem.helpers.versioned_comments import new_comment
from Poem.poem import models as poem_models
from Poem.poem_super_admin.models import Probe, ExtRevision
from Poem.poem.saml2.config import tenant_from_request, saml_login_string, get_schemaname

from reversion.models import Version, Revision

from .views import NotFound

from Poem import settings

import datetime
import json

from Poem.api.internal_views.aggregationprofiles import *
from Poem.api.internal_views.groupelements import *
from Poem.api.internal_views.metricprofiles import *
from Poem.api.internal_views.metrics import *
from Poem.api.internal_views.probes import *
from Poem.api.internal_views.services import *
from Poem.api.internal_views.users import *


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


class GetConfigOptions(APIView):
    authentication_classes = ()
    permission_classes = ()

    def get(self, request):
        options = dict()

        tenant = tenant_from_request(request)
        options.update(saml_login_string=saml_login_string(tenant))

        options.update(webapimetric=settings.WEBAPI_METRIC)
        options.update(webapiaggregation=settings.WEBAPI_AGGREGATION)
        options.update(tenant_name=tenant)

        return Response({'result': options})


class ListTokens(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            try:
                token = api_models.APIKey.objects.get(client_id=name)
                api_format = dict(
                    id=token.id,
                    name=token.client_id,
                    token=token.token,
                    created=datetime.datetime.strftime(token.created,
                                                       '%Y-%m-%d %H:%M:%S'),
                    revoked=token.revoked
                )

            except api_models.APIKey.DoesNotExist:
                raise NotFound(status=404, detail='API key not found')

        else:
            tokens = api_models.APIKey.objects.all()
            api_format = [
                dict(id=e.id,
                     name=e.client_id,
                     token=e.token,
                     created=datetime.datetime.strftime(e.created,
                                                        '%Y-%m-%d %H:%M:%S'),
                     revoked=e.revoked) for e in tokens]

        return Response(api_format)

    def put(self, request):
        try:
            obj = api_models.APIKey.objects.get(id=request.data['id'])
            obj.client_id = request.data['name']
            obj.revoked = request.data['revoked']
            try:
                obj.save()

            except IntegrityError:
                return Response(status=status.HTTP_403_FORBIDDEN)

            return Response(status=status.HTTP_201_CREATED)

        except api_models.APIKey.DoesNotExist:
            raise NotFound(status=404, detail='API key not found')

    def post(self, request):
        token = _generate_token()
        hashed_token = hash_token(token, settings.SECRET_KEY)
        obj = api_models.APIKey(
            client_id=request.data['name'],
            revoked=request.data['revoked'],
            token=token,
            hashed_token=hashed_token
        )

        try:
            obj.save()
            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(status=status.HTTP_403_FORBIDDEN)

    def delete(self, request, name=None):
        if name:
            try:
                token = api_models.APIKey.objects.get(client_id=name)
                token.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except api_models.APIKey.DoesNotExist:
                raise NotFound(status=404, detail='API key not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


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


class Saml2Login(APIView):
    authentication_classes = (SessionAuthentication,)
    keys = ['username', 'first_name', 'last_name', 'is_superuser']

    def _prefix(self, keys):
        return ['{}_saml2_'.format(get_schemaname()) + key for key in keys]

    def _remove_prefix(self, keys):
        new_keys = dict()

        for k, v in keys.items():
            new_keys[k.split('{}_saml2_'.format(get_schemaname()))[1]] = v

        return new_keys

    def get(self, request):
        result = cache.get_many(self._prefix(self.keys))

        return Response(self._remove_prefix(result))

    def delete(self, request):
        cache.delete_many(self._prefix(self.keys))

        return Response(status=status.HTTP_204_NO_CONTENT)


class ListProbeVersionInfo(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, probekey):
        try:
            version = Version.objects.get(id=probekey)
            data = json.loads(version.serialized_data)[0]['fields']

            return Response(data)

        except Version.DoesNotExist:
            raise NotFound(status=404, detail='Probe version not found')


class ListVersions(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, obj, name):
        models = {'probe': Probe}

        try:
            obj = models[obj].objects.get(name=name)
            ct = ContentType.objects.get_for_model(obj)
            vers = Version.objects.filter(object_id=obj.id,
                                          content_type_id=ct.id)

            results = []
            for ver in vers:
                rev = Revision.objects.get(id=ver.revision_id)
                comment = new_comment(rev.comment, obj_id=obj.id,
                                      version_id=ver.id, ctt_id=ct.id)

                results.append(dict(
                    id=ver.id,
                    object_repr=ver.object_repr,
                    fields=json.loads(ver.serialized_data)[0]['fields'],
                    user=json.loads(ver.serialized_data)[0]['fields']['user'],
                    date_created=datetime.datetime.strftime(
                        rev.date_created, '%Y-%m-%d %H:%M:%S'
                    ),
                    comment=comment,
                    version=json.loads(ver.serialized_data)[0]['fields']['version']
                ))

            results = sorted(results, key=lambda k: k['id'], reverse=True)
            return Response(results)

        except Version.DoesNotExist:
            raise NotFound(status=404, detail='Version not found')
