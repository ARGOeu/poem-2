# Generated by Django 2.2.5 on 2019-12-09 10:02

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('poem_super_admin', '0011_package'),
    ]

    operations = [
        migrations.AddField(
            model_name='probe',
            name='package',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='poem_super_admin.Package'),
        ),
    ]
