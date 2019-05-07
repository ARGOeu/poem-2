from django.contrib import admin
from django.forms import ModelForm
from django.contrib.auth.models import Permission
from django.contrib.auth.admin import GroupAdmin
from Poem.poem.models import GroupOfProbes, Probe
from Poem.poem.admin_interface.formmodel import MyModelMultipleChoiceField, MyFilteredSelectMultiple


class GroupOfProbesAdminForm(ModelForm):
    qs = Probe.objects.filter(groupofprobes__id__isnull=True).order_by('nameversion')
    probes = MyModelMultipleChoiceField(queryset=qs,
                                        required=False,
                                        widget=MyFilteredSelectMultiple('probes', False), ftype='probes')


class GroupOfProbesAdmin(GroupAdmin):
    class Media:
        css = { "all" : ("/poem_media/css/grprobes.css",) }

    form = GroupOfProbesAdminForm
    search_field = ()
    filter_horizontal=('probes',)
    fieldsets = [(None, {'fields': ['name']}),
                 ('Settings', {'fields': ['probes']})]

    def delete_model(self, request, obj):
        Probe.objects.filter(groupofprobes__id=obj.id).update(group='')
        super().delete_model(request, obj)

    def save_model(self, request, obj, form, change):
        """
           Save group changes and also update Probe.group field name in case
           group is renamed.
        """
        obj.save()
        perm = Permission.objects.get(codename__startswith='probe')
        obj.permissions.add(perm)
        form.cleaned_data['probes'].update(group=obj.name)
