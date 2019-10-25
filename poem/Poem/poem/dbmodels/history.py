from django.contrib.contenttypes.models import ContentType
from django.db import models


class TenantHistory(models.Model):
    """
    Tenant history model is going to store versions of tenant specific
    models; unlike History model which stores versions in public Postgres
    schema.
    """
    object_id = models.CharField(max_length=191)
    serialized_data = models.TextField()
    object_repr = models.TextField()
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    date_created = models.DateTimeField(auto_now_add=True)
    comment = models.TextField(blank=True)
    user = models.CharField(max_length=32)

    class Meta:
        app_label = 'poem'
