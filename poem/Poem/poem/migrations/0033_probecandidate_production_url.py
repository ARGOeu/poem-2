# Generated by Django 3.2.19 on 2023-07-21 13:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poem', '0032_probecandidate_devel_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='probecandidate',
            name='production_url',
            field=models.URLField(blank=True, max_length=2048, null=True),
        ),
    ]
