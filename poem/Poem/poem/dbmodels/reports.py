from django.contrib.auth.models import GroupManager, Permission
from django.db import models
from django.utils.translation import ugettext_lazy as _


class Reports(models.Model):
    name = models.CharField(max_length=128, null=False,
                            help_text='Name of the Report.')
    description = models.CharField(max_length=1024, blank=True, default='')
    apiid = models.CharField(max_length=128, help_text='WEB-API ID of Report')
    groupname = models.CharField(max_length=128, default='')

    class Meta:
        permissions = (('reportsown', 'Read/Write/Modify'),)
        app_label = 'poem'

    def __str__(self):
        return u'%s' % (self.name)


class GroupOfReports(models.Model):
    name = models.CharField(_('name'), max_length=80, unique=True)
    permissions = models.ManyToManyField(Permission,
                                         verbose_name=_('permissions'), blank=True)
    reports = models.ManyToManyField(Reports, blank=True)
    objects = GroupManager()

    class Meta:
        verbose_name = _('Group of reports')
        verbose_name_plural = _('Groups of reports')
        app_label = 'poem'

    def __str__(self):
        return self.name

    def natural_key(self):
        return (self.name,)
