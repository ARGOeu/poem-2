from Poem.api.internal_views.metrics import one_value_inline, two_value_inline
from Poem.api.views import NotFound
from Poem.poem_super_admin.models import MetricTemplate

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListMetricTemplates(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            metrictemplates = MetricTemplate.objects.filter(name=name)
            if metrictemplates.count() == 0:
                raise NotFound(status=404, detail='Metric template not found')
        else:
            metrictemplates = MetricTemplate.objects.all()

        results = []
        for metrictemplate in metrictemplates:
            config = two_value_inline(metrictemplate.config)
            parent = one_value_inline(metrictemplate.parent)
            probeexecutable = one_value_inline(metrictemplate.probeexecutable)
            attribute = two_value_inline(metrictemplate.attribute)
            dependency = two_value_inline(metrictemplate.dependency)
            flags = two_value_inline(metrictemplate.flags)
            files = two_value_inline(metrictemplate.files)
            parameter = two_value_inline(metrictemplate.parameter)
            fileparameter = two_value_inline(metrictemplate.fileparameter)

            if metrictemplate.probekey:
                probekey = metrictemplate.probekey.id
            else:
                probekey = ''

            results.append(dict(
                id=metrictemplate.id,
                name=metrictemplate.name,
                mtype=metrictemplate.mtype.name,
                probeversion=metrictemplate.probeversion,
                probekey=probekey,
                parent=parent,
                probeexecutable=probeexecutable,
                config=config,
                attribute=attribute,
                dependency=dependency,
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
