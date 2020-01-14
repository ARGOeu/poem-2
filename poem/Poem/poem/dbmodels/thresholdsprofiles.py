from django.contrib.auth.models import GroupManager, Permission
from django.db import models
from django.utils.translation import ugettext_lazy as _


class ThresholdsProfiles(models.Model):
    name = models.CharField(max_length=128, null=False)
    apiid = models.CharField(max_length=128)
    groupname = models.CharField(max_length=128, default='')

    class Meta:
        permissions = (('thresholdsprofilesown', 'Read/Write/Modify'),)
        app_label = 'poem'

    def __str__(self):
        return u'%s' % self.name


class GroupOfThresholdsProfiles(models.Model):
    name = models.CharField(_('name'), max_length=80, unique=True)
    permissions = models.ManyToManyField(
        Permission,
        verbose_name=_('permissions'),
        blank=True
    )
    thresholdsprofiles = models.ManyToManyField(ThresholdsProfiles, blank=True)

    objects = GroupManager()

    class Meta:
        verbose_name = _('Group of thresholds profiles')
        verbose_name_plural = _('Groups of thresholds profiles')
        app_label = 'poem'

    def __str__(self):
        return self.name

    def natural_key(self):
        return (self.name,)
