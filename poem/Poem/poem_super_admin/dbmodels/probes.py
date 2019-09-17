from configparser import ConfigParser

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models.signals import pre_save
from django.dispatch import receiver

from Poem.tenants.models import Tenant
from Poem.users.models import CustUser

import reversion
from reversion.models import Revision, Version
from reversion.signals import post_revision_commit

from tenant_schemas.utils import schema_context, get_public_schema_name


@reversion.register()
class Probe(models.Model):
    name = models.CharField(max_length=128, null=False,
                            help_text='Name of the probe.', unique=True)
    version = models.CharField(max_length=28, help_text='Version of the probe.')
    nameversion = models.CharField(max_length=128, null=False,
                                   help_text='Name, version tuple.')
    description = models.CharField(max_length=1024)
    comment = models.CharField(max_length=512)
    repository = models.CharField(max_length=512)
    docurl = models.CharField(max_length=512)
    user = models.CharField(max_length=32, blank=True)
    datetime = models.DateTimeField(blank=True, max_length=32, null=True)

    class Meta:
        verbose_name = 'Probe'
        app_label = 'poem_super_admin'

    def __str__(self):
        return u'%s (%s)' % (self.name, self.version)


@receiver(pre_save, sender=Probe)
def probe_handler(sender, instance, **kwargs):
    instance.nameversion = u'%s (%s)' % (str(instance.name),
                                         str(instance.version))


def get_superuser_username(schema):
    tenant = Tenant.objects.get(schema_name=schema).name

    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    username = config.get('SUPERUSER_' + tenant.upper(), 'name')

    return username


def create_tenant_revision(revision, sender, signal, versions, **kwargs):
    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    if len(versions) == 1:
        version = versions[0]

    ct = ContentType.objects.get_for_id(version.content_type_id)
    instance = ct.get_object_for_this_type(id=int(version.object_id))

    if isinstance(instance, Probe):
        for schema in schemas:
            with schema_context(schema):
                rev = Revision(
                    date_created=revision.date_created,
                    comment=revision.comment,
                    user_id=CustUser.objects.get(
                        username=get_superuser_username(schema)
                    ).id
                )
                rev.save()

                ver = Version(
                    object_id=version.object_id,
                    content_type_id=version.content_type_id,
                    format=version.format,
                    serialized_data=version.serialized_data,
                    object_repr=version.object_repr,
                    db='default',
                    revision=rev
                )
                ver.save()
post_revision_commit.connect(create_tenant_revision)
