from django.shortcuts import render_to_response
from django.conf import settings
from django.db import connection
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpResponse
from django.views.generic import View
from Poem.poem import models
import json
from configparser import ConfigParser

def none_to_emptystr(val):
    if val is None:
        return ''
    else:
        return val

def poem_namespace():
    tenant = connection.tenant.name

    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    return config.get('GENERAL_' + tenant.upper(), 'namespace')


class Profiles(View):
    """
    Dumps the list of profiles available in this namespace. This API call is used by the
    poem-sync synchronizer to get list of profiles and their attributes. Sample output:
    ::
        [ {
        "name": "ALICE",
        "atp_vo": "alice",
        "metric_instances": [
            {
                "atp_service_type_flavour": "CE",
                "fqan": "",
                "metric": "org.sam.CE-JobSubmit",
                "vo": "alice"
            }, ....
        ] ]

    * *Supported formats*: json
    * *URL*: /api/0.2/json/profiles
    * *Supported methods*: GET
    """
    def get(self, request):
        lp = []
        for profile in models.Profile.objects.all():
            mi = list(profile.metric_instances.all().\
                 values('metric', 'fqan', 'vo', 'service_flavour'))
            mi = list(map(lambda e: {'metric': e['metric'],\
                                'fqan': none_to_emptystr(e['fqan']),\
                                'vo': none_to_emptystr(e['vo']),\
                                'atp_service_type_flavour': e['service_flavour']}, mi))
            lp.append({"name": profile.name, "atp_vo" : profile.vo,
                    "version": profile.version,
                    "description": none_to_emptystr(profile.description),
                    "metric_instances": mi})

        return HttpResponse(json.dumps(lp), content_type='application/json')

class MetricsInProfiles(View):
    """
    Dumps all metrics, service flavours and profile names
    for a given VO. Example:

    {
        "name": "ops",
        "profiles": [
            {
                "metrics": [
                    {
                        "service_flavour": "APEL",
                        "fqan": "",
                        "name": "org.apel.APEL-Pub",
                        "profile__name": "ROC_OPERATORS"
                    },
                    {
                        "service_flavour": "ARC-CE",
                        "fqan": "",
                        "name": "org.nordugrid.ARC-CE-ARIS",
                        "profile__name": "ROC_OPERATORS"
                    },
                ],
                "namespace": "CH.CERN.SAM",
                "name": "ROC_OPERATORS",
                "description": "The main profile that contains Operations tests."
            },
        ]
    }

    * *Supported formats*: json
    * *URL*: /api/0.2/json/metrics_in_profiles/?vo_name=ops&vo_name=biomed&profile=ARGO_MON&profile=ARGO_MON_BIOMED
    * *Supported methods*: GET
    """

    def get(self, request):
        vo_lookup = request.GET.getlist('vo_name')
        try:
            profile_lookup = request.GET.getlist('profile')
        except NameError:
            pass

        if vo_lookup and not models.Profile.objects.filter(vo__in=vo_lookup):
            return HttpResponse("Not valid VO")

        elif vo_lookup:
            metrics = {}
            if profile_lookup:
                metrics = models.MetricInstance.objects.filter(vo__in=vo_lookup).filter(profile__name__in=profile_lookup).values('metric', 'service_flavour', 'fqan', 'profile__name')
                profiles = set(models.Profile.objects.filter(vo__in=vo_lookup).filter(name__in=profile_lookup).values_list('name', 'description', 'vo'))
            else:
                metrics = models.MetricInstance.objects.filter(vo__in=vo_lookup).values('metric', 'service_flavour', 'fqan', 'profile__name')
                profiles = set(models.Profile.objects.filter(vo__in=vo_lookup).values_list('name', 'description', 'vo'))
            metrics_in_profiles = []
            for p in profiles:
                metrics_in_profiles.append({'name' : p[0], \
                                            'namespace' : none_to_emptystr(poem_namespace()), \
                                            'description' : none_to_emptystr(p[1]), \
                                            'vo' : p[2],\
                                            'metrics' : [{'service_flavour': m['service_flavour'], \
                                                          'name': none_to_emptystr(m['metric']), \
                                                          'fqan': none_to_emptystr(m['fqan'])} for m in metrics \
                                                        if m['profile__name'] == p[0]]})
            result = {"name" : vo_lookup, "profiles" : metrics_in_profiles}

            return HttpResponse(json.dumps([result]), content_type='application/json')

        else:
            return HttpResponse("Need the name of VO")

class MetricsInGroup(View):
    def get(self, request):
        gr = request.GET.get('group')
        if gr:
            if models.GroupOfMetrics.objects.filter(name__exact=gr):
                metrics = models.Metrics.objects.filter(groupofmetrics__name__exact=gr).values_list('name', flat=True)
                results = sorted(metrics, key=lambda m: m.lower())
                return HttpResponse(json.dumps({'result': results}), content_type='application/json')
            else:
                return HttpResponse("Not a valid group.")
        else:
            return HttpResponse("Need the name of group")

class Metrics(View):
    def get(self, request):
        api = list()
        tag = request.GET.get('tag')
        if tag:
            try:
                tagobj = models.Tags.objects.get(name__iexact=tag)
                metricsobjs = models.Metric.objects.filter(tag=tagobj)
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
                        if config.key is None or config.value is None:
                            pass
                        else:
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

                    api.append(mdict)
                return HttpResponse(json.dumps(api), content_type='application/json')

            except models.Tags.DoesNotExist:
                return HttpResponse('Not a valid tag.')

        else:
            return HttpResponse('Need the name of tag.')

