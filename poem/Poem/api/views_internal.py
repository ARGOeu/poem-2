from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from reversion.models import Version

from .views import NotFound

import json

from Poem.api.internal_views.aggregationprofiles import *
from Poem.api.internal_views.app import *
from Poem.api.internal_views.apikey import *
from Poem.api.internal_views.groupelements import *
from Poem.api.internal_views.history import *
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
