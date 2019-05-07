from django.forms import ModelForm, CharField, Textarea, ValidationError, ModelMultipleChoiceField, ModelChoiceField
from django.forms.widgets import TextInput, Select
from django.contrib import admin
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import PermissionDenied

from Poem.poem import widgets
from Poem.poem.lookups import check_cache
from Poem.poem.models import MetricInstance, Profile, VO, ServiceFlavour, GroupOfProfiles

from ajax_select import make_ajax_field

import modelclone


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


class MetricInstanceFormRW(ModelForm):
    """
    Connects metric instance attributes to autocomplete widget (:py:mod:`poem.widgets`).
    """
    class Meta:
        model = MetricInstance
        exclude = ('vo',)

    metric = make_ajax_field(MetricInstance, 'metric', 'hintsmetricsall', \
                             plugin_options = {'minLength' : 2})
    service_flavour = make_ajax_field(ServiceFlavour, 'name', 'hintsserviceflavours', \
                                      plugin_options = {'minLength' : 2})

    def clean_service_flavour(self):
        clean_values = []
        clean_values = check_cache('/poem/admin/lookups/ajax_lookup/hintsserviceflavours', \
                                   ServiceFlavour, 'name')
        form_flavour = self.cleaned_data['service_flavour']
        if form_flavour not in clean_values:
            try:
                ServiceFlavour.objects.get(name=form_flavour)
            except ServiceFlavour.DoesNotExist:
                ServiceFlavour.objects.create(name=form_flavour, description='Manually added service type not defined in GOCDB')
        return form_flavour


class MetricInstanceFormRO(MetricInstanceFormRW):
    metric = CharField(label='Metric', \
                             widget=TextInput(attrs={'readonly' : 'readonly'}))
    service_flavour = CharField(label='Service Flavour', \
                                   widget=TextInput(attrs={'readonly' : 'readonly'}))


class MetricInstanceInline(admin.TabularInline):
    model = MetricInstance
    form = MetricInstanceFormRW

    def has_add_permission(self, request):
        if request.user.has_perm('poem.groupown_profile') \
                or request.user.is_superuser:
            return True
        else:
            self.form = MetricInstanceFormRO
            return False

    def has_delete_permission(self, request, obj=None):
        if request.user.has_perm('poem.groupown_profile')\
                or request.user.is_superuser:
            return True
        else:
            self.form = MetricInstanceFormRO
            return False

    def has_change_permission(self, request, obj=None):
        return True


class GroupOfProfilesInlineForms(ModelForm):
    def __init__(self, *args, **kwargs):
        sh = SharedInfo()
        self.user = sh.getuser()
        if self.user.is_authenticated:
            self.usergroups = self.user.groupsofprofiles.all()
        super(GroupOfProfilesInlineForms, self).__init__(*args, **kwargs)
        self.fields['groupofprofiles'].widget.can_add_related = False
        self.fields['groupofprofiles'].widget.can_change_related = False

    def clean_groupofprofiles(self):
        groupsel = self.cleaned_data['groupofprofiles']
        gr = SharedInfo(grname=groupsel)
        ugid = [f.id for f in self.usergroups]
        if groupsel.id not in ugid and not self.user.is_superuser:
            raise ValidationError("You are not member of group %s." % (str(groupsel)))
        return groupsel


class GroupOfProfilesInlineChangeForm(GroupOfProfilesInlineForms):
    qs = GroupOfProfiles.objects.all()
    groupofprofiles = ModelChoiceField(queryset=qs, widget=Select(),
                                       help_text='Profile is a member of given group')
    groupofprofiles.empty_label = '----------------'
    groupofprofiles.label = 'Group'


class GroupOfProfilesInlineAddForm(GroupOfProfilesInlineForms):
    def __init__(self, *args, **kwargs):
        super(GroupOfProfilesInlineAddForm, self).__init__(*args, **kwargs)
        self.fields['groupofprofiles'].help_text = 'Select one of the groups you are member of'
        self.fields['groupofprofiles'].empty_label = '----------------'
        self.fields['groupofprofiles'].label = 'Group'


class GroupOfProfilesInline(admin.TabularInline):
    model = GroupOfProfiles.profiles.through
    form = GroupOfProfilesInlineChangeForm
    verbose_name_plural = 'Group of profiles'
    verbose_name = 'Group of profile'
    max_num = 1
    extra = 1
    template = 'admin/edit_inline/stacked-group.html'


    def has_add_permission(self, request):
        return True

    def has_delete_permission(self, request, obj=None):
        if not obj:
            self.form = GroupOfProfilesInlineAddForm
        return True

    def has_change_permission(self, request, obj=None):
        if not obj:
            self.form = GroupOfProfilesInlineAddForm
        return True

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if request.user.is_authenticated and not request.user.is_superuser:
            lgi = request.user.groupsofprofiles.all().values_list('id', flat=True)
            kwargs["queryset"] = GroupOfProfiles.objects.filter(pk__in=lgi)
        return super(GroupOfProfilesInline, self).formfield_for_foreignkey(db_field, request, **kwargs)


class ProfileForm(ModelForm):
    """
    Connects profile attributes to autocomplete widget (:py:mod:`poem.widgets`). Also
    adds media and does basic sanity checking for input.
    """

    name = CharField(help_text='Namespace and name of this profile.',
                           max_length=128,
                           widget=widgets.NamespaceTextInput(
                                           attrs={'maxlength': 128, 'size': 45}),
                           label='Profile name'
                           )
    vo = make_ajax_field(Profile, 'name', 'hintsvo', \
                         help_text='Virtual organization that owns this profile.', \
                         plugin_options = {'minLength' : 2}, label='Virtual organization')
    description = CharField(help_text='Free text description outlining the purpose of this profile.',
                                  widget=Textarea(attrs={'style':'width:480px;height:100px'}))

    def clean_vo(self):
        clean_values = []
        clean_values = check_cache('/poem/admin/lookups/ajax_lookup/hintsvo', VO, 'name')
        form_vo = self.cleaned_data['vo']
        if form_vo not in clean_values:
            raise ValidationError("Unable to find virtual organization %s." % (str(form_vo)))
        return form_vo


class ProfileCloneForm(ProfileForm):
    def clean_name(self):
        name = self.cleaned_data['name']

        try:
            profile = Profile.objects.get(name=name)
            if profile:
                raise ValidationError("Profile name already exists and name should be changed")
        except Profile.DoesNotExist:
            pass

        return name


class ProfileAdmin(modelclone.ClonableModelAdmin):
    """
    POEM admin core class that customizes its look and feel.
    """
    class Media:
        css = { "all" : ("/poem_media/css/siteprofiles.css",) }

    def groupname(obj):
        return obj.groupname
    groupname.short_description = 'group'

    class GroupProfileListFilter(admin.SimpleListFilter):
        title = 'profile group'
        parameter_name = 'group'

        def lookups(self, request, model_admin):
            qs = model_admin.get_queryset(request)
            groups = set(qs.values_list('groupname', flat=True))
            return tuple((x,x) for x in filter(lambda x: x != '', groups))

        def queryset(self, request, queryset):
            if self.value():
                return queryset.filter(groupname=self.value())
            else:
                return queryset


    list_display = ('name', 'vo', 'description', groupname, )
    list_filter = ('vo', GroupProfileListFilter, )
    search_fields = ('name', 'vo',)
    fields = ('name', 'vo', 'description')
    inlines = (GroupOfProfilesInline, MetricInstanceInline, )
    exclude = ('version',)
    form = ProfileForm
    actions = None
    list_per_page = 30

    change_form_template = None

    def _groupown_turn(self, user, flag):
        perm_prdel = Permission.objects.get(codename='delete_profile')
        try:
            perm_grpown = Permission.objects.get(codename='groupown_profile')
        except Permission.DoesNotExist:
            ct = ContentType.objects.get(app_label='poem', model='profile')
            perm_grpown = Permission.objects.create(codename='groupown_profile',
                                                   content_type=ct,
                                                   name="Group of profile owners")
        if flag == 'add':
            user.user_permissions.add(perm_grpown)
            user.user_permissions.add(perm_prdel)
        elif flag == 'del':
            user.user_permissions.remove(perm_grpown)
            user.user_permissions.remove(perm_prdel)

    def get_form(self, request, obj=None, **kwargs):
        rquser = SharedInfo(requser=request.user)
        if request.path.endswith('/clone/'):
            self.form = ProfileCloneForm
        if obj:
            if request.user.is_authenticated:
                ug = request.user.groupsofprofiles.all().values_list('name', flat=True)
                if obj.groupname in ug:
                    self._groupown_turn(request.user, 'add')
                else:
                    self._groupown_turn(request.user, 'del')
        elif not request.user.is_superuser:
            self._groupown_turn(request.user, 'add')
        return super(ProfileAdmin, self).get_form(request, obj=None, **kwargs)

    def _profile_stats(self, object_id, context):
        mi = MetricInstance.objects.filter(profile__pk=object_id)
        num_tuples = len(mi)

        services, metrics = set(), set()
        for t in mi:
            services.add(t.service_flavour)
            metrics.add(t.metric)
        num_services = len(services)
        num_metrics = len(metrics)

        context = context or dict()
        context.update({'num_metrics': num_metrics,
                        'num_services': num_services,
                        'num_tuples': num_tuples})

        return context

    def history_view(self, request, object_id, extra_context=None):
        extra_context = extra_context or dict()
        if request.user.is_authenticated:
            extra_context.update(dict(include_history_link=True))
        return super().history_view(request, object_id, extra_context=extra_context)

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or dict()
        extra_context.update({'clone_verbose_name': 'Clone',
                              'include_clone_link': True})

        return super(modelclone.ClonableModelAdmin, self).change_view(request,
                                                                      object_id,
                                                                      form_url,
                                                                      self._profile_stats(object_id, extra_context))

    def clone_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context.update({'clone_view': True,
                              'profile_id': object_id,
                              'profile_name': str(Profile.objects.get(pk=object_id)),
                              'original': 'Clone',
                              'title': 'Clone'})
        return super(ProfileAdmin, self).clone_view(request, object_id, form_url, self._profile_stats(object_id, extra_context))

    def save_model(self, request, obj, form, change):
        sh = SharedInfo()
        if obj and sh.getgroup():
            obj.groupname = sh.getgroup().name
            sh.delgroup()
        elif not obj and sh.getgroup():
            obj.groupname = sh.getgroup()
            sh.delgroup()
        if change and obj.vo:
            obj.metric_instances.update(vo=obj.vo)
        if request.user.has_perm('poem.groupown_profile') \
                or request.user.is_superuser:
            obj.save()
        else:
            raise PermissionDenied()

    def get_row_css(self, obj, index):
        if not obj.valid:
            return 'row_red red%d' % index
        return ''

    def has_add_permission(self, request):
        if request.user.is_superuser:
            return True
        if request.user.is_authenticated and request.user.groupsofprofiles.count():
            return True
        else:
            return False

    def has_delete_permission(self, request, obj=None):
        if request.user.has_perm('poem.groupown_profile') \
                or request.user.is_superuser:
            return True
        else:
            return False

    def has_change_permission(self, request, obj=None):
        return True
