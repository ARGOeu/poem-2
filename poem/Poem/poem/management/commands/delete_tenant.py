from Poem.tenants.models import Tenant
from django.core.management.base import BaseCommand
from tenant_schemas.utils import get_public_schema_name


class Command(BaseCommand):
    help = """Delete tenant with given name."""

    def add_arguments(self, parser):
        parser.add_argument('--name', required=True, type=str)

    def handle(self, *args, **kwargs):
        name = kwargs['name']
        schema = name.lower()  # all the tenants schemas are named according to
        # this convention

        if schema == get_public_schema_name():
            raise Exception('You cannot delete public schema!')

        else:
            try:
                tenant = Tenant.objects.get(schema_name=schema)
                tenant.delete(force_drop=True)

            except Tenant.DoesNotExist:
                raise Exception(
                    'Tenant with name {} does not exist'.format(name)
                )
