# Generated by Django 3.2.12 on 2022-04-13 08:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poem_super_admin', '0024_metrictemplatehistory_tags'),
    ]

    operations = [
        migrations.AlterField(
            model_name='metrictags',
            name='name',
            field=models.CharField(default='default', max_length=128, unique=True),
            preserve_default=False,
        ),
    ]
