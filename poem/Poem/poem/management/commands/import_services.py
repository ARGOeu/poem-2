from django.core.management.base import BaseCommand
import json

from django_tenants.utils import schema_context, get_public_schema_name

class Command(BaseCommand):
    help = """Import set of service names and descriptions."""

    def __init__(self):
        super().__init__()

    def add_arguments(self, parser):
        parser.add_argument('--schema', dest='schemaname', help='Tenant schema name')
        parser.add_argument('--json', dest='json', help='JSON file with services data')

    def handle(self, *args, **kwargs):
        with open(kwargs['json']) as jsonfile:
            raw = jsonfile.read()
            services = json.loads(raw)
