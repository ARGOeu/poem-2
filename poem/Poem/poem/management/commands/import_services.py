import json
import os

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import schema_context
from django.db import DataError

from Poem.poem import models
from Poem.tenants.models import Tenant


class Command(BaseCommand):
    help = """Import set of service names and descriptions."""

    def __init__(self):
        super().__init__()

    def add_arguments(self, parser):
        parser.add_argument('--schema', dest='schemaname', help='Tenant schema name')
        parser.add_argument('--json', dest='json', help='JSON file with services data')

    def handle(self, *args, **kwargs):
        services = list()

        if not kwargs.get('json', False) or not kwargs.get('schemaname', False):
            raise CommandError("Both arguments should be specified")

        try:
            with open(os.path.expandvars(kwargs['json'])) as jsonfile:
                raw = jsonfile.read()
                services = json.loads(raw)
        except OSError as exc:
            raise CommandError(repr(exc))

        with schema_context(kwargs['schemaname'].lower()):
            try:
                tenant = Tenant.objects.get(schema_name=kwargs['schemaname'].lower())

                models.ServiceFlavour.objects.all().delete()
                bulk = list()
                for service in services:
                    sd = models.ServiceFlavour(name=service['name'], description=service['description'])
                    bulk.append(sd)
                models.ServiceFlavour.objects.bulk_create(bulk)

            except (Tenant.DoesNotExist, DataError) as exc:
                raise CommandError(repr(exc))
