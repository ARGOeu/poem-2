from django.contrib.contenttypes.models import ContentType
from django.db import models

from Poem.poem_super_admin.dbmodels.probes import Probe


class HistoryManager(models.Manager):
    def get_by_natural_key(self, object_repr):
        return self.get(object_repr=object_repr)


class History(models.Model):
    object_id = models.CharField(max_length=191)
    serialized_data = models.TextField()
    object_repr = models.TextField()
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    date_created = models.DateTimeField(auto_now_add=True)
    comment = models.TextField(blank=True)
    user = models.CharField(max_length=32)

    objects = HistoryManager()

    class Meta:
        app_label = 'poem_super_admin'

    def natural_key(self):
        return (self.object_repr,)


class NewHistoryManager(models.Manager):
    def get_by_natural_key(self, name, version):
        return self.get(name=name, version=version)


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

    class Meta:
        app_label = 'poem_super_admin'
        unique_together = [['name', 'version']]

    def __str__(self):
        return u'%s (%s)' % (self.name, self.version)

    def natural_key(self):
        return (self.name, self.version)
