from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError

import json

from Poem.api import serializers
from Poem.api.internal_views.metrictemplates import update_metrics
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_history
from Poem.poem_super_admin.models import Probe, ExtRevision, MetricTemplate, \
    History
from Poem.tenants.models import Tenant

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from tenant_schemas.utils import schema_context, get_public_schema_name


class ListProbes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            try:
                probe = Probe.objects.get(name=name)
                serializer = serializers.ProbeSerializer(probe)

                return Response(serializer.data)

            except Probe.DoesNotExist:
                raise NotFound(status=404, detail='Probe not found')

        else:
            probes = Probe.objects.all()

            results = []
            for probe in probes:
                # number of probe revisions
                nv = ExtRevision.objects.filter(probeid=probe.id).count()
                results.append(
                    dict(
                        name=probe.name,
                        version=probe.version,
                        docurl=probe.docurl,
                        description=probe.description,
                        comment=probe.comment,
                        repository=probe.repository,
                        nv=nv
                    )
                )

            results = sorted(results, key=lambda k: k['name'].lower())

            return Response(results)

    def put(self, request):
        probe = Probe.objects.get(id=request.data['id'])
        nameversion = probe.nameversion
        ct = ContentType.objects.get_for_model(Probe)
        fields = []

        try:
            if request.data['new_version'] in [True, 'True', 'true']:
                probe.version = request.data['version']
                new_nameversion = '{} ({})'.format(
                    request.data['name'], request.data['version']
                )
                fields.append('version')

                probe.name = request.data['name']
                probe.repository = request.data['repository']
                probe.docurl = request.data['docurl']
                probe.description = request.data['description']
                probe.comment = request.data['comment']
                probe.user = request.user.username

                probe.save()
                create_history(probe, probe.user)

                if request.data['update_metrics'] in [True, 'true', 'True']:
                    metrictemplates = MetricTemplate.objects.filter(
                        probeversion=nameversion
                    )

                    for metrictemplate in metrictemplates:
                        metrictemplate.probeversion = new_nameversion
                        metrictemplate.probekey = History.objects.get(
                            object_repr=new_nameversion
                        )
                        metrictemplate.save()
                        create_history(metrictemplate, request.user.username)
                        update_metrics(metrictemplate, metrictemplate.name)

            else:
                history = History.objects.filter(object_repr=probe.__str__())
                data = json.loads(history[0].serialized_data)
                new_serialized_field = {
                            'name': request.data['name'],
                            'version': request.data['version'],
                            'nameversion': '{} ({})'.format(
                                request.data['name'], request.data['version']
                            ),
                            'description': request.data['description'],
                            'comment': request.data['comment'],
                            'repository': request.data['repository'],
                            'docurl': request.data['docurl'],
                            'user': request.user.username
                        }
                Probe.objects.filter(pk=probe.id).update(**new_serialized_field)

                data[0]['fields'] = new_serialized_field
                history.update(serialized_data=json.dumps(data))

                if probe.name != request.data['name']:
                    metrictemplates = MetricTemplate.objects.filter(
                        probeversion=nameversion
                    )

                    for metrictemplate in metrictemplates:
                        metrictemplate.probeversion = '{} ({})'.format(
                            request.data['name'], request.data['version']
                        )
                        metrictemplate.save()
                        create_history(metrictemplate, request.user.username)
                        update_metrics(metrictemplate, metrictemplate.name)

            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(
                {'detail': 'Probe with this name already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def post(self, request):
        data = {
            'name': request.data['name'],
            'version': request.data['version'],
            'repository': request.data['repository'],
            'docurl': request.data['docurl'],
            'description': request.data['description'],
            'comment': request.data['comment'],
            'user': request.user.username
        }
        serializer = serializers.ProbeSerializer(data=data)

        if serializer.is_valid():
            probe = serializer.save()
            create_history(probe, probe.user)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        else:
            errors = []
            for key, value in serializer.errors.items():
                if serializer.errors[key]:
                    detail = []
                    for err in serializer.errors[key]:
                        detail.append(err)
                    detail = ' '.join(detail)
                    errors.append(detail)

            errors = '\\'.join(errors)
            return Response({'detail': errors},
                            status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, name=None):
        schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
        schemas.remove(get_public_schema_name())
        if name:
            try:
                probe = Probe.objects.get(name=name)
                mt = MetricTemplate.objects.filter(
                    probeversion=probe.nameversion
                )
                if len(mt) == 0:
                    ExtRevision.objects.filter(probeid=probe.id).delete()
                    for schema in schemas:
                        # need to iterate through schemase because of foreign
                        # key in Metric model
                        with schema_context(schema):
                            History.objects.filter(
                                object_id=probe.id,
                                content_type=
                                ContentType.objects.get_for_model(probe)
                            ).delete()
                    probe.delete()
                    return Response(status=status.HTTP_204_NO_CONTENT)
                else:
                    return Response(
                        {'detail': 'You cannot delete Probe that is associated '
                                   'to metric templates!'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            except Probe.DoesNotExist:
                raise NotFound(status=404, detail='Probe not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
