from django.contrib.contenttypes.models import ContentType
from django.db import models


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
