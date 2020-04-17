from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError

import json

from Poem.api.internal_views.utils import one_value_inline, two_value_inline, \
    inline_metric_for_db
from Poem.api.views import NotFound
from Poem.helpers.history_helpers import create_history
from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListAllMetrics(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        metrics = poem_models.Metric.objects.all().order_by('name')

        results = []
        for metric in metrics:
            results.append({'name': metric.name})

        return Response(results)


class ListMetric(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            metrics = poem_models.Metric.objects.filter(name=name)
            if metrics.count() == 0:
                raise NotFound(status=404,
                               detail='Metric not found')
        else:
            metrics = poem_models.Metric.objects.all()

        results = []
        for metric in metrics:
            config = two_value_inline(metric.config)
            parent = one_value_inline(metric.parent)
            probeexecutable = one_value_inline(metric.probeexecutable)
            attribute = two_value_inline(metric.attribute)
            dependancy = two_value_inline(metric.dependancy)
            flags = two_value_inline(metric.flags)
            files = two_value_inline(metric.files)
            parameter = two_value_inline(metric.parameter)
            fileparameter = two_value_inline(metric.fileparameter)

            if metric.probekey:
                probeversion = metric.probekey.__str__()
            else:
                probeversion = ''

            if metric.group:
                group = metric.group.name
            else:
                group = ''

            results.append(dict(
                id=metric.id,
                name=metric.name,
                mtype=metric.mtype.name,
                probeversion=probeversion,
                group=group,
                description=metric.description,
                parent=parent,
                probeexecutable=probeexecutable,
                config=config,
                attribute=attribute,
                dependancy=dependancy,
                flags=flags,
                files=files,
                parameter=parameter,
                fileparameter=fileparameter
            ))

        results = sorted(results, key=lambda k: k['name'])

        if name:
            return Response(results[0])
        else:
            return Response(results)

    def put(self, request):
        metric = poem_models.Metric.objects.get(name=request.data['name'])

        if request.data['parent']:
            parent = json.dumps([request.data['parent']])
        else:
            parent = ''

        if request.data['probeexecutable']:
            probeexecutable = json.dumps([request.data['probeexecutable']])
        else:
            probeexecutable = ''

        if request.data['description']:
            description = request.data['description']
        else:
            description = ''

        metric.name = request.data['name']
        metric.mtype = poem_models.MetricType.objects.get(
            name=request.data['mtype']
        )
        metric.group = poem_models.GroupOfMetrics.objects.get(
            name=request.data['group']
        )
        metric.description = description
        metric.parent = parent
        metric.flags = inline_metric_for_db(request.data['flags'])

        if request.data['mtype'] == 'Active':
            metric.probekey = admin_models.ProbeHistory.objects.get(
                name=request.data['probeversion'].split(' ')[0],
                package__version=request.data['probeversion'].split(' ')[1][
                                 1:-1]
            )
            metric.probeexecutable = probeexecutable
            metric.config = inline_metric_for_db(request.data['config'])
            metric.attribute = inline_metric_for_db(request.data['attribute'])
            metric.dependancy = inline_metric_for_db(request.data['dependancy'])
            metric.files = inline_metric_for_db(request.data['files'])
            metric.parameter = inline_metric_for_db(request.data['parameter'])
            metric.fileparameter = inline_metric_for_db(
                request.data['fileparameter']
            )

        metric.save()
        create_history(metric, request.user.username)

        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, name=None):
        if name:
            try:
                metric = poem_models.Metric.objects.get(name=name)
                poem_models.TenantHistory.objects.filter(
                    object_id=metric.id,
                    content_type=ContentType.objects.get_for_model(
                        poem_models.Metric
                    )
                ).delete()
                metric.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.Metric.DoesNotExist:
                raise NotFound(status=404, detail='Metric not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ListPublicMetric(ListMetric):
    authentication_classes = ()
    permission_classes = ()


class ListMetricTypes(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        types = poem_models.MetricType.objects.all().values_list(
            'name', flat=True
        )
        return Response(types)


class ListPublicMetricTypes(ListMetricTypes):
    authentication_classes = ()
    permission_classes = ()


class ImportMetrics(APIView):
    authentication_classes = (SessionAuthentication,)

    def post(self, request):
        imported = []
        err = []
        for template in dict(request.data)['metrictemplates']:
            metrictemplate = admin_models.MetricTemplate.objects.get(
                name=template
            )
            mt = poem_models.MetricType.objects.get(
                name=metrictemplate.mtype.name
            )
            gr = poem_models.GroupOfMetrics.objects.get(
                name=request.tenant.name.upper()
            )

            try:
                if metrictemplate.probekey:
                    ver = admin_models.ProbeHistory.objects.get(
                        name=metrictemplate.probekey.name,
                        package__version=metrictemplate.probekey.package.version
                    )

                    metric = poem_models.Metric.objects.create(
                        name=metrictemplate.name,
                        mtype=mt,
                        probekey=ver,
                        description=metrictemplate.description,
                        parent=metrictemplate.parent,
                        group=gr,
                        probeexecutable=metrictemplate.probeexecutable,
                        config=metrictemplate.config,
                        attribute=metrictemplate.attribute,
                        dependancy=metrictemplate.dependency,
                        flags=metrictemplate.flags,
                        files=metrictemplate.files,
                        parameter=metrictemplate.parameter,
                        fileparameter=metrictemplate.fileparameter
                    )
                else:
                    metric = poem_models.Metric.objects.create(
                        name=metrictemplate.name,
                        mtype=mt,
                        description=metrictemplate.description,
                        parent=metrictemplate.parent,
                        flags=metrictemplate.flags,
                        group=gr
                    )

                create_history(metric, request.user.username,
                               comment='Initial version.')

                imported.append(metrictemplate.name)

            except IntegrityError:
                err.append(metrictemplate.name)
                continue

        if imported:
            if len(imported) == 1:
                message_bit = '{} has'.format(imported[0])
            else:
                message_bit = ', '.join(msg for msg in imported) + ' have'

        if err:
            if len(err) == 1:
                error_bit = '{} has'.format(err[0])
            else:
                error_bit = ', '.join(msg for msg in err) + ' have'

        if imported and err:
            data = {
                'imported':
                    '{} been successfully imported.'.format(message_bit),
                'err':
                    '{} not been imported, since those metrics already exist '
                    'in the database.'.format(error_bit)
            }
        elif imported and not err:
            data = {
                'imported':
                    '{} been successfully imported.'.format(message_bit),
            }
        elif not imported and err:
            data = {
                'err':
                    '{} not been imported, since those metrics already exist '
                    'in the database.'.format(error_bit)
            }

        return Response(status=status.HTTP_201_CREATED,
                        data=data)
