from django.conf import settings # import the settings file
from django.db import connection

from configparser import ConfigParser


def admin_settings(context):
    """
    Simple context processor that adds settings.POEM_NAMESPACE to templates.
    """
    tenant = connection.tenant.name

    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    # return the value you want as a dictionnary. you may add multiple values in there.
    return {'POEM_NAMESPACE': config.get('GENERAL_' + tenant.upper(),
                                          'namespace') }