from Poem.poem.models import VO, ServiceFlavour, Metrics, MetricInstance, Tags, Probe
from ajax_select import LookupChannel
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from reversion.models import Version

def check_cache(request, model, attr):
    if not cache.get(request):
        values = set([eval('obj.' + attr) for obj in model.objects.all()])
        cache.set(request, values)
    else:
        values = cache.get(request)
    return values


class VOLookup(LookupChannel):
    model = VO

    def get_query(self, q, request):
        values = check_cache(request, self.model, 'name')
        return sorted(filter(lambda x: q.lower() in x.lower(), values))


class ServiceFlavoursLookup(LookupChannel):
    model = ServiceFlavour

    def get_query(self, q, request):
        values = check_cache(request, self.model, 'name')
        return sorted(filter(lambda x: q.lower() in x.lower(), values))


class MetricInstancesLookup(LookupChannel):
    model = MetricInstance

    def get_query(self, q, request):
        values = check_cache(request, self.model, 'name')
        return sorted(filter(lambda x: q.lower() in x.lower(), values))


class MetricsFilteredLookup(LookupChannel):
    model = Metrics
    relmodel = model.groupofmetrics_set.through

    def get_query(self, q, request):
        meting = []
        if request.user.is_superuser:
            meting = self.model.objects.all().values_list('name', flat=True)
        else:
            ugs = request.user.groupsofmetrics.values_list('name', flat=True)
            for u in ugs:
                meting += self.relmodel.objects.get(name=u).metrics.all().values_list('name', flat=True)
        return sorted(filter(lambda x: q.lower() in x.lower(), meting))


class MetricsAllLookup(LookupChannel):
    model = Metrics
    relmodel = model.groupofmetrics_set.through

    def get_query(self, q, request):
        mets = self.model.objects.all().values_list('name', flat=True)
        return sorted(filter(lambda x: q.lower() in x.lower(), mets))


class ProbeLookup(LookupChannel):
    model = Version

    def get_query(self, q, request):
        ct = ContentType.objects.get_for_model(Probe)
        proberevs = self.model.objects.filter(content_type_id=ct.id)
        match = [proberev for proberev in proberevs if q.lower() in proberev.object_repr.lower()]
        return sorted(match, key=lambda m: m.object_repr.lower())


class TagsLookup(LookupChannel):
    model = Tags

    def get_query(self, q, request):
        values = check_cache(request, self.model, 'name')
        return sorted(filter(lambda x: q.lower() in x.lower(), values))
