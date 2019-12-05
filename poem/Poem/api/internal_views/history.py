import datetime
from django.contrib.contenttypes.models import ContentType
import json

from Poem.api.internal_views.utils import one_value_inline, \
    two_value_inline
from Poem.api.views import NotFound
from Poem.helpers.versioned_comments import new_comment
from Poem.poem_super_admin import models as admin_models

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListVersions(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, obj, name=None):
        models = {
            'probe': admin_models.Probe,
            'metrictemplate': admin_models.MetricTemplate
        }

        ct = ContentType.objects.get_for_model(models[obj])

        if name:
            try:
                obj = models[obj].objects.get(name=name)
            except models[obj].DoesNotExist:
                raise NotFound(status=404,
                               detail='{} not found'.format(obj.capitalize()))

            if isinstance(obj, admin_models.Probe):
                vers = admin_models.ProbeHistory.objects.filter(
                    object_id=obj
                ).order_by('-date_created')
            else:
                vers = admin_models.History.objects.filter(
                    object_id=obj.id,
                    content_type=ct
                ).order_by('-date_created')

            if vers.count() == 0:
                raise NotFound(status=404, detail='Version not found')

            else:
                results = []
                for ver in vers:
                    if isinstance(obj, admin_models.Probe):
                        version = ver.version
                        fields = {
                            'name': ver.name,
                            'version': ver.version,
                            'description': ver.description,
                            'comment': ver.comment,
                            'repository': ver.repository,
                            'docurl': ver.docurl
                        }
                        object_repr = '{} ({})'.format(ver.name, ver.version)
                        user = ver.version_user
                        comment = ver.version_comment
                    elif isinstance(obj, admin_models.MetricTemplate):
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
                        object_repr = ver.object_repr
                        user = ver.user
                        comment = ver.comment

                    results.append(dict(
                        id=ver.id,
                        object_repr=object_repr,
                        fields=fields,
                        user=user,
                        date_created=datetime.datetime.strftime(
                            ver.date_created, '%Y-%m-%d %H:%M:%S'
                        ),
                        comment=new_comment(comment),
                        version=version
                    ))

                results = sorted(results, key=lambda k: k['id'], reverse=True)
                return Response(results)

        else:
            if obj == 'probe':
                vers = admin_models.ProbeHistory.objects.all()
                results = sorted(
                    ['{} ({})'.format(ver.name, ver.version) for ver in vers],
                    key=str.lower
                )
            else:
                vers = admin_models.History.objects.filter(content_type=ct)
                results = sorted(
                    [ver.object_repr for ver in vers], key=str.lower
                )

            return Response(results)
