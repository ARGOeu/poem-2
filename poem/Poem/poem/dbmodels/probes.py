from django.dispatch import receiver
from django.contrib.auth.models import GroupManager, Permission
from django.db import models
from django.db.models.signals import m2m_changed, pre_save
from django.utils.translation import ugettext_lazy as _
import copy

YESNO_CHOICE=((u'Y', u'Yes'), (u'N', u'No'), )

class Probe(models.Model):
    name = models.CharField(max_length=128, null=False,
                            help_text='Name of the probe.', unique=True)
    version = models.CharField(max_length=28, help_text='Version of the probe.')
    nameversion = models.CharField(max_length=128, null=False, help_text='Name, version tuple.')
    description = models.CharField(max_length=1024)
    comment = models.CharField(max_length=512)
    repository = models.CharField(max_length=512)
    docurl = models.CharField(max_length=512)
    group = models.CharField(max_length=1024)
    user = models.CharField(max_length=32, blank=True)
    datetime = models.DateTimeField(blank=True, max_length=32, null=True)

    class Meta:
        permissions = (('probesown', 'Read/Write/Modify'),)
        verbose_name = 'Probe'
        app_label = 'poem'

    def __str__(self):
        return u'%s (%s)' % (self.name, self.version)


@receiver(pre_save, sender=Probe)
def probe_handler(sender, instance, **kwargs):
    instance.nameversion = u'%s (%s)' % (str(instance.name), str(instance.version))


class GroupOfProbes(models.Model):
    name = models.CharField(_('name'), max_length=80, unique=True)
    permissions = models.ManyToManyField(Permission,
                                         verbose_name=_('permissions'), blank=True)
    probes = models.ManyToManyField(Probe, blank=True)
    objects = GroupManager()

    class Meta:
        verbose_name = _('Group of probes')
        verbose_name_plural = _('Groups of probes')
        app_label = 'poem'

    def __str__(self):
        return self.name

    def natural_key(self):
        return (self.name,)

def gpprobes_m2m(sender, action, pk_set, instance, **kwargs):
    if action == 'post_remove':
        for m in pk_set:
            Probe.objects.filter(id=m).update(group='')
    if action == 'post_add':
        for m in pk_set:
            Probe.objects.filter(id=m).update(group=instance.name)
m2m_changed.connect(gpprobes_m2m, sender=GroupOfProbes.probes.through)
