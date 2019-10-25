#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Poem.settings')
django.setup()

from django.contrib.contenttypes.models import ContentType
from django.core import serializers

from Poem.poem.models import Metric, TenantHistory
from Poem.tenants.models import Tenant

from tenant_schemas.utils import schema_context, get_public_schema_name


def main():
    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    for schema in schemas:
        with schema_context(schema):
            metrics = Metric.objects.all()

            for metric in metrics:
                TenantHistory.objects.create(
                    object_id=str(metric.id),
                    serialized_data=serializers.serialize('json', [metric]),
                    object_repr=metric.__str__(),
                    content_type=ContentType.objects.get_for_model(Metric),
                    comment='Initial version.',
                    user='poem'
                )


main()
