import datetime
from django.contrib.contenttypes.models import ContentType
import json

from Poem.api.views import NotFound
from Poem.helpers.versioned_comments import new_comment
from Poem.poem_super_admin.models import Probe

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from reversion.models import Revision, Version


class ListVersions(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, obj, name):
        models = {'probe': Probe}

        try:
            obj = models[obj].objects.get(name=name)
        except models[obj].DoesNotExist:
            raise NotFound(status=404,
                           detail='{} not found'.format(obj.capitalize()))

        ct = ContentType.objects.get_for_model(obj)
        vers = Version.objects.filter(object_id=obj.id,
                                      content_type_id=ct.id)

        if vers.count() == 0:
            raise NotFound(status=404, detail='Version not found')

        else:
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
                    version=json.loads(
                        ver.serialized_data
                    )[0]['fields']['version']
                ))

            results = sorted(results, key=lambda k: k['id'], reverse=True)
            return Response(results)
