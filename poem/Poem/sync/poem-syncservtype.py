import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Poem.settings')
django.setup()

import logging
import os
import requests

from django.conf import settings
from Poem.poem import models
from Poem.tenants.models import Tenant
from xml.etree import ElementTree
from configparser import ConfigParser

from tenant_schemas.utils import schema_context, get_public_schema_name

logging.basicConfig(
    format='%(filename)s[%(process)s]: %(levelname)s %(message)s',
    level=logging.INFO
)
logger = logging.getLogger("POEM")


def tenant_servtype_data(tenant):
    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    HTTPAUTH = config.getboolean('SYNC_' + tenant.upper(), 'useplainhttpauth')
    HTTPUSER = config.get('SYNC_' + tenant.upper(), 'httpuser')
    HTTPPASS = config.get('SYNC_' + tenant.upper(), 'httppass')
    SERVICETYPE_URL = config.get('SYNC_' + tenant.upper(), 'servicetype')

    return {'HTTPAUTH': HTTPAUTH, 'HTTPUSER': HTTPUSER, 'HTTPPASS': HTTPPASS,
            'SERVICETYPE_URL': SERVICETYPE_URL}


def main():
    """Parses service flavours list from GOCDB"""

    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    for schema in schemas:
        with schema_context(schema):
            tenant = Tenant.objects.get(schema_name=schema)
            data = tenant_servtype_data(tenant.name)

            url = data['SERVICETYPE_URL']

            try:
                if data['HTTPAUTH']:
                    req = requests.get(
                        url, auth=(data['HTTPUSER'], data['HTTPPASS'])
                    )

                else:
                    if url.startswith('https'):
                        req = requests.get(
                            url,
                            timeout=60
                        )
                    else:
                        req = requests.get(url)

                ret = req.content

            except Exception as e:
                print("%s: Error service flavours feed - %s" % (
                    schema.upper(), repr(e)))
                logger.error("%s: Error service flavours feed - %s" % (
                    schema.upper(), repr(e)))
                continue

            try:
                root = ElementTree.XML(ret)
            except Exception as e:
                logger.error("%s: Error parsing service flavours - %s" % (
                    schema.upper(), e))
                continue

            elements = root.findall("SERVICE_TYPE")
            if not elements:
                logger.error(
                    "%s: Error parsing service flavours" % schema.upper()
                )
                continue

            feed_list = []
            for element in elements:
                element_list = {}
                if list(element):
                    for child_element in list(element):
                        element_list[str(child_element.tag).lower()] = \
                            child_element.text
                feed_list.append(element_list)

            sfindb = set(
                [
                    (
                        sf.name,
                        sf.description
                    )
                    for sf in models.ServiceFlavour.objects.all()
                ]
            )
            sfs = set(
                [
                    (
                        feed['service_type_name'],
                        feed['service_type_desc']
                    )
                    for feed in feed_list
                ]
            )
            if sfindb != sfs:
                for s in sfs.difference(sfindb):
                    try:
                        service_flavour, created = \
                            models.ServiceFlavour.objects.get_or_create(
                                name=s[0]
                            )
                        if not created:
                            service_flavour.description = s[1]
                            service_flavour.save()

                    except Exception as e:
                        logger.error(
                            "%s: database operations failed - %s"
                            % (schema.upper(), e))

                logger.info(
                    "%s: Added/updated %d service flavours"
                    % (schema.upper(), len(sfs.difference(sfindb))))

            else:
                logger.info(
                    "%s: Service Flavours database is up to date"
                    % schema.upper()
                )


main()
