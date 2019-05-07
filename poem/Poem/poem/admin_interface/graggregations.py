from django.contrib import admin
from django.forms import ModelForm, ModelMultipleChoiceField, MultipleChoiceField
from django.contrib.auth.models import Permission
from django.contrib.auth.admin import GroupAdmin
from Poem.poem.models import GroupOfAggregations, Aggregation
from Poem.poem.admin_interface.formmodel import MyModelMultipleChoiceField, MyFilteredSelectMultiple
from django.contrib.admin.widgets import FilteredSelectMultiple


class GroupOfAggregationsAdminForm(ModelForm):
    qs = Aggregation.objects.filter(groupofaggregations__id__isnull=True).order_by('name')
    aggregations = MyModelMultipleChoiceField(queryset=qs, required=False,
                                              widget=MyFilteredSelectMultiple('aggregations',
                                                                              False),
                                              ftype='aggregations')


class GroupOfAggregationsAdmin(GroupAdmin):
    class Media:
        css = { "all" : ("/poem_media/css/graggregations.css",) }

    form = GroupOfAggregationsAdminForm
    search_field = ()
    filter_horizontal=('aggregations',)
    fieldsets = [(None, {'fields': ['name']}),
                 ('Settings', {'fields': ['aggregations']})]

    def save_model(self, request, obj, form, change):
        obj.save()
        perm = Permission.objects.get(codename__startswith='aggregation')
        obj.permissions.add(perm)
        form.cleaned_data['aggregations'].update(groupname=obj.name)
