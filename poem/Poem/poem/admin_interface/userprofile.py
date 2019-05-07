from Poem.poem.models import UserProfile, CustUser
from django.contrib import admin
from django.contrib import auth
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.admin import UserAdmin
from Poem.poem.admin_interface.formmodel import MyUserChangeForm
from django.forms import ModelForm, CharField
from django.forms.widgets import TextInput

class UserProfileForm(ModelForm):
    subject = CharField(label='distinguishedName', required=False, widget=TextInput(attrs={'style':'width:500px'}))
    egiid = CharField(label='eduPersonUniqueId', required=False, widget=TextInput(attrs={'style':'width:500px'}))
    displayname = CharField(label='displayName', required=False, widget=TextInput(attrs={'style':'width:250px'}))

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    form = UserProfileForm
    can_delete = False
    verbose_name_plural = 'Additional info'
    template = 'admin/edit_inline/stacked-user.html'

class UserProfileAdmin(UserAdmin):
    view_on_site = False
    form = MyUserChangeForm

    class Media:
        css = { "all" : ("/poem_media/css/siteuser.css",) }

    fieldsets = [(None, {'fields': ['username', 'password']}),
                 ('Personal info', {'fields': ['first_name', 'last_name', 'email']}),
                 ('Permissions', {'fields': ['is_superuser', 'is_staff',
                                             'is_active', 'groupsofprofiles',
                                             'groupsofmetrics',
                                             'groupsofprobes',
                                             'groupsofaggregations']})]
    inlines = [UserProfileInline]
    list_filter = ('is_superuser', 'is_staff')
    list_display = ('username', 'first_name', 'last_name', 'email', 'is_staff', 'is_superuser')
    filter_horizontal = ('user_permissions',)
