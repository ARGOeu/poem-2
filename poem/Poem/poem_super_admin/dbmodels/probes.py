from django.db import models
from django.db.models.signals import pre_save
from django.dispatch import receiver

from Poem.poem_super_admin.models import Package


class ProbeManager(models.Manager):
    def get_by_natural_key(self, name, version):
        return self.get(name=name, version=version)


class Probe(models.Model):
    name = models.CharField(max_length=128, null=False, unique=True)
    version = models.CharField(max_length=28)
    package = models.ForeignKey(Package,  null=True, on_delete=models.SET_NULL)
    description = models.CharField(max_length=1024)
    comment = models.CharField(max_length=512)
    repository = models.CharField(max_length=512)
    docurl = models.CharField(max_length=512)
    user = models.CharField(max_length=32, blank=True)
    datetime = models.DateTimeField(blank=True, max_length=32, null=True)

    objects = ProbeManager()

    class Meta:
        verbose_name = 'Probe'
        app_label = 'poem_super_admin'

    def __str__(self):
        if self.package:
            return u'%s (%s)' % (self.name, self.package.version)
        else:
            return u'%s (%s)' % (self.name, self.version)

    def natural_key(self):
        return (self.name, self.version)


class ProbeHistory(models.Model):
    object_id = models.ForeignKey(Probe, on_delete=models.CASCADE)
    name = models.CharField(max_length=128)
    version = models.CharField(max_length=28)
    description = models.CharField(max_length=1024)
    comment = models.CharField(max_length=512)
    repository = models.CharField(max_length=512)
    docurl = models.CharField(max_length=512)
    date_created = models.DateTimeField(auto_now_add=True)
    version_comment = models.TextField(blank=True)
    version_user = models.CharField(max_length=32)

    objects = ProbeManager()

    class Meta:
        app_label = 'poem_super_admin'
        unique_together = [['name', 'version']]

    def __str__(self):
        return u'%s (%s)' % (self.name, self.version)

    def natural_key(self):
        return (self.name, self.version)


@receiver(pre_save, sender=Probe)
def probe_handler(sender, instance, **kwargs):
    if instance.package:
        instance.version = instance.package.version
