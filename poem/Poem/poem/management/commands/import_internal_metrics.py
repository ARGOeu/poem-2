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
            'hr.srce.CertLifetime-Local',
            'org.nagios.DiskCheck-Local',
            'org.nagios.ProcessCrond',
            'org.nagios.AmsDirSize',
            'org.nagios.NagiosCmdFile',
            'argo.AMSPublisher-Check'
        ]
        templates = [
            mt.name for mt in admin_models.MetricTemplate.objects.all()
        ]
        if len(templates) > 0:
            if set(internal_metrics).issubset(set(templates)):
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
                        'Super user for tenant {} is not defined.\n'
                        'Internal metrics not imported.'.format(tenant.name)
                    )

            else:
                diff = set(internal_metrics).difference(set(templates))
                if len(diff) == 1:
                    self.stderr.write(
                        'Metric {} not in metric templates!\n'
                        'Internal metrics not imported.'.format(list(diff)[0])
                    )

                else:
                    self.stderr.write(
                        'Metrics {} not in metric templates!\n'
                        'Internal metrics not imported.'.format(
                            ', '.join(list(diff))
                        )
                    )
        else:
            self.stderr.write(
                'No metric templates in public schema!\n'
                'Internal metrics not imported.'
            )
