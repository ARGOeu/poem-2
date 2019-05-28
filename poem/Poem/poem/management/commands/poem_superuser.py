from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import DEFAULT_DB_ALIAS, connection
from django.db.utils import IntegrityError

from configparser import ConfigParser

# based on django/contrib/auth/management/commands/createsuperuser.py

def tenant_superuser():
    tenant = connection.tenant.name

    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    SUPERUSER_NAME = config.get('SUPERUSER_' + tenant.upper(), 'name')
    SUPERUSER_PASS = config.get('SUPERUSER_' + tenant.upper(), 'password')
    SUPERUSER_EMAIL = config.get('SUPERUSER_' + tenant.upper(), 'email')

    return {'SUPERUSER_NAME': SUPERUSER_NAME, 'SUPERUSER_PASS':
        SUPERUSER_PASS, 'SUPERUSER_EMAIL': SUPERUSER_EMAIL}


class Command(BaseCommand):
    help = 'Used to create a superuser.'
    requires_migrations_checks = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.UserModel = get_user_model()

    def handle(self, *args, **kwargs):
        data = tenant_superuser()
        user_data = dict()

        user_data[self.UserModel.USERNAME_FIELD] = data['SUPERUSER_NAME']
        user_data['password'] = data['SUPERUSER_PASS']
        user_data['email'] = data['SUPERUSER_EMAIL']

        try:
            self.UserModel._default_manager.db_manager(DEFAULT_DB_ALIAS).create_superuser(**user_data)
            self.stdout.write("Superuser created successfully.")
        except IntegrityError:
            self.stderr.write("Superuser already created.")
