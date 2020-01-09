from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

import json

from Poem.poem.models import Metric
from Poem.poem_super_admin import models as admin_models
from Poem.tenants.models import Tenant

from tenant_schemas.utils import schema_context, get_public_schema_name


class TenantHistoryManager(models.Manager):
    def get_by_natural_key(self, object_repr):
        return self.get(object_repr=object_repr)


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

    objects = TenantHistoryManager()

    class Meta:
        app_label = 'poem'

    def natural_key(self):
        return (self.object_repr,)


@receiver(post_save, sender=admin_models.Package)
def update_metric_history(sender, instance, created, **kwargs):
    if not created:
        schemas = list(
            Tenant.objects.all().values_list('schema_name', flat=True)
        )
        schemas.remove(get_public_schema_name())
        probes = admin_models.ProbeHistory.objects.filter(
            package=instance
        )
        for schema in schemas:
            with schema_context(schema):
                for probe in probes:
                    metrics = Metric.objects.filter(probekey=probe)
                    for metric in metrics:
                        vers = TenantHistory.objects.filter(
                            object_id=metric.id
                        ).order_by('-date_created')

                        for ver in vers:
                            serialized_data = json.loads(ver.serialized_data)
                            serialized_data[0]['fields']['probekey'] = [
                                probe.name, probe.package.version
                            ]
                            ver.serialized_data = json.dumps(serialized_data)
                            ver.save()
