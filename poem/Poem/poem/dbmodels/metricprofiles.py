from django.contrib.auth.models import GroupManager, Permission
from django.db import models
from django.utils.translation import ugettext_lazy as _


class MetricProfiles(models.Model):
    name = models.CharField(max_length=128, null=False,
                            help_text='Name of the Metric profile.')
    description = models.CharField(max_length=1024, blank=True, default='')
    apiid = models.CharField(max_length=128, help_text='WEB-API ID of Metric profile')
    groupname = models.CharField(max_length=128, default='')

    class Meta:
        permissions = (('metricprofilessown', 'Read/Write/Modify'),)
        app_label = 'poem'

    def __str__(self):
        return u'%s' % (self.name)


class GroupOfMetricProfiles(models.Model):
    name = models.CharField(_('name'), max_length=80, unique=True)
    permissions = models.ManyToManyField(Permission,
                                         verbose_name=_('permissions'), blank=True)
    metricprofiles = models.ManyToManyField(MetricProfiles, blank=True)
    objects = GroupManager()

    class Meta:
        verbose_name = _('Group of metric profiles')
        verbose_name_plural = _('Groups of metric profiles')
        app_label = 'poem'

    def __str__(self):
        return self.name

    def natural_key(self):
        return (self.name,)
