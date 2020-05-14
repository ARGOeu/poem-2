from configparser import ConfigParser, NoSectionError, NoOptionError

from Poem.poem.models import UserProfile
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import DEFAULT_DB_ALIAS, connection
from django.db.utils import IntegrityError
from tenant_schemas.utils import get_public_schema_name


def tenant_superuser():
    tenant = connection.tenant.name

    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    superuser_name = config.get('SUPERUSER_' + tenant.upper(), 'name')
    superuser_pass = config.get('SUPERUSER_' + tenant.upper(), 'password')
    superuser_email = config.get('SUPERUSER_' + tenant.upper(), 'email')

    return {
        'SUPERUSER_NAME': superuser_name,
        'SUPERUSER_PASS': superuser_pass,
        'SUPERUSER_EMAIL': superuser_email
    }


class Command(BaseCommand):
    # based on django/contrib/auth/management/commands/createsuperuser.py
    help = 'Used to create a superuser.'
    requires_migrations_checks = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.UserModel = get_user_model()

    def handle(self, *args, **kwargs):
        try:
            data = tenant_superuser()

            user_data = dict()
            user_data[self.UserModel.USERNAME_FIELD] = data['SUPERUSER_NAME']
            user_data['password'] = data['SUPERUSER_PASS']
            user_data['email'] = data['SUPERUSER_EMAIL']

            user = self.UserModel._default_manager.db_manager(
                DEFAULT_DB_ALIAS
            ).create_superuser(**user_data)
            if connection.tenant.schema_name != get_public_schema_name():
                UserProfile.objects.create(user=user)
            self.stdout.write("Superuser created successfully.")

        except IntegrityError:
            self.stderr.write("Superuser already created.")

        except NoSectionError:
            self.stderr.write(
                "No SUPERUSER_{} section in config file.".format(
                    connection.tenant.name.upper()
                )
            )

        except NoOptionError as err:
            self.stderr.write("Config file: {}".format(str(err)))
