# Generated by Django 3.2.19 on 2023-08-07 08:51

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poem', '0033_probecandidate_production_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='probecandidate',
            name='rejection_reason',
            field=models.CharField(blank=True, max_length=1024, null=True),
        ),
    ]
