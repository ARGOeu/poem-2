from django.db import models
from django.db.models.signals import pre_save
from django.dispatch import receiver

import reversion


@reversion.register()
class Probe(models.Model):
    name = models.CharField(max_length=128, null=False,
                            help_text='Name of the probe.', unique=True)
    version = models.CharField(max_length=28, help_text='Version of the probe.')
    nameversion = models.CharField(max_length=128, null=False,
                                   help_text='Name, version tuple.')
    description = models.CharField(max_length=1024)
    comment = models.CharField(max_length=512)
    repository = models.CharField(max_length=512)
    docurl = models.CharField(max_length=512)
    user = models.CharField(max_length=32, blank=True)
    datetime = models.DateTimeField(blank=True, max_length=32, null=True)

    class Meta:
        verbose_name = 'Probe'
        app_label = 'poem_super_admin'

    def __str__(self):
        return u'%s (%s)' % (self.name, self.version)


@receiver(pre_save, sender=Probe)
def probe_handler(sender, instance, **kwargs):
    instance.nameversion = u'%s (%s)' % (str(instance.name),
                                         str(instance.version))
