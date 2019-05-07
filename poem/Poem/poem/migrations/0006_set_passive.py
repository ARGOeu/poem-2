from django.db import migrations, models
import django.db.models.deletion
import json
from django.contrib.contenttypes.models import ContentType


def fill_metrictypes(apps, schema_editor):
    """
        Fill MetricType model to predefined values if not already filled with
        fixtures.
    """
    MetricType = apps.get_model('poem', 'MetricType')
    if MetricType.objects.count() == 0:
        m = MetricType(name='Active')
        m.save()
        m = MetricType(name='Passive')
        m.save()


def set_versions_passive(apps, schema_editor):
    Version = apps.get_model('reversion', 'Version')
    Metric = apps.get_model('poem', 'Metric')
    ct = ContentType.objects.get_for_model(Metric)
    versions = Version.objects.filter(content_type_id=ct.id)
    for version in versions:
        data = json.loads(version.serialized_data)
        fields = json.loads(version.serialized_data)[0]['fields']
        if 'PASSIVE 1' in fields['flags']:
            fields.update(mtype=2)
        else:
            fields.update(mtype=1)
        data[0]['fields'] = fields
        version.serialized_data = json.dumps(data)
        version.save()


def set_passive(apps, schema_editor):
    Metric = apps.get_model('poem', 'Metric')
    MetricType = apps.get_model('poem', 'MetricType')
    mtype = MetricType.objects.get(name='Passive')
    objs = Metric.objects.filter(flags__contains='PASSIVE 1')
    for obj in objs:
        obj.mtype = mtype
        obj.save()


class Migration(migrations.Migration):

    dependencies = [
        ('poem', '0005_add_metrictype'),
    ]

    operations = [
        migrations.RunPython(fill_metrictypes),
        migrations.RunPython(set_passive),
        migrations.RunPython(set_versions_passive)
    ]
