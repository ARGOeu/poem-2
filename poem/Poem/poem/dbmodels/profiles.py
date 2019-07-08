from django.contrib.auth.models import GroupManager, Permission
from django.db import models
from django.utils.translation import ugettext_lazy as _
from django.db.models.signals import m2m_changed, pre_save

class Profile(models.Model):
    """
    Profile is the core model and is defined as a set of metric instances, where
    metric instance is a tuple (flavour, metric_name, vo, fqan).

    Additional attributes cover profile's name, version, tags, ownership, defining VO and
    description.
    """
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128, null=False,
                    help_text='Name of the profile.')
    version = models.CharField(max_length=10, null=False, default='1.0',
                               help_text='Multiple versions of the profile can exist (defaults to 1.0).')
    vo = models.CharField(max_length=128,
                    help_text='', verbose_name='VO')
    description = models.CharField(max_length=1024, blank=True, null=True)
    groupname = models.CharField(max_length=128)

    class Meta:
        ordering = ['name', 'version']
        unique_together = ('name', 'version')
        permissions = (('profileown', 'Read/Write/Modify'),)
        app_label = 'poem'
        verbose_name = 'Profile'

    def __str__(self):
        return u'%s' % (self.name)


class GroupOfProfiles(models.Model):
    name = models.CharField(_('name'), max_length=80, unique=True)
    permissions = models.ManyToManyField(Permission,
                                         verbose_name=_('permissions'), blank=True)
    profiles = models.ManyToManyField(Profile, blank=True)
    objects = GroupManager()

    class Meta:
        verbose_name = _('Group of profiles')
        verbose_name_plural = _('Groups of profiles')
        app_label = 'poem'

    def __str__(self):
        return self.name

    def natural_key(self):
        return (self.name,)

def gpprofile_m2m(sender, action, pk_set, instance, **kwargs):
    if action == 'post_remove':
        for m in pk_set:
           Profile.objects.filter(id=m).update(groupname='')
    if action == 'post_add':
        for m in pk_set:
            Profile.objects.filter(id=m).update(groupname=instance.name)
m2m_changed.connect(gpprofile_m2m, sender=GroupOfProfiles.profiles.through)

class VO(models.Model):
    name = models.CharField(max_length=128, help_text='', verbose_name='Virtual organization', \
                            primary_key=True)

    class Meta:
        app_label = 'poem'

    def __str__(self):
        return u'%s' % self.name

