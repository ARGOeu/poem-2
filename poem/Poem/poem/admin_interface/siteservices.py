from django.contrib import admin

from Poem.poem.models import Service, MetricInstance, Metric, Probe


class ServiceAdmin(admin.ModelAdmin):
    class Media:
        css = {'all': ('/poem_media/css/siteservices.css',)}

    def has_change_permission(self, request, obj=None):
        return True

    def has_add_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        qs = Service.objects.all()
        service_area = [p.service_area for p in qs]
        service_name = [p.service_name for p in qs]
        service_type = [p.service_type for p in qs]
        data = list()
        for i in range(len(service_type)):
            mi = MetricInstance.objects.filter(service_flavour=service_type[i])
            metric = sorted(list(set([m.metric for m in mi])))
            for j in range(len(metric)):
                try:
                    met = Metric.objects.get(name=metric[j])
                    probe = met.probeversion
                except Metric.DoesNotExist:
                    pass
                else:
                    if probe == '':
                        pass
                    else:
                        metric_id = met.id
                        probe_id = Probe.objects.get(nameversion=probe).id
                        data.append({'service_area': service_area[i],
                                     'service_name': service_name[i],
                                     'service_type': service_type[i],
                                     'metric': metric[j],
                                     'metric_id': metric_id,
                                     'probe': probe,
                                     'probe_id': probe_id})

        extra_context = extra_context or {}
        extra_context['servicedata'] = data
        return super(ServiceAdmin, self).changelist_view(request, extra_context=extra_context)
