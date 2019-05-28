from Poem import settings
from Poem.poem.dbmodels.probes import GroupOfProbes
from Poem.poem.dbmodels.profiles import GroupOfProfiles
from Poem.poem.dbmodels.metricstags import GroupOfMetrics
from Poem.poem.dbmodels.aggregations import GroupOfAggregations
from django.contrib import auth
from django.contrib.auth.models import UserManager, Permission, AbstractBaseUser
from django.core import validators
from django.core.mail import send_mail
from django.db import models
from django.db.models.signals import post_save
from django.utils import timezone
from django.utils.http import urlquote
from django.utils.translation import ugettext_lazy as _
import re

class CustPermissionsMixin(models.Model):
    is_superuser = models.BooleanField(_('superuser status'), default=False,
        help_text=_('Designates that this user has all permissions without '
                    'explicitly assigning them.'))
    user_permissions = models.ManyToManyField(Permission,
        verbose_name=_('user permissions'), blank=True,
        help_text=_('Specific permissions for this user.'),
        related_name="user_set", related_query_name="user")
    groupsofprofiles = models.ManyToManyField(GroupOfProfiles, verbose_name=('groups of profiles'),
        blank=True, help_text=_('The groups of profiles that user will control'),
        related_name='user_set', related_query_name='user')
    groupsofmetrics = models.ManyToManyField(GroupOfMetrics, verbose_name=('groups of metrics'),
        blank=True, help_text=_('The groups of metrics that user will control'),
        related_name='user_set', related_query_name='user')
    groupsofprobes = models.ManyToManyField(GroupOfProbes, verbose_name=('groups of probes'),
        blank=True, help_text=_('The groups of probes that user will control'),
        related_name='user_set', related_query_name='user')
    groupsofaggregations = models.ManyToManyField(GroupOfAggregations, verbose_name=('groups of aggregations'),
        blank=True, help_text=_('The groups of aggregations that user will control'),
        related_name='user_set', related_query_name='user')

    class Meta:
        abstract = True

    def _user_get_all_permissions(self, user, obj):
        permissions = set()
        for backend in auth.get_backends():
            if hasattr(backend, "get_all_permissions"):
                permissions.update(backend.get_all_permissions(user, obj))
        return permissions

    def _user_has_module_perms(self, user, app_label):
        for backend in auth.get_backends():
            if hasattr(backend, "has_module_perms"):
                if backend.has_module_perms(user, app_label):
                    return True
        return False

    def _user_has_perm(self, user, perm, obj):
        for backend in auth.get_backends():
            if hasattr(backend, "has_perm"):
                if backend.has_perm(user, perm, obj):
                    return True
        return False

    def get_group_permissions(self, obj=None):
        permissions = set()
        for backend in auth.get_backends():
            if hasattr(backend, "get_group_permissions"):
                permissions.update(backend.get_group_permissions(self, obj))
        return permissions

    def get_all_permissions(self, obj=None):
        return self._user_get_all_permissions(self, obj)

    def has_perm(self, perm, obj=None):
        # Active superusers have all permissions.
        if self.is_active and self.is_superuser:
            return True

        # Otherwise we need to check the backends.
        return self._user_has_perm(self, perm, obj)

    def has_perms(self, perm_list, obj=None):
        for perm in perm_list:
            if not self.has_perm(perm, obj):
                return False
        return True

    def has_module_perms(self, app_label):
        # Active superusers have all permissions.
        if self.is_active and self.is_superuser:
            return True

        return self._user_has_module_perms(self, app_label)

class CustAbstractBaseUser(AbstractBaseUser, CustPermissionsMixin):
    class Meta:
        abstract = True
    pass

class CustAbstractUser(CustAbstractBaseUser):
    class Meta:
        abstract = True
    pass

class CustUser(CustAbstractUser):
    username = models.CharField(_('username'), max_length=30, unique=True,
        help_text=_('Required. 30 characters or fewer. Letters, numbers and '
                    '@/./+/-/_ characters'),
        validators=[
            validators.RegexValidator(re.compile('^[\w.@+-]+$'), _('Enter a valid username.'), 'invalid')
        ])
    first_name = models.CharField(_('first name'), max_length=30, blank=True)
    last_name = models.CharField(_('last name'), max_length=30, blank=True)
    email = models.EmailField(_('email address'), blank=True)
    is_staff = models.BooleanField(_('staff status'), default=True,
        help_text=_('Designates whether the user can log into this admin '
                    'site.'))
    is_active = models.BooleanField(_('active'), default=True,
        help_text=_('Designates whether this user should be treated as '
                    'active. Unselect this instead of deleting accounts.'))
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        app_label = 'poem'
        verbose_name = _('User')
        verbose_name_plural = _('Users')

    def get_absolute_url(self):
        return "/users/%s/" % urlquote(self.username)

    def get_full_name(self):
        full_name = '%s %s' % (self.first_name, self.last_name)
        return full_name.strip()

    def get_short_name(self):
        return self.first_name

    def email_user(self, subject, message, from_email=None):
        send_mail(subject, message, from_email, [self.email])

class UserProfile(models.Model):
    """
    Extension of auth.User model that adds certificate DN.
    """
    class Meta:
        app_label = 'poem'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    subject = models.CharField('distinguishedName', max_length=512, blank=True,
                               null=True,)
    egiid = models.CharField('eduPersonUniqueId', max_length=255, blank=True,
                             null=True, unique=True)
    displayname = models.CharField('displayName', max_length=30, blank=True,
                                   null=True)

def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
post_save.connect(create_user_profile, sender=settings.AUTH_USER_MODEL)
