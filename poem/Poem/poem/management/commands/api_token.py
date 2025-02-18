from django.core.management.base import BaseCommand
from django_tenants.management.commands import InteractiveTenantOption
from django.db import connection

from Poem.api.models import MyAPIKey
from Poem.poem_super_admin.models import WebAPIKey

import datetime


class Command(InteractiveTenantOption, BaseCommand):
    help = "Create or set tokens for POEM REST API and store WEB-API tokens for specified tenant"

    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(help="Token management subcommands", dest="command")

        parser.add_argument("-s", dest="schemaname", help="PostgreSQL schema name", required=False)

        parser_restapi = subparsers.add_parser("restapi", help="REST-API token management")
        parser_webapi = subparsers.add_parser("webapi", help="WEB-API token management")

        parser_restapi.add_argument(
            "-t",
            dest="tenantname",
            help="Tenant name",
        )
        parser_restapi.add_argument(
            "-k",
            dest="token",
            help="Token value",
        )

        parser_webapi.add_argument(
            "-t",
            dest="tenantname",
            help="Tenant name",
        )
        parser_webapi.add_argument(
            "-ko",
            dest="tokenreadonly",
            help="Read-only token value",
        )
        parser_webapi.add_argument(
            "-kw",
            dest="tokenreadwrite",
            help="Read-write token value",
        )

    def _token_crud(self, model, tokenname, token):
        try:
            obj = model.objects.get(name=tokenname)
            if obj and token:
                obj.delete()
                api_token, token = model.objects.create_key(**{
                    'name': tokenname,
                    'token': token,
                    'created': datetime.datetime.now()
                })
                self.stdout.write(self.style.WARNING(f"Token {api_token.name} recreated with value {api_token.token}"))
            elif obj:
                self.stdout.write(self.style.ERROR_OUTPUT(f"Token {obj.name} already created"))

        except model.DoesNotExist:
            if token:
                api_token, token = model.objects.create_key(**{
                    'name': tokenname,
                    'token': token
                })
                self.stdout.write(self.style.NOTICE(f"Token {api_token.name} created with value {api_token.token}"))
            else:
                api_token, token = model.objects.create_key(**{
                    'name': tokenname,
                })
                self.stdout.write(self.style.NOTICE(f"Token {api_token.name} created with value {api_token.token}"))

    def _set_restapi_token(self, options):
        self._token_crud(MyAPIKey, options['tenantname'].upper(), options['token'])

    def _set_webapi_token(self, options):
        self._token_crud(WebAPIKey, f"WEB-API-{options['tenantname'].upper()}", options['tokenreadwrite'])
        self._token_crud(WebAPIKey, f"WEB-API-{options['tenantname'].upper()}-RO", options['tokenreadonly'])

    def handle(self, *args, **options):
        if options.get('schemaname', None):
            tenant = self.get_tenant_from_options_or_interactive(schema_name=options.get('schemaname'))
            connection.set_tenant(tenant)

            if options['command'] == 'webapi':
                self._set_webapi_token(options)

            elif options['command'] == 'restapi':
                self._set_restapi_token(options)

        else:
            if options['command'] == 'webapi':
                tenant = self.get_tenant_from_options_or_interactive(schema_name='public')
                connection.set_tenant(tenant)
                self._set_webapi_token(options)

            elif options['command'] == 'restapi':
                schema_name = options['tenantname'].lower()
                tenant = self.get_tenant_from_options_or_interactive(schema_name=schema_name)
                connection.set_tenant(tenant)
                self._set_restapi_token(options)
