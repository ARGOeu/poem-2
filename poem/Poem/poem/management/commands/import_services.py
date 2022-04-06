from configparser import NoOptionError, NoSectionError

from Poem.helpers.metrics_helpers import import_metrics
from Poem.poem.management.commands.poem_superuser import tenant_superuser
from Poem.poem_super_admin import models as admin_models
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = """Import set of internal metrics to tenant."""

    def __init__(self):
        super().__init__()

    def add_arguments(self, parser):
        parser.add_argument('--schema', dest='schemaname', help='Tenant schema name')
        parser.add_argument('--json', dest='json', help='JSON file with services data')

    def handle(self, *args, **kwargs):
        pass
