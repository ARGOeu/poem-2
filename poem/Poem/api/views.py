import json

from django.shortcuts import render
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import APIException

from Poem.api.permissions import MyHasAPIKey

from Poem.poem import models
from . import serializers


def none_to_emptystr(val):
    if val is None:
        return ''
    else:
        return val


class NotFound(APIException):
    def __init__(self, status, detail, code=None):
        self.status_code = status
        self.detail = detail
        self.code = code if code else detail


class ListProfile(generics.ListAPIView):
    queryset = models.Profile.objects.all()
    serializer_class = serializers.ProfileSerializer
    permission_classes = (MyHasAPIKey,)


class DetailProfile(generics.RetrieveAPIView):
    lookup_field = 'name'
    queryset = models.Profile.objects.all()
    serializer_class = serializers.ProfileSerializer
    permission_classes = (MyHasAPIKey,)


def build_metricconfigs(tag=None):
    ret = list()

    try:
        if tag:
            tagobj = models.Tags.objects.get(name__iexact=tag)
            metricsobjs = models.Metric.objects.filter(tag=tagobj)
        else:
            metricsobjs = models.Metric.objects.all()

    except models.Tags.DoesNotExist:
        raise NotFound(status=404,
                       detail='Tag not found')

    for m in metricsobjs:
        mdict = dict()
        mdict.update({m.name: dict()})

        try:
            exe = models.MetricProbeExecutable.objects.get(metric=m)
            mdict[m.name].update({'probe': none_to_emptystr(exe.value)})
        except models.MetricProbeExecutable.DoesNotExist:
            mdict[m.name].update({'probe': ''})

        mc = models.MetricConfig.objects.filter(metric=m)
        mdict[m.name].update({'config': dict()})
        for config in mc:
            if config.key and config.value:
                mdict[m.name]['config'].update({config.key: config.value})

        f = models.MetricFlags.objects.filter(metric=m)
        mdict[m.name].update({'flags': dict()})
        for flag in f:
            mdict[m.name]['flags'].update({flag.key: flag.value})

        md = models.MetricDependancy.objects.filter(metric=m)
        mdict[m.name].update({'dependency': dict()})
        for dependancy in md:
            mdict[m.name]['dependency'].update({dependancy.key: dependancy.value})

        ma = models.MetricAttribute.objects.filter(metric=m)
        mdict[m.name].update({'attribute': dict()})
        for attribute in ma:
            mdict[m.name]['attribute'].update({attribute.key: attribute.value})

        mp = models.MetricParameter.objects.filter(metric=m)
        mdict[m.name].update({'parameter': dict()})
        for parameter in mp:
            mdict[m.name]['parameter'].update({parameter.key: parameter.value})

        mfp = models.MetricFileParameter.objects.filter(metric=m)
        mdict[m.name].update({'file_parameter': dict()})
        for parameter in mfp:
            mdict[m.name]['file_parameter'].update({parameter.key: parameter.value})

        mfa = models.MetricFiles.objects.filter(metric=m)
        mdict[m.name].update({'file_attribute': dict()})
        for parameter in mfa:
            mdict[m.name]['file_attribute'].update({parameter.key: parameter.value})

        try:
            parent = models.MetricParent.objects.get(metric=m)
            mdict[m.name].update({'parent': none_to_emptystr(parent.value)})
        except models.MetricParent.DoesNotExist:
            mdict[m.name].update({'parent': ''})

        if m.probekey:
            version_fields = json.loads(m.probekey.serialized_data)
            mdict[m.name].update({'docurl': version_fields[0]['fields']['docurl']})
        else:
            mdict[m.name].update({'docurl': ''})

        ret.append(mdict)

    return ret


class ListTaggedMetrics(APIView):
    permission_classes = (MyHasAPIKey,)

    def get(self, request, tag):
        return Response(build_metricconfigs(tag))


class ListMetrics(APIView):
    permission_classes = (MyHasAPIKey,)

    def get(self, request):
        return Response(build_metricconfigs())
