from django.db import models
from reversion.signals import post_revision_commit
from reversion.models import Revision
from Poem.poem.models import Probe

from django.contrib.contenttypes.models import ContentType


class ExtRevision(models.Model):
    class Meta:
        app_label = 'poem'

    version = models.CharField(max_length=128, null=False, help_text='Version')
    probeid = models.BigIntegerField()
    revision = models.OneToOneField(Revision, on_delete=models.CASCADE)

def on_revision_commit(revision, sender, signal, versions, **kwargs):
    if len(versions) == 1:
        version = versions[0]
    ct = ContentType.objects.get_for_id(version.content_type_id)
    model_changed = ct.model_class()
    instance = ct.get_object_for_this_type(id=int(version.object_id))
    if (len(versions) == 1
        and isinstance(instance, Probe)):
        ExtRevision.objects.create(probeid=instance.id,
                                   version=instance.version, revision=revision)
        instance.datetime = revision.date_created
        instance.save()
    # delete extra revision that plugin creates with empty comment
    if revision.id and not revision.comment:
        revision.delete()

post_revision_commit.connect(on_revision_commit)
