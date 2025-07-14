import datetime

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
        history_model = {
            'probe': admin_models.ProbeHistory,
            'metrictemplate': admin_models.MetricTemplateHistory
        }

        if name:
            history_instance = history_model[obj].objects.filter(name=name)

            if history_instance.count() == 0:
                raise NotFound(status=404, detail='Version not found')

            else:
                instance = history_instance[0].object_id

                vers = history_model[obj].objects.filter(
                    object_id=instance
                ).order_by('-date_created')

        else:
            vers = history_model[obj].objects.all()

        results = []
        for ver in vers:
            if obj == 'probe':
                version = ver.package.version
                fields = {
                    'name': ver.name,
                    'version': ver.package.version,
                    'package': ver.package.__str__(),
                    'description': ver.description,
                    'comment': ver.comment,
                    'repository': ver.repository,
                    'docurl': ver.docurl
                }
            else:
                if ver.probekey:
                    probekey = ver.probekey.__str__()
                    version = ver.probekey.__str__().split(' ')[1][1:-1]
                else:
                    probekey = ''
                    version = datetime.datetime.strftime(
                        ver.date_created, '%Y%m%d-%H%M%S'
                    )
                fields = {
                    'name': ver.name,
                    'mtype': ver.mtype.name,
                    'tags': [tag.name for tag in ver.tags.all()],
                    'probeversion': probekey,
                    'description': ver.description,
                    'parent': one_value_inline(ver.parent),
                    'probeexecutable': one_value_inline(
                        ver.probeexecutable
                    ),
                    'config': two_value_inline(ver.config),
                    'attribute': two_value_inline(ver.attribute),
                    'dependency': two_value_inline(ver.dependency),
                    'flags': two_value_inline(ver.flags),
                    'parameter': two_value_inline(ver.parameter)
                }

            results.append(dict(
                id=ver.id,
                object_repr=ver.__str__(),
                fields=fields,
                user=ver.version_user,
                date_created=datetime.datetime.strftime(
                    ver.date_created, '%Y-%m-%d %H:%M:%S'
                ),
                comment=new_comment(ver.version_comment),
                version=version
            ))

        if name:
            results = sorted(results, key=lambda k: k['id'], reverse=True)
        else:
            results = sorted(results, key=lambda k: k['object_repr'])

        return Response(results)


class ListPublicVersions(ListVersions):
    authentication_classes = ()
    permission_classes = ()
