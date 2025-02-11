from django.core.management.base import BaseCommand
from django_tenants.management.commands import InteractiveTenantOption
from django.db import connection

from Poem.api.models import MyAPIKey
from Poem.poem_super_admin.models import WebAPIKey


class Command(InteractiveTenantOption, BaseCommand):
    help = "Wrapper around django commands for use with an individual tenant"

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            "-w",
            action='store_true',
            default=False,
            dest="webapitoken",
            help="WEB-API tokens",
        )
        parser.add_argument(
            "-r",
            action='store_true',
            default=False,
            dest="restapitoken",
            help="POEM REST-API token",
        )
        parser.add_argument(
            "-t",
            dest="tenantname",
            help="Tenant name",
            required=True
        )

    def handle(self, *args, **options):
        import ipdb; ipdb.set_trace()

        tenant = ''

        if options['webapitoken']:
            tenant = self.get_tenant_from_options_or_interactive(schema_name='public')
        elif options['restapitoken']:
            schema_name = options['tenantname'].lower()
            tenant = self.get_tenant_from_options_or_interactive(schema_name=schema_name)
        if tenant:
            connection.set_tenant(tenant)
