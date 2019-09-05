from django.contrib.contenttypes.models import ContentType
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from Poem.helpers.versioned_comments import new_comment
from Poem.poem_super_admin.models import Probe, ExtRevision

from reversion.models import Version, Revision

from .views import NotFound

import datetime
import json

from Poem.api.internal_views.aggregationprofiles import *
from Poem.api.internal_views.app import *
from Poem.api.internal_views.apikey import *
from Poem.api.internal_views.groupelements import *
from Poem.api.internal_views.login import *
from Poem.api.internal_views.metricprofiles import *
from Poem.api.internal_views.metrics import *
from Poem.api.internal_views.probes import *
from Poem.api.internal_views.services import *
from Poem.api.internal_views.users import *


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
