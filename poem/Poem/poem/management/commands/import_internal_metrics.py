from configparser import NoOptionError, NoSectionError

from Poem.helpers.metrics_helpers import import_metrics
from Poem.poem.management.commands.poem_superuser import tenant_superuser
from Poem.poem_super_admin import models as admin_models
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = """Import set of internal metrics to tenant."""

    def handle(self, *args, **kwargs):
        tenant = connection.tenant
        internal_metrics = [
            mt.name for mt in admin_models.MetricTemplate.objects.all()
            if 'internal' in [tag.name for tag in mt.tags.all()] and
               "eol" not in [tag.name for tag in mt.tags.all()]
        ]
        if len(internal_metrics) > 0:
            try:
                user = get_user_model().objects.get(
                    username=tenant_superuser()['SUPERUSER_NAME']
                )
                import_metrics(
                    metrictemplates=internal_metrics, tenant=tenant,
                    user=user
                )
                self.stdout.write('Internal metrics successfully imported.')

            except (
                get_user_model().DoesNotExist, NoSectionError, NoOptionError
            ):
                self.stderr.write(
                    f'Super user for tenant {tenant.name} is not defined.\n'
                    f'Internal metrics not imported.'
                )

        else:
            self.stderr.write(
                'No metric templates tagged "internal" in public schema!\n'
                'Internal metrics not imported.'
            )
