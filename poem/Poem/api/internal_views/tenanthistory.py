import datetime

from django.contrib.contenttypes.models import ContentType

import json

from Poem.api.internal_views.utils import one_value_inline, two_value_inline
from Poem.api.views import NotFound
from Poem.helpers.versioned_comments import new_comment
from Poem.poem import models as poem_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListTenantVersions(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, obj, name=None):
        models = {
            'metric': poem_models.Metric,
            'metricprofile': poem_models.MetricProfiles,
            'aggregationprofile': poem_models.Aggregation,
            'thresholdsprofile': poem_models.ThresholdsProfiles
        }

        ct = ContentType.objects.get_for_model(models[obj])

        if name:
            try:
                obj = models[obj].objects.get(name=name)
            except models[obj].DoesNotExist:
                if obj.endswith('profile'):
                    ind = obj.find('profile')
                    msg = '{} profile not found.'.format(
                        obj[0:ind].capitalize()
                    )
                else:
                    msg = '{} not found.'.format(obj.capitalize())

                raise NotFound(status=404, detail=msg)

            vers = poem_models.TenantHistory.objects.filter(
                object_id=obj.id,
                content_type=ct
            ).order_by('date_created')

            if vers.count() == 0:
                raise NotFound(status=404, detail='Version not found.')

            else:
                results = []
                for ver in vers:
                    version = datetime.datetime.strftime(
                        ver.date_created, '%Y%m%d-%H%M%S'
                    )
                    fields0 = json.loads(ver.serialized_data)[0]['fields']

                    if isinstance(obj, poem_models.Metric):
                        if fields0['probekey']:
                            probeversion = '{} ({})'.format(
                                fields0['probekey'][0], fields0['probekey'][1]
                            )
                        else:
                            probeversion = ''

                        if 'description' in fields0:
                            description = fields0['description']
                        else:
                            description = ''

                        if 'group' in fields0 and fields0['group']:
                            group = fields0['group'][0]

                        else:
                            group = ''

                        tags = []
                        if 'tags' in fields0:
                            tags = [tag[0] for tag in fields0['tags']]

                        fields = {
                            'name': fields0['name'],
                            'mtype': fields0['mtype'][0],
                            'tags': tags,
                            'group': group,
                            'probeversion': probeversion,
                            'description': description,
                            'parent': one_value_inline(fields0['parent']),
                            'probeexecutable': one_value_inline(
                                fields0['probeexecutable']
                            ),
                            'config': two_value_inline(fields0['config']),
                            'attribute': two_value_inline(
                                fields0['attribute']
                            ),
                            'dependancy': two_value_inline(
                                fields0['dependancy']
                            ),
                            'flags': two_value_inline(fields0['flags']),
                            'parameter': two_value_inline(
                                fields0['parameter']
                            )
                        }

                    elif isinstance(obj, poem_models.MetricProfiles):
                        mi = [
                            {
                                'service': item[0], 'metric': item[1]
                            } for item in fields0['metricinstances']
                        ]
                        fields = {
                            'name': fields0['name'],
                            'groupname': fields0['groupname'],
                            'description': fields0.get('description', ''),
                            'apiid': fields0['apiid'],
                            'metricinstances': sorted(
                                mi, key=lambda k: k['service'].lower()
                            )
                        }

                    else:
                        fields = fields0

                    try:
                        comment = []
                        untracked_fields = [
                            'mtype', 'parent', 'probeexecutable',
                            'attribute', 'dependancy', 'flags', 'parameter'
                        ]
                        if isinstance(obj, poem_models.Metric):
                            untracked_fields.append('name')

                        for item in json.loads(ver.comment):
                            if 'changed' in item:
                                action = 'changed'

                            elif 'added' in item:
                                action = 'added'

                            else:
                                action = 'deleted'

                            if 'object' not in item[action]:
                                new_fields = []
                                for field in item[action]['fields']:
                                    if field not in untracked_fields:
                                        new_fields.append(field)

                                if new_fields:
                                    comment.append(
                                        {action: {'fields': new_fields}}
                                    )

                            else:
                                if item[action]['fields'][0] not in \
                                        untracked_fields:
                                    if item[action]['fields'][0] == 'config':
                                        if 'path' in item[action]['object']:
                                            item[action]['object'].remove('path')
                                    comment.append(item)

                        comment = json.dumps(comment)

                    except json.JSONDecodeError:
                        comment = ver.comment

                    results.append(dict(
                        id=ver.id,
                        object_repr=ver.object_repr,
                        fields=fields,
                        user=ver.user,
                        date_created=datetime.datetime.strftime(
                            ver.date_created, '%Y-%m-%d %H:%M:%S'
                        ),
                        comment=new_comment(comment),
                        version=version
                    ))

                results = sorted(results, key=lambda k: k['id'], reverse=True)
                return Response(results)

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
