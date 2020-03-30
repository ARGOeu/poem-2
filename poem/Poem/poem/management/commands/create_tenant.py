from configparser import ConfigParser
from django.conf import settings
from django.core.management.base import BaseCommand

from Poem.tenants.models import Tenant


def create_tenant(name, hostname):
    # if tenant is created for the public schema, tenant name is 'all',
    # otherwise tenant name is the same as schema name
    if name == 'all':
        schema = 'public'
    else:
        schema = name.lower()
    tenant = Tenant(domain_url=hostname, schema_name=schema, name=name)
    tenant.save()


def get_public_schema_hostname():
    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    hostname = config.get('GENERAL_ALL', 'publicpage')

    return hostname


class Command(BaseCommand):
    help = """Create a new tenant with given name"""

    def add_arguments(self, parser):
        parser.add_argument('--name', required=True, type=str)
        parser.add_argument('--hostname', nargs='?', type=str)

    def handle(self, *args, **kwargs):
        name = kwargs['name']
        # since there is no public page (yet), in case of creating public
        # tenant, no hostname is required and a dummy value is used
        if kwargs['hostname']:
            hostname = kwargs['hostname']
        else:
            hostname = get_public_schema_hostname()
        create_tenant(name, hostname)
