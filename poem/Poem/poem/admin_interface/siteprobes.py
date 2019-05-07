from django.db import transaction
from django.forms import ModelForm, CharField, Textarea, ValidationError, ModelChoiceField, BooleanField
from django.forms.widgets import TextInput
from django.contrib import admin
from django.contrib.admin.models import LogEntry, CHANGE
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import PermissionDenied
from django.urls import reverse
from django.utils.html import format_html, format_html_join

from Poem.poem.models import Probe, GroupOfProbes, ExtRevision, Metric

from reversion_compare.admin import CompareVersionAdmin
import reversion
from reversion.models import Version, Revision
from reversion.signals import post_revision_commit

import json
import datetime


class SharedInfo:
    def __init__(self, requser=None, grname=None):
        if requser:
            self.__class__.user = requser
        if grname:
            self.__class__.group = grname

    def getgroup(self):
        if getattr(self.__class__, 'group', None):
            return self.__class__.group
        else:
            return None

    def delgroup(self):
        self.__class__.group = None


    def getuser(self):
        if getattr(self.__class__, 'user', None):
            return self.__class__.user
        else:
            return None


class GroupOfProbesInlineChangeForm(ModelForm):
    def __init__(self, *args, **kwargs):
        rquser = SharedInfo()
        self.user = rquser.getuser()
        if self.user.is_authenticated:
            self.usergroups = self.user.groupsofprobes.all()
        super(GroupOfProbesInlineChangeForm, self).__init__(*args, **kwargs)

    qs = GroupOfProbes.objects.all()
    groupofprobes = ModelChoiceField(queryset=qs, help_text='Probe is a member of given group')
    groupofprobes.empty_label = '----------------'
    groupofprobes.label = 'Group'

    def clean_groupofprobes(self):
        groupsel = self.cleaned_data['groupofprobes']
        gr = SharedInfo(grname=groupsel)
        ugid = [f.id for f in self.usergroups]
        if groupsel.id not in ugid and not self.user.is_superuser:
            raise ValidationError("You are not member of group %s." % (str(groupsel)))
        return groupsel


class GroupOfProbesInlineAddForm(ModelForm):
    def __init__(self, *args, **kwargs):
        super(GroupOfProbesInlineAddForm, self).__init__(*args, **kwargs)
        self.fields['groupofprobes'].help_text = 'Select one of the groups you are member of'
        self.fields['groupofprobes'].empty_label = None
        self.fields['groupofprobes'].label = 'Group'
        self.fields['groupofprobes'].widget.can_add_related = False
        self.fields['groupofprobes'].widget.can_change_related = False

    def clean_groupofprobes(self):
        groupsel = self.cleaned_data['groupofprobes']
        gr = SharedInfo(grname=groupsel)
        return groupsel


class GroupOfProbesInline(admin.TabularInline):
    model = GroupOfProbes.probes.through
    form = GroupOfProbesInlineChangeForm
    verbose_name_plural = 'Group of probes'
    verbose_name = 'Group of probes'
    max_num = 1
    extra = 1
    template = 'admin/edit_inline/stacked-group.html'

    def has_add_permission(self, request):
        return True

    def has_delete_permission(self, request, obj=None):
        if not obj:
            self.form = GroupOfProbesInlineAddForm
        return True

    def has_change_permission(self, request, obj=None):
        if not obj:
            self.form = GroupOfProbesInlineAddForm
        return True

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if request.user.is_authenticated and not request.user.is_superuser:
            lgi = request.user.groupsofprobes.all().values_list('id', flat=True)
            kwargs["queryset"] = GroupOfProbes.objects.filter(pk__in=lgi)
        return super(GroupOfProbesInline, self).formfield_for_foreignkey(db_field, request, **kwargs)


class ProbeAddForm(ModelForm):
    """
    Connects profile attributes to autocomplete widget (:py:mod:`poem.widgets`). Also
    adds media and does basic sanity checking for input.
    """
    new_version = BooleanField(help_text='Create version for changes', required=False, initial=True)
    update_metric = BooleanField(
        help_text='Update associated metrics\' version',
        required=False,
        initial=False
    )

    name = CharField(help_text='Name of this probe.',
                     max_length=100,
                     widget=TextInput(attrs={'maxlength': 100, 'size': 45}),
                     label='Name')
    repository = CharField(help_text='Probe repository URL',
                           max_length=100,
                           widget=TextInput(attrs={'maxlength': 100,
                                                   'size': 61,
                                                   'type': 'url'}),
                           label='Repository')
    docurl = CharField(help_text='Documentation URL',
                       max_length=100,
                       widget=TextInput(attrs={'type': 'url', 'maxlength': 100,
                                               'size': 61}),
                       label='Documentation')
    comment = CharField(help_text='Short comment about this version.',
                     widget=Textarea(attrs={'style':'width:500px;height:100px'}),
                     label='Comment')
    version = CharField(help_text='Version of the probe.',
                        max_length=28,
                        widget=TextInput(attrs={'maxlength': 28, 'size': 45}),
                        label='Version')
    description = CharField(help_text='Free text description outlining the purpose of this probe.',
                            widget=Textarea(attrs={'style':'width:500px;height:100px'}))

    user = CharField(help_text='User that added the probe', max_length=64, required=False)
    datetime = CharField(help_text='Time when probe is added', max_length=64, required=False)

    def clean(self):
        cleaned_data = super().clean()
        new_ver = cleaned_data['new_version']
        ver = cleaned_data['version']
        name = cleaned_data['name']

        try:
            probe = Probe.objects.get(name=name)
            if probe.version == ver and new_ver:
                raise ValidationError("Version number should be raised")
        except Probe.DoesNotExist:
            pass

        return cleaned_data


class ProbeChangeForm(ProbeAddForm):
    """
    Form rendered on change_view and derived from ProbeAddForm with name field
    kept readonly. If user wants to change the name of probe, he must create
    new one.
    """
    name = CharField(help_text='Name of this probe.',
                     max_length=100,
                     widget=TextInput(attrs={'maxlength': 100, 'size': 45, 'readonly': 'readonly'}),
                     label='Name')
    update_metric = BooleanField(
        help_text='Update associated metrics\' version',
        required=False,
        initial=True
    )


class ProbeAdmin(CompareVersionAdmin, admin.ModelAdmin):
    """
    Probe admin core class that customizes its look and feel.
    """
    class Media:
        css = { "all" : ("/poem_media/css/siteprobes.css",) }

    def groupname(obj):
        return obj.group
    groupname.short_description = 'Group'

    class GroupProbesListFilter(admin.SimpleListFilter):
        title = 'probes group'
        parameter_name = 'group'

        def lookups(self, request, model_admin):
            qs = model_admin.get_queryset(request)
            groups = set(qs.values_list('group', flat=True))
            return tuple((x,x) for x in filter(lambda x: x != '', groups))

        def queryset(self, request, queryset):
            if self.value():
                return queryset.filter(group=self.value())
            else:
                return queryset

    def num_versions(self, obj):
        num = ExtRevision.objects.filter(probeid=obj.id).count()
        return format_html('<a href="{0}">{1}</a>', reverse('admin:poem_probe_history', args=(obj.id,)), num)
    num_versions.short_description = '# versions'

    def metrics_list(self, obj):
        metrics = Metric.objects.filter(
            probeversion=obj.nameversion).values('id', 'name')
        urllist = format_html_join(
            ', ',
            '<a href="{0}">{1}</a>',
            ((reverse('admin:poem_metric_change', args=(metric['id'],)), metric['name']) for metric in metrics)
        )
        return urllist
    metrics_list.short_description = 'assigned metrics'

    list_display = ('name', 'num_versions', 'description', groupname)
    list_filter= (GroupProbesListFilter, )
    search_fields = ('name',)
    inlines = (GroupOfProbesInline, )
    actions = None
    list_per_page = 20

    change_list_template = ''
    object_history_template = ''
    compare_template = ''

    def _groupown_turn(self, user, flag):
        perm_prdel = Permission.objects.get(codename='delete_probe')
        try:
            perm_grpown = Permission.objects.get(codename='groupown_probe')
        except Permission.DoesNotExist:
            ct = ContentType.objects.get(app_label='poem', model='probe')
            perm_grpown = Permission.objects.create(codename='groupown_probe',
                                                   content_type=ct,
                                                   name="Group of probe owners")
        if flag == 'add':
            user.user_permissions.add(perm_grpown)
            user.user_permissions.add(perm_prdel)
        elif flag == 'del':
            user.user_permissions.remove(perm_grpown)
            user.user_permissions.remove(perm_prdel)

    def get_form(self, request, obj=None, **kwargs):
        rquser = SharedInfo(requser=request.user)
        if request.user.is_authenticated and not request.user.is_superuser:
            ug = request.user.groupsofprobes.all().values_list('name', flat=True)
            if obj and obj.group in ug:
                self._groupown_turn(request.user, 'add')
            elif not obj and ug:
                self._groupown_turn(request.user, 'add')
            else:
                self._groupown_turn(request.user, 'del')
        if obj:
            self.form = ProbeChangeForm
            self.fieldsets = ((None, {'classes': ['infoone'], 'fields': (('name', 'version', 'new_version', 'update_metric',), 'datetime', 'user', )}),
                              (None, {'classes': ['infotwo'], 'fields': ('repository', 'docurl', 'description', 'comment', 'metrics_list',)}),)
            self.readonly_fields = ('user', 'datetime', 'metrics_list')
        else:
            self.form = ProbeAddForm
            self.fieldsets = ((None, {'classes': ['infoone'], 'fields': (('name', 'version',),)}),
                              (None, {'classes': ['infotwo'], 'fields': ('repository', 'docurl', 'description','comment', )}),)
            self.readonly_fields = ()
        return super(ProbeAdmin, self).get_form(request, obj=None, **kwargs)

    @reversion.create_revision()
    def save_model(self, request, obj, form, change):
        """
        In case new_version button is ticked, the new revision is created;
        in case that new_version button IS NOT ticked, there is no new
        revision created, only the data in Probe table in db is updated.
        """
        sh = SharedInfo()

        if obj and sh.getgroup():
            obj.group = sh.getgroup().name
            sh.delgroup()
        elif not obj and sh.getgroup():
            obj.group = sh.getgroup()
            sh.delgroup()
        if request.user.has_perm('poem.groupown_probe') \
                or request.user.is_superuser:
            obj.user = request.user.username
            if form.cleaned_data['new_version'] and change or not change:
                obj.save()
                if form.cleaned_data['update_metric']:
                    post_revision_commit.connect(update_metric)
                return
            elif not form.cleaned_data['new_version'] and change:
                version = Version.objects.get_for_object(obj)
                pk = version[0].object_id
                pk0 = version[0].id
                data = json.loads(Version.objects.get(pk=pk0).serialized_data)
                new_serialized_field = {
                    'name': form.cleaned_data['name'],
                    'version': form.cleaned_data['version'],
                    'description': form.cleaned_data['description'],
                    'comment': form.cleaned_data['comment'],
                    'repository': form.cleaned_data['repository'],
                    'docurl': form.cleaned_data['docurl'],
                    'group': obj.group,
                    'user': obj.user
                }
                data[0]['fields'] = new_serialized_field
                Version.objects.filter(pk=pk0).update(serialized_data=json.dumps(data))
                Probe.objects.filter(pk=pk).update(**new_serialized_field)
        else:
            raise PermissionDenied()

    def get_row_css(self, obj, index):
        if not obj.valid:
            return 'row_red red%d' % index
        return ''

    def has_add_permission(self, request):
        if request.user.is_superuser and GroupOfProbes.objects.count():
            return True
        if request.user.is_authenticated and request.user.groupsofprobes.count():
            return True
        else:
            return False

    def has_delete_permission(self, request, obj=None):
        if request.user.has_perm('poem.groupown_probe') \
                or request.user.is_superuser:
            return True
        else:
            return False

    def has_change_permission(self, request, obj=None):
        return True

    @transaction.atomic()
    def delete_model(self, request, obj):
        ct = ContentType.objects.get_for_model(obj)
        lver = reversion.models.Version.objects.filter(object_id=obj.id,
                                                       content_type_id=ct.id)
        for v in lver:
            reversion.models.Revision.objects.get(pk=v.revision_id).delete()

        Metric.objects.filter(probeversion=obj.nameversion).update(probeversion='')

        return super(ProbeAdmin, self).delete_model(request, obj)

    def revision_view(self, request, object_id, version_id, extra_context=None):
        """
        Override original view to remove original title
        """
        currev = reversion.models.Version.objects.get(pk=version_id)
        datecreated = reversion.models.Revision.objects.get(pk=version_id).date_created

        new_context = {'title': currev.object_repr}
        if extra_context:
            extra_context.update({'cursel': currev.object_repr, 'datecreated': datecreated})
            extra_context.update(new_context)
        else:
            extra_context = {'cursel': currev.object_repr, 'datecreated': datecreated}
            extra_context.update(new_context)

        return self._reversion_revisionform_view(
            request,
            currev,
            self._reversion_get_template_list("revision_form.html"),
            extra_context,
        )

    def history_view(self, request, object_id, extra_context=None):
        extra_context = extra_context or dict()
        if request.user.is_authenticated:
            extra_context.update(dict(include_history_link=True))
        return super().history_view(request, object_id, extra_context=extra_context)


reversion.register(Probe, exclude=["nameversion", "datetime"])

def update_metric(revision, sender, signal, versions, **kwargs):
    version2 = versions[0]
    fields2 = json.loads(version2.serialized_data)[0]['fields']
    if version2.content_type_id == ContentType.objects.get_for_model(Probe).id:
        version1 = Version.objects.get_for_object(
            Probe.objects.get(id=version2.object_id)
        )[1]

        # getting old probeversion from the second entry in VersionQuerySet
        fields1 = json.loads(version1.serialized_data)[0]['fields']
        old_probeversion = u'%s (%s)' % (fields1['name'], fields1['version'])

        # getting new probeversion from the first entry in VersionQuerySet
        new_probeversion = u'%s (%s)' % (fields2['name'], fields2['version'])

        metric_pk = Metric.objects.filter(
            probeversion=old_probeversion
        ).values_list('id', flat=True)
        ct = ContentType.objects.get_for_model(Metric)

        vers = list()
        for pk in metric_pk:
            instance = Metric.objects.get(id=pk)
            instance.probeversion = new_probeversion
            instance.probekey = version2
            instance.save()
            LogEntry.objects.log_action(
                user_id=revision.user_id,
                content_type_id=ct.id,
                object_id=pk,
                object_repr=instance.__str__(),
                action_flag=CHANGE,
                change_message='Changed probeversion.'
            )
            metric_ver = Version.objects.filter(object_id=pk,
                                                content_type_id=ct.id)

            rev = Revision(date_created=revision.date_created,
                           user_id=revision.user_id,
                           comment='[{"changed": {"fields": ['
                                   '"probeversion"]}}]')

            ver = Version(object_id=str(instance.id),
                          content_type_id=ct.id,
                          format=metric_ver[0].format,
                          serialized_data=metric_ver[0].serialized_data,
                          object_repr=metric_ver[0].object_repr,
                          db='default')
            rev.save()

            Revision.objects.filter(pk=rev.id).update(
                date_created=revision.date_created
            )
            ver.revision = rev
            data = json.loads(metric_ver[0].serialized_data)[0]
            data['fields']['probeversion'] = new_probeversion
            data['fields']['probekey'] = version2.id
            ver.serialized_data = json.dumps([data])
            vers.append(ver)

        Version.objects.bulk_create(vers)
