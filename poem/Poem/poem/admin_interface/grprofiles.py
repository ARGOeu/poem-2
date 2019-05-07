from django.contrib import admin
from django.forms import ModelForm, ModelMultipleChoiceField, MultipleChoiceField
from django.contrib.auth.models import Permission
from django.contrib.auth.admin import GroupAdmin
from Poem.poem.models import GroupOfProfiles, Profile
from Poem.poem.admin_interface.formmodel import MyModelMultipleChoiceField, MyFilteredSelectMultiple
from django.contrib.admin.widgets import FilteredSelectMultiple


class GroupOfProfilesAdminForm(ModelForm):
    qs = Profile.objects.filter(groupofprofiles__id__isnull=True).order_by('name')
    profiles = MyModelMultipleChoiceField(queryset=qs,
                                          required=False,
                                          widget=MyFilteredSelectMultiple('profiles', False), ftype='profiles')


class GroupOfProfilesAdmin(GroupAdmin):
    class Media:
        css = { "all" : ("/poem_media/css/grprofiles.css",) }

    form = GroupOfProfilesAdminForm
    search_field = ()
    filter_horizontal=('profiles',)
    fieldsets = [(None, {'fields': ['name']}),
                 ('Settings', {'fields': ['profiles']})]

    def save_model(self, request, obj, form, change):
        obj.save()
        perm = Permission.objects.get(codename__startswith='profile')
        obj.permissions.add(perm)
        form.cleaned_data['profiles'].update(groupname=obj.name)
