from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from Poem.poem_super_admin.models import Probe, History


class ExtRevision(models.Model):
    class Meta:
        app_label = 'poem_super_admin'

    version = models.CharField(max_length=128, null=False, help_text='Version')
    probeid = models.BigIntegerField()
    revision = models.OneToOneField(History, on_delete=models.CASCADE)


@receiver(post_save, sender=History)
def create_extrevision(sender, instance, **kwargs):
    ct = ContentType.objects.get_for_model(Probe)
    if instance.content_type == ct:
        ExtRevision.objects.create(
            probeid=instance.object_id,
            version=instance.object_repr.split(' ')[1][1:-1],
            revision=instance
        )
