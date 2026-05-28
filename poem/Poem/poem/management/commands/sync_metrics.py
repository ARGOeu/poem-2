from Poem.helpers.metrics_helpers import sync_metrics
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django_tenants.utils import get_tenant_model


class Command(BaseCommand):
    help = "Synchronize tenant metrics from SuperPOEM with metrics used in WEB API profiles."

    def add_arguments(self, parser):
        parser.add_argument(
            "-t",
            "--tenant",
            "--schema-name",
            dest="tenant",
            required=True,
            help="Tenant name or PostgreSQL schema name.",
        )
        parser.add_argument(
            "-u",
            "--username",
            "--user",
            dest="username",
            required=True,
            help="Username recorded in created metric history entries.",
        )

    def _get_tenant(self, tenant_identifier):
        TenantModel = get_tenant_model()

        try:
            return TenantModel.objects.get(schema_name=tenant_identifier)

        except TenantModel.DoesNotExist:
            try:
                return TenantModel.objects.get(name=tenant_identifier)

            except TenantModel.DoesNotExist:
                raise CommandError(
                    f'Tenant "{tenant_identifier}" does not exist.'
                )

            except TenantModel.MultipleObjectsReturned:
                raise CommandError(
                    f'Multiple tenants named "{tenant_identifier}" found; '
                    f'use --schema-name instead.'
                )

    def _get_user(self, username):
        UserModel = get_user_model()

        try:
            return UserModel.objects.get(username=username)

        except UserModel.DoesNotExist:
            raise CommandError(f'User "{username}" does not exist.')

    def _write_items(self, title, items):
        if items:
            self.stdout.write(f"{title}: {', '.join(items)}")

        else:
            self.stdout.write(f"{title}: none")

    def handle(self, *args, **options):
        tenant = self._get_tenant(options["tenant"])
        connection.set_tenant(tenant)

        user = self._get_user(options["username"])
        imported, warn, err, unavailable, deleted = sync_metrics(tenant, user)

        self.stdout.write(
            self.style.SUCCESS(
                f'Metrics synchronized for tenant "{tenant.name}" '
                f'({tenant.schema_name}).'
            )
        )
        self._write_items("Imported", imported)
        self._write_items("Imported with warnings", warn)
        self._write_items("Not imported", err)
        self._write_items("Unavailable", unavailable)
        self._write_items("Deleted", deleted)
