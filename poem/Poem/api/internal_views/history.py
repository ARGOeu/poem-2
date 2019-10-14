import datetime
from django.contrib.contenttypes.models import ContentType
import json

from Poem.api.views import NotFound
from Poem.helpers.versioned_comments import new_comment
from Poem.poem_super_admin.models import Probe, History, MetricTemplate

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListVersions(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, obj, name=None):
        models = {'probe': Probe, 'metrictemplate': MetricTemplate}

        ct = ContentType.objects.get_for_model(models[obj])

        if name:
            try:
                obj = models[obj].objects.get(name=name)
            except models[obj].DoesNotExist:
                raise NotFound(status=404,
                               detail='{} not found'.format(obj.capitalize()))

            vers = History.objects.filter(object_id=obj.id,
                                          content_type=ct)

            if vers.count() == 0:
                raise NotFound(status=404, detail='Version not found')

            else:
                results = []
                for ver in vers:
                    if isinstance(obj, Probe):
                        results.append(dict(
                            id=ver.id,
                            object_repr=ver.object_repr,
                            fields=json.loads(ver.serialized_data)[0]['fields'],
                            user=ver.user,
                            date_created=datetime.datetime.strftime(
                                ver.date_created, '%Y-%m-%d %H:%M:%S'
                            ),
                            comment=new_comment(ver.comment),
                            version=json.loads(
                                ver.serialized_data
                            )[0]['fields']['version']
                        ))

                    elif isinstance(obj, MetricTemplate):
                        results.append(dict(
                            id=ver.id,
                            object_repr=ver.object_repr,
                            fields=json.loads(ver.serialized_data)[0]['fields'],
                            user=ver.user,
                            date_created=datetime.datetime.strftime(
                                ver.date_created, '%Y-%m-%d %H:%M:%S'
                            ),
                            comment=new_comment(ver.comment),
                        ))

                results = sorted(results, key=lambda k: k['id'], reverse=True)
                return Response(results)

        else:
            vers = History.objects.filter(content_type_id=ct.id)
            results = sorted([ver.object_repr for ver in vers], key=str.lower)
            return Response(results)
