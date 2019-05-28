# reversion DB schema updates from v 1.8.7

from django.conf import settings
import django.contrib.auth.models
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import re


def load_data(apps, schema_editor):
    """Set field added in previous migration to 'default' as it's the only DB
       listed in settings.DATABASES
    """
    Version = apps.get_model('reversion', 'Version')
    for version in Version.objects.all():
        version.db = 'default'
        version.save()


class Migration(migrations.Migration):

    initial = False

    dependencies = [
        ('poem', '0002_extrev_add'),
    ]

    operations = [
        migrations.RunPython(load_data)
    ]


