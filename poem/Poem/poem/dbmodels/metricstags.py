from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant
from django.contrib.auth.models import GroupManager, Permission
from django.db import models
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils.translation import ugettext_lazy as _
from django_tenants.utils import schema_context, get_public_schema_name


class GroupOfMetrics(models.Model):
    name = models.CharField(_('name'), max_length=80, unique=True)
    permissions = models.ManyToManyField(Permission,
                                         verbose_name=_('permissions'),
                                         blank=True)
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
    name = models.CharField(max_length=128, unique=True)
    probeversion = models.CharField(max_length=1024, null=True, blank=True)
    group = models.ForeignKey(GroupOfMetrics, null=True,
                              on_delete=models.SET_NULL)
    config = models.CharField(max_length=1024)

    class Meta:
        permissions = (('metricsown', 'Read/Write/Modify'),)
        app_label = 'poem'
        verbose_name = 'Metric'

    def __str__(self):
        return u'%s' % self.name


class MetricConfiguration(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1024, unique=True)
    globalattribute = models.TextField()
    hostattribute = models.TextField()
    metricparameter = models.TextField()

    class Meta:
        app_label = "poem"

    def __str__(self):
        return u"%s" % self.name


class ProbeCandidateStatus(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128, unique=True)

    class Meta:
        app_label = "poem"

    def __str__(self):
        return u"%s" % self.name


class ProbeCandidate(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)
    description = models.CharField(max_length=1024)
    docurl = models.URLField(max_length=1024)
    rpm = models.CharField(max_length=1024)
    yum_baseurl = models.URLField(max_length=1024)
    command = models.CharField(max_length=2048)
    contact = models.EmailField()
    status = models.CharField(max_length=512, default="submitted")
    created = models.DateTimeField(max_length=32, auto_now_add=True)
    last_update = models.DateTimeField(max_length=32, auto_now=True)

    class Meta:
        app_label = "poem"

    def __str__(self):
        return u"%s" % self.name


@receiver(pre_save, sender=admin_models.Package)
def update_metrics(sender, instance, **kwargs):
    schemas = list(
        Tenant.objects.all().values_list('schema_name', flat=True)
    )
    schemas.remove(get_public_schema_name())
    probes = admin_models.ProbeHistory.objects.filter(package=instance)

    for schema in schemas:
        with schema_context(schema):
            for probe in probes:
                metrics = Metric.objects.filter(
                    probeversion=f"{probe.name} ({probe.package.version})"
                )
                for metric in metrics:
                    metric.probeversion = f"{probe.name} ({instance.version})"
                    metric.save()
