from distutils.sysconfig import get_python_lib
from configparser import ConfigParser

import saml2
from saml2.config import SPConfig

from django.conf import settings
from django.db import connection

from django_tenants.utils import remove_www


def tenant_from_request(request):
    return request.tenant.name.lower()


def get_schemaname():
    return connection.schema_name


def get_hostname(request):
    return remove_www(request.get_host().split(':')[0]).lower()


def service_name_conf(tenant):
    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    return config.get('GENERAL_' + tenant.upper(), 'samlservicename')


def saml_login_string(tenant):
    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    return config.get('GENERAL_' + tenant.upper(), 'samlloginstring')


def get_saml_config(request):
    tenant = tenant_from_request(request)
    hostname = get_hostname(request)

    config = {
        'xmlsec_binary': '/usr/bin/xmlsec1',
        'entityid': 'https://%s/saml2/metadata/' % hostname,
        'allow_unknown_attributes': 'true',
        'debug': 1,
        'service': {
            'sp': {
                'name': service_name_conf(tenant),
                'want_assertions_signed': 'true',
                'endpoints': {
                    'assertion_consumer_service': [
                        ('https://%s/saml2/acs/' % hostname,
                         saml2.BINDING_HTTP_POST),
                    ],
                    'single_logout_service': [
                        ('https://%s/saml2/ls/' % hostname,
                         saml2.BINDING_HTTP_REDIRECT),
                    ],
                },
                'attribute_map_dir': '%s/saml2/attributemaps/' %
                                     get_python_lib(),
            },
        },
        'key_file': settings.HOST_KEY,  # private part
        'cert_file': settings.HOST_CERT,  # public part
        'metadata': {
            'local': ['{}/etc/poem/metadata-{}.xml'.format(settings.VENV,
                                                           tenant)]
        }
    }

    return SPConfig().load(config)
