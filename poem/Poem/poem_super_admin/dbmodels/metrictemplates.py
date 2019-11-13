from django.db import models

from Poem.poem_super_admin.models import History


class MetricTemplateTypeManager(models.Manager):
    def get_by_natural_key(self, name):
        return self.get(name=name)


class MetricTemplateType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)

    objects = MetricTemplateTypeManager()

    class Meta:
        app_label = 'poem_super_admin'

    def __str__(self):
        return u'%s' % self.name

    def natural_key(self):
        return (self.name,)


class MetricTemplate(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128, unique=True)
    mtype = models.ForeignKey(MetricTemplateType, on_delete=models.CASCADE)
    probeversion = models.CharField(max_length=128)
    probekey = models.ForeignKey(History, blank=True, null=True,
                                 on_delete=models.SET_NULL)
    parent = models.CharField(max_length=128)
    probeexecutable = models.CharField(max_length=128)
    config = models.CharField(max_length=1024)
    attribute = models.CharField(max_length=1024)
    dependency = models.CharField(max_length=1024)
    flags = models.CharField(max_length=1024)
    files = models.CharField(max_length=1024)
    parameter = models.CharField(max_length=1024)
    fileparameter = models.CharField(max_length=1024)

    class Meta:
        app_label = 'poem_super_admin'
        verbose_name = 'Metric template'

    def __str__(self):
        return u'%s' % self.name
