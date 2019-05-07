from django.contrib import admin
from django.forms import ModelForm
from django.contrib.auth.models import Permission
from django.contrib.auth.admin import GroupAdmin
from Poem.poem.admin_interface.formmodel import MyModelMultipleChoiceField, MyFilteredSelectMultiple
from Poem.poem.models import GroupOfMetrics, Metrics, Metric


class GroupOfMetricsForm(ModelForm):
    qs = Metrics.objects.filter(groupofmetrics__id__isnull=True).order_by('name')
    metrics = MyModelMultipleChoiceField(queryset=qs,
                                         required=False,
                                         widget=MyFilteredSelectMultiple('metrics', False), ftype='metrics')


class GroupOfMetricsAdmin(GroupAdmin):
    class Media:
        css = { "all" : ("/poem_media/css/grmetrics.css",) }

    form = GroupOfMetricsForm
    search_field = ()
    filter_horizontal=('metrics',)
    fieldsets = [(None, {'fields': ['name']}),
                 ('Settings', {'fields': ['metrics']})]

    def save_model(self, request, obj, form, change):
        """
           MetricAdmin deals with Metric model, while GroupOfMetricsAdmin deals
           with Metrics model. Update associations of metrics in Metric model that
           are done from here (GroupOfMetricsAdmin) to have the consistent mapping
           in MetricAdmin page.
        """
        obj.save()
        perm = Permission.objects.get(codename__startswith='metrics')
        obj.permissions.add(perm)

        group_name = request.POST['name']
        g = GroupOfMetrics.objects.get(name=group_name)
        metrics_selected = form.cleaned_data['metrics']
        name_selected = set([m.name for m in metrics_selected])
        metrics_admin = set([m.name for m in g.metric_set.all()])
        metrics_groupadmin = set([m.name for m in g.metrics.all()])

        reassigned = metrics_groupadmin.difference(name_selected)
        if reassigned:
            for m in reassigned:
                try:
                    metric = Metric.objects.get(name=m)
                    g.metric_set.remove(metric)
                except (Metric.DoesNotExist, GroupOfMetrics.DoesNotExist) as e:
                    pass
        else:
            reassigned = name_selected.difference(metrics_groupadmin)
            for m in reassigned:
                try:
                    metric = Metric.objects.get(name=m)
                    g.metric_set.add(metric)
                except Metric.DoesNotExist as e:
                    pass




