import datetime
from django.contrib.contenttypes.models import ContentType
import json

from Poem.api.internal_views.utils import one_value_inline, \
    two_value_inline
from Poem.api.views import NotFound
from Poem.helpers.versioned_comments import new_comment
from Poem.poem_super_admin.models import Probe, History, MetricTemplate, \
    MetricTemplateType

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

            vers = History.objects.filter(
                object_id=obj.id,
                content_type=ct).order_by('date_created')

            if vers.count() == 0:
                raise NotFound(status=404, detail='Version not found')

            else:
                results = []
                for ver in vers:
                    if isinstance(obj, Probe):
                        version = json.loads(
                            ver.serialized_data
                        )[0]['fields']['version']
                        fields = json.loads(ver.serialized_data)[0]['fields']
                    elif isinstance(obj, MetricTemplate):
                        version = datetime.datetime.strftime(
                            ver.date_created, '%Y%m%d-%H%M%S'
                        )
                        fields0 = json.loads(ver.serialized_data)[0]['fields']
                        fields = {
                            'name': fields0['name'],
                            'mtype': fields0['mtype'][0],
                            'probeversion': fields0['probeversion'],
                            'parent': one_value_inline(fields0['parent']),
                            'probeexecutable': one_value_inline(
                                fields0['probeexecutable']
                            ),
                            'config': two_value_inline(fields0['config']),
                            'attribute': two_value_inline(
                                fields0['attribute']
                            ),
                            'dependency': two_value_inline(
                                fields0['dependency']
                            ),
                            'flags': two_value_inline(fields0['flags']),
                            'files': two_value_inline(fields0['files']),
                            'parameter': two_value_inline(
                                fields0['parameter']
                            ),
                            'fileparameter': two_value_inline(
                                fields0['fileparameter']
                            )
                        }

                    results.append(dict(
                        id=ver.id,
                        object_repr=ver.object_repr,
                        fields=fields,
                        user=ver.user,
                        date_created=datetime.datetime.strftime(
                            ver.date_created, '%Y-%m-%d %H:%M:%S'
                        ),
                        comment=new_comment(ver.comment),
                        version=version
                    ))

                results = sorted(results, key=lambda k: k['id'], reverse=True)
                return Response(results)

        else:
            vers = History.objects.filter(content_type_id=ct.id)
            results = sorted([ver.object_repr for ver in vers], key=str.lower)
            return Response(results)
