from Poem.tenants.models import Tenant
from django.core.management.base import BaseCommand
from django_tenants.utils import get_public_schema_name

class Command(BaseCommand):
    help = """Lists all tenants."""

    def handle(self, *args, **kwargs):
        tenants = Tenant.objects.all().values_list('name', flat=True)
        for tenant in tenants:
            print(tenant)
