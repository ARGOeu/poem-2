from django.dispatch import receiver
from django.contrib.auth.models import GroupManager, Permission
from django.db import models
from django.db.models.signals import m2m_changed, pre_save
from django.utils.translation import ugettext_lazy as _
import copy

YESNO_CHOICE=((u'Y', u'Yes'), (u'N', u'No'), )

class Aggregation(models.Model):
    name = models.CharField(max_length=128, null=False,
                            help_text='Name of the Aggregation profile.')
    apiid = models.CharField(max_length=128, help_text='WEB-API ID of Aggregation profile')
    groupname = models.CharField(max_length=128, default='')

    class Meta:
        permissions = (('aggregationsown', 'Read/Write/Modify'),)
        app_label = 'poem'

    def __str__(self):
        return u'%s' % (self.name)


class GroupOfAggregations(models.Model):
    name = models.CharField(_('name'), max_length=80, unique=True)
    permissions = models.ManyToManyField(Permission,
                                         verbose_name=_('permissions'), blank=True)
    aggregations = models.ManyToManyField(Aggregation, blank=True)
    objects = GroupManager()

    class Meta:
        verbose_name = _('Group of aggregations')
        verbose_name_plural = _('Groups of aggregations')
        app_label = 'poem'

    def __str__(self):
        return self.name

    def natural_key(self):
        return (self.name,)
