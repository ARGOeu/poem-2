# Splitted manually to fix CircularDependencyError

from django.conf import settings
import django.contrib.auth.models
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import re

class Migration(migrations.Migration):

    initial = False

    dependencies = [
        ('poem', '0001_initial'),
        ('reversion', '0001_squashed_0004_auto_20160611_1202')
    ]

    operations = [
        migrations.CreateModel(
            name='ExtRevision',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version', models.CharField(help_text='Version', max_length=128)),
                ('probeid', models.BigIntegerField()),
                ('revision', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='reversion.Revision')),
            ],
        ),
        migrations.AddField(
            model_name='Metric',
            name='probekey',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='reversion.Version')
        ),
    ]

