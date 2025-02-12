from django.core.management.base import BaseCommand
from django_tenants.management.commands import InteractiveTenantOption
from django.db import connection

from Poem.api.models import MyAPIKey
from Poem.poem_super_admin.models import WebAPIKey

import datetime


class Command(InteractiveTenantOption, BaseCommand):
    help = "Create or set tokens for REST API and store WEB-API tokens for specified tenant"

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
        parser.add_argument(
            "-k",
            dest="token",
            help="Token value",
        )

    def _set_restapi_token(self, options):
        token = None

        try:
            obj = MyAPIKey.objects.get(name=options['tenantname'].upper())
            if obj and options['token']:
                obj.delete()
                api_token, token = MyAPIKey.objects.create_key(**{
                    'name': options['tenantname'].upper(),
                    'token': options['token'],
                    'created': datetime.datetime.now()
                })
                self.stdout.write(self.style.WARNING(f"Token {api_token.name} recreated with value {api_token.token}"))
            elif obj:
                self.stdout.write(self.style.ERROR_OUTPUT(f"Token {obj.name} already created"))

        except MyAPIKey.DoesNotExist:
            if options['token']:
                api_token, token = MyAPIKey.objects.create_key(**{
                    'name': options['tenantname'].upper(),
                    'token': options['token']
                })
                self.stdout.write(self.style.NOTICE(f"Token {api_token.name} created with value {api_token.token}"))
            else:
                api_token, token = MyAPIKey.objects.create_key(**{
                    'name': options['tenantname'].upper(),
                })
                self.stdout.write(self.style.NOTICE(f"Token {api_token.name} created with value {api_token.token}"))

    def _set_webapi_token(self, options):
        pass

    def handle(self, *args, **options):
        tenant = ''

        if options['webapitoken']:
            tenant = self.get_tenant_from_options_or_interactive(schema_name='public')
            connection.set_tenant(tenant)
            self._set_webapi_token(options)

        elif options['restapitoken']:
            schema_name = options['tenantname'].lower()
            tenant = self.get_tenant_from_options_or_interactive(schema_name=schema_name)
            connection.set_tenant(tenant)
            self._set_restapi_token(options)
