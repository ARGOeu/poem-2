import json

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import APIException

from Poem.api.internal_views.utils import one_value_inline, \
    two_value_inline_dict
from Poem.api.permissions import MyHasAPIKey

from Poem.poem import models


class NotFound(APIException):
    def __init__(self, status, detail, code=None):
        self.status_code = status
        self.detail = detail
        self.code = code if code else detail


def build_metricconfigs():
    ret = []

    metricsobjs = models.Metric.objects.all()

    for m in metricsobjs:
        mdict = dict()
        mdict.update({m.name: dict()})

        config = two_value_inline_dict(m.config)
        parent = one_value_inline(m.parent)
        probeexecutable = one_value_inline(m.probeexecutable)
        attribute = two_value_inline_dict(m.attribute)
        dependancy = two_value_inline_dict(m.dependancy)
        flags = two_value_inline_dict(m.flags)
        files = two_value_inline_dict(m.files)
        parameter = two_value_inline_dict(m.parameter)
        fileparameter = two_value_inline_dict(m.fileparameter)

        if probeexecutable:
            mdict[m.name].update({'probe': probeexecutable})
        else:
            mdict[m.name].update({'probe': ''})

        if config:
            mdict[m.name].update({'config': config})
        else:
            mdict[m.name].update({'config': dict()})

        if flags:
            mdict[m.name].update({'flags': flags})
        else:
            mdict[m.name].update({'flags': dict()})

        if dependancy:
            mdict[m.name].update({'dependency': dependancy})
        else:
            mdict[m.name].update({'dependency': dict()})

        if attribute:
            mdict[m.name].update({'attribute': attribute})
        else:
            mdict[m.name].update({'attribute': dict()})

        if parameter:
            mdict[m.name].update({'parameter': parameter})
        else:
            mdict[m.name].update({'parameter': dict()})

        if fileparameter:
            mdict[m.name].update({'file_parameter': fileparameter})
        else:
            mdict[m.name].update({'file_parameter': dict()})

        if files:
            mdict[m.name].update({'file_attribute': files})
        else:
            mdict[m.name].update({'file_attribute': dict()})

        if parent:
            mdict[m.name].update({'parent': parent})
        else:
            mdict[m.name].update({'parent': ''})

        if m.probekey:
            docurl_field = m.probekey.docurl
            mdict[m.name].update(
                {'docurl': docurl_field}
            )
        else:
            mdict[m.name].update({'docurl': ''})

        ret.append(mdict)

    return ret


class ListMetrics(APIView):
    permission_classes = (MyHasAPIKey,)

    def get(self, request):
        return Response(build_metricconfigs())
