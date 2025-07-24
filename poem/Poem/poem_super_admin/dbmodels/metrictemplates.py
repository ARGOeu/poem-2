from django.db import models

from Poem.poem_super_admin.models import ProbeHistory


class MetricTemplateManager(models.Manager):
    def get_by_natural_key(self, name):
        return self.get(name=name)


class MetricTemplateType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)

    objects = MetricTemplateManager()

    class Meta:
        app_label = 'poem_super_admin'

    def __str__(self):
        return u'%s' % self.name

    def natural_key(self):
        return (self.name,)


class MetricTags(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128, unique=True)

    objects = MetricTemplateManager()

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
    tags = models.ManyToManyField(MetricTags)
    probekey = models.ForeignKey(ProbeHistory, blank=True, null=True,
                                 on_delete=models.SET_NULL)
    description = models.TextField(default='')
    parent = models.CharField(max_length=128)
    probeexecutable = models.CharField(max_length=128)
    config = models.CharField(max_length=1024)
    attribute = models.CharField(max_length=1024)
    dependency = models.CharField(max_length=1024)
    flags = models.CharField(max_length=1024)
    parameter = models.CharField(max_length=1024)

    objects = MetricTemplateManager()

    class Meta:
        app_label = 'poem_super_admin'
        verbose_name = 'Metric template'

    def __str__(self):
        return u'%s' % self.name

    def natural_key(self):
        return (self.name,)


class MetricTemplateHistory(models.Model):
    object_id = models.ForeignKey(MetricTemplate, on_delete=models.CASCADE)
    name = models.CharField(max_length=128)
    mtype = models.ForeignKey(MetricTemplateType, on_delete=models.CASCADE)
    tags = models.ManyToManyField(MetricTags)
    probekey = models.ForeignKey(ProbeHistory, null=True,
                                 on_delete=models.SET_NULL)
    description = models.TextField(default='')
    parent = models.CharField(max_length=128)
    probeexecutable = models.CharField(max_length=128)
    config = models.CharField(max_length=1024)
    attribute = models.CharField(max_length=1024)
    dependency = models.CharField(max_length=1024)
    flags = models.CharField(max_length=1024)
    parameter = models.CharField(max_length=1024)
    date_created = models.DateTimeField(auto_now_add=True)
    version_comment = models.TextField(blank=True)
    version_user = models.CharField(max_length=32)

    class Meta:
        app_label = 'poem_super_admin'
        unique_together = [['name', 'probekey']]

    def __str__(self):
        if self.probekey:
            return u'%s [%s]' % (self.name, self.probekey.__str__())
        else:
            return u'%s' % self.name

    def natural_key(self):
        return (self.name, self.probekey)


class DefaultPort(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128, unique=True)
    value = models.CharField(max_length=128)

    class Meta:
        app_label = 'poem_super_admin'

    def __str__(self):
        return u'%s' % self.name

    def natural_key(self):
        return (self.name,)
