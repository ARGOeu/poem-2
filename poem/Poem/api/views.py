import json

import requests
from Poem.api.internal_views.utils import one_value_inline, \
    two_value_inline_dict
from Poem.api.models import MyAPIKey
from Poem.api.permissions import MyHasAPIKey
from Poem.poem import models
from Poem.poem_super_admin import models as admin_models
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import APIView


class NotFound(APIException):
    def __init__(self, status, detail, code=None):
        self.status_code = status
        self.detail = detail
        self.code = code if code else detail


def build_metricconfigs(templates=False):
    ret = []

    if templates:
        metricsobjs = admin_models.MetricTemplate.objects.all().order_by('name')

    else:
        metricsobjs = models.Metric.objects.all().order_by('name')

    for m in metricsobjs:
        mdict = dict()
        mdict.update({m.name: dict()})

        config = two_value_inline_dict(m.config)

        if templates:
            parent = one_value_inline(m.parent)
            probeexecutable = one_value_inline(m.probeexecutable)
            attribute = two_value_inline_dict(m.attribute)
            dependency = two_value_inline_dict(m.dependency)
            flags = two_value_inline_dict(m.flags)
            files = two_value_inline_dict(m.files)
            parameter = two_value_inline_dict(m.parameter)
            fileparameter = two_value_inline_dict(m.fileparameter)

            tags = sorted([tag.name for tag in m.tags.all()])

            docurl = m.probekey.docurl if m.probekey else ""

        else:
            try:
                if m.probeversion:
                    probeversion = m.probeversion.split("(")
                    probe_name = probeversion[0].strip()
                    probe_version = probeversion[1][:-1].strip()
                    probe = admin_models.ProbeHistory.objects.get(
                        name=probe_name, package__version=probe_version
                    )
                    mt = admin_models.MetricTemplateHistory.objects.get(
                        name=m.name, probekey=probe
                    )

                else:
                    mt = admin_models.MetricTemplate.objects.get(name=m.name)

                parent = one_value_inline(mt.parent)
                probeexecutable = one_value_inline(mt.probeexecutable)
                attribute = two_value_inline_dict(mt.attribute)
                dependency = two_value_inline_dict(mt.dependency)
                flags = two_value_inline_dict(mt.flags)
                files = two_value_inline_dict(mt.files)
                parameter = two_value_inline_dict(mt.parameter)
                fileparameter = two_value_inline_dict(mt.fileparameter)

                tags = sorted([tag.name for tag in mt.tags.all()])

                docurl = mt.probekey.docurl if mt.probekey else ""

            except admin_models.MetricTemplateHistory.DoesNotExist:
                continue

        mdict[m.name].update({"tags": tags})

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

        if dependency:
            mdict[m.name].update({'dependency': dependency})
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

        if docurl:
            mdict[m.name].update({'docurl': docurl})
        else:
            mdict[m.name].update({'docurl': ''})

        ret.append(mdict)

    return ret


def get_metrics_from_profile(profile):
    token = MyAPIKey.objects.get(name='WEB-API-RO')

    headers = {'Accept': 'application/json', 'x-api-key': token.token}
    response = requests.get(
        settings.WEBAPI_METRIC, headers=headers, timeout=180
    )
    response.raise_for_status()
    data = response.json()['data']

    metrics = set()
    if data:
        if profile not in [p['name'] for p in data]:
            raise NotFound(
                status=404,
                detail='Metric profile {} not found.'.format(profile))

        else:
            for p in data:
                if p['name'] == profile:
                    for s in p['services']:
                        for m in s['metrics']:
                            metrics.add(m)

    return metrics


class ListMetrics(APIView):
    permission_classes = (MyHasAPIKey,)

    def get(self, request, tag=None):
        if tag:
            try:
                admin_models.MetricTags.objects.get(name=tag)
                mts = [
                    mt.name for mt in
                    admin_models.MetricTemplate.objects.filter(tags__name=tag)
                ]

                metrics = [
                    metric for metric in models.Metric.objects.all() if
                    metric.name in mts
                ]

                return Response(sorted([metric.name for metric in metrics]))

            except admin_models.MetricTags.DoesNotExist:
                return Response(
                    {'detail': 'Requested tag not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

        else:
            return Response(build_metricconfigs())


class ListRepos(APIView):
    permission_classes = (MyHasAPIKey,)

    def get(self, request, tag=None):
        if not tag:
            return Response(
                {'detail': 'You must define OS!'},
                status=status.HTTP_400_BAD_REQUEST
            )

        elif 'HTTP_PROFILES' not in request.META:
            return Response(
                {'detail': 'You must define profile!'},
                status=status.HTTP_400_BAD_REQUEST
            )

        else:
            profiles = dict(request.META)['HTTP_PROFILES'][1:-1].split(', ')
            metrics = set()
            for profile in profiles:
                metrics = metrics.union(get_metrics_from_profile(profile))

            internal_mt = [
                mt.name for mt in
                admin_models.MetricTemplate.objects.filter(
                    tags__name="internal"
                )
            ]
            internal_metrics = set([
                metric.name for metric in models.Metric.objects.all() if
                metric.name in internal_mt
            ])
            metrics = metrics.union(internal_metrics)

            if tag == 'centos7':
                ostag = admin_models.OSTag.objects.get(name='CentOS 7')
            elif tag == 'centos6':
                ostag = admin_models.OSTag.objects.get(name='CentOS 6')
            else:
                raise NotFound(status=404, detail='YUM repo tag not found.')

            packages = set()
            for metric in metrics:
                try:
                    m = models.Metric.objects.get(name=metric)
                    if m.probeversion:
                        probeversion = m.probeversion.split("(")
                        probe_name = probeversion[0].strip()
                        probe_version = probeversion[1][:-1].strip()
                        probe = admin_models.ProbeHistory.objects.get(
                            name=probe_name, package__version=probe_version
                        )
                        packages.add(probe.package)

                except models.Metric.DoesNotExist:
                    pass

            data = dict()
            packagedict = dict()
            missing_packages = []
            for package in packages:
                try:
                    repo = package.repos.get(tag=ostag)

                except admin_models.YumRepo.DoesNotExist:
                    missing_packages.append(package.__str__())
                    continue

                else:
                    packagedict.update({package: repo})

            for key, value in packagedict.items():
                if value.name not in data:
                    if key.use_present_version:
                        version = 'present'
                    else:
                        version = key.version
                    data.update(
                        {
                            value.name: {
                                'content': value.content,
                                'packages': [
                                    {
                                        'name': key.name,
                                        'version': version
                                    }
                                ]
                            }
                        }
                    )

                else:
                    data[value.name]['packages'].append(
                        {
                            'name': key.name,
                            'version': key.version
                        }
                    )

                data[value.name]['packages'] = sorted(
                    data[value.name]['packages'], key=lambda i: i['name']
                )

        return Response({
            'data': data,
            'missing_packages': sorted(missing_packages)
        })


class ListMetricTemplates(APIView):
    permission_classes = (MyHasAPIKey,)

    def get(self, request, tag=None):
        if tag:
            try:
                admin_models.MetricTags.objects.get(name=tag)
                mts = admin_models.MetricTemplate.objects.filter(tags__name=tag)

                return Response(sorted([mt.name for mt in mts]))

            except admin_models.MetricTags.DoesNotExist:
                return Response(
                    {"detail": "Requested tag not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

        else:
            return Response(build_metricconfigs(templates=True))


class ListMetricOverrides(APIView):
    permission_classes = (MyHasAPIKey,)

    @staticmethod
    def _get_global_attributes(db_entry):
        results = []
        if db_entry:
            data = json.loads(db_entry)

            for item in data:
                split = item.split(" ")
                results.append({
                    "attribute": split[0],
                    "value": split[1]
                })

        return results

    @staticmethod
    def _get_host_attributes(db_entry):
        results = []

        if db_entry:
            data = json.loads(db_entry)

            for item in data:
                split = item.split(" ")

                if len(split) == 2:
                    value = ""

                else:
                    value = split[2]

                results.append({
                    "hostname": split[0],
                    "attribute": split[1],
                    "value": value
                })

        return results

    @staticmethod
    def _get_metric_parameters(db_entry):
        results = []

        if db_entry:
            data = json.loads(db_entry)

            for item in data:
                split = item.split(" ")

                if len(split) == 3:
                    value = ""

                else:
                    value = " ".join(split[3:])

                results.append({
                    "hostname": split[0],
                    "metric": split[1],
                    "parameter": split[2],
                    "value": value
                })

        return results

    def get(self, request):
        data = models.MetricConfiguration.objects.all()

        overrides = dict()
        for item in data:
            overrides.update({
                item.name: {
                    "global_attributes": self._get_global_attributes(
                        item.globalattribute
                    ),
                    "host_attributes": self._get_host_attributes(
                        item.hostattribute
                    ),
                    "metric_parameters": self._get_metric_parameters(
                        item.metricparameter
                    )
                }
            })

        return Response(overrides)


class ListDefaultPorts(APIView):
    permission_classes = (MyHasAPIKey,)

    def get(self, request):
        data = admin_models.DefaultPort.objects.all()

        results = dict()

        for item in data:
            results.update({item.name: item.value})

        return Response(results)
