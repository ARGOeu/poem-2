from django.contrib.auth.models import GroupManager, Permission
from django.db import models
from django.utils.translation import ugettext_lazy as _

from reversion.models import Version


class Metrics(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)

    class Meta:
        permissions = (('metricsown', 'Read/Write/Modify'),)
        app_label = 'poem'

    def __str__(self):
        return u'%s' % self.name


class Tags(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)

    class Meta:
        app_label = 'poem'

    def __str__(self):
        return u'%s' % (self.name)


class MetricType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)

    class Meta:
        app_label = 'poem'

    def __str__(self):
        return u'%s' % (self.name)


class GroupOfMetrics(models.Model):
    name = models.CharField(_('name'), max_length=80, unique=True)
    permissions = models.ManyToManyField(Permission,
                                         verbose_name=_('permissions'), blank=True)
    metrics = models.ManyToManyField(Metrics, blank=True)
    objects = GroupManager()

    class Meta:
        verbose_name = _('Group of metrics')
        verbose_name_plural = _('Groups of metrics')
        app_label = 'poem'

    def __str__(self):
        return self.name

    def natural_key(self):
        return (self.name,)


class Metric(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)
    tag = models.ForeignKey(Tags, on_delete=models.CASCADE)
    mtype = models.ForeignKey(MetricType, on_delete=models.CASCADE)
    probeversion = models.CharField(max_length=128)
    probekey = models.ForeignKey(Version, blank=True, null=True, on_delete=models.SET_NULL)
    group = models.ForeignKey(GroupOfMetrics, null=True, on_delete=models.CASCADE)
    parent = models.CharField(max_length=128)
    probeexecutable = models.CharField(max_length=128)
    config = models.CharField(max_length=1024)
    attribute = models.CharField(max_length=1024)
    dependancy = models.CharField(max_length=1024)
    flags = models.CharField(max_length=1024)
    files = models.CharField(max_length=1024)
    parameter = models.CharField(max_length=1024)
    fileparameter = models.CharField(max_length=1024)

    class Meta:
        app_label = 'poem'
        verbose_name = 'Metric'
        unique_together = (('name', 'tag'),)

    def __str__(self):
        return u'%s (%s)' % (self.name, self.tag)


class MetricDependancy(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem'
