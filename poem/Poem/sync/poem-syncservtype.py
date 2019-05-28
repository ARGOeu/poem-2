import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Poem.settings')
django.setup()

import Poem.django_logging
import base64
import logging
import os
import requests

from requests.auth import HTTPBasicAuth

from Poem import settings
from Poem.poem import models
from Poem.tenants.models import Tenant
from xml.etree import ElementTree
from configparser import ConfigParser

from tenant_schemas.utils import schema_context, get_public_schema_name

logging.basicConfig(format='%(filename)s[%(process)s]: %(levelname)s %(message)s', level=logging.INFO)
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
    "Parses service flavours list from GOCDB"

    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    for schema in schemas:
        with schema_context(schema):
            tenant = Tenant.objects.get(schema_name=schema)
            data = tenant_servtype_data(tenant.name)

            Feed_List = None
            fos = []

            try:
                for fp in [settings.HOST_CERT, settings.HOST_KEY]:
                    if not os.path.exists(fp):
                        raise IOError("invalid path %s" % (fp))
                    else:
                        fos.append(open(fp))
            except IOError as e:
                logger.error(e)
                raise SystemExit(1)
            for fo in fos:
                fo.close()

            url = data['SERVICETYPE_URL']

            try:
                if data['HTTPAUTH']:
                    req = requests.get(url, cert=(settings.HOST_CERT,
                                                 settings.HOST_KEY),
                                      auth=(data['HTTPUSER'], data['HTTPPASS']),
                                      timeout=60)

                else:
                    if url.startswith('https'):
                        req = requests.get(
                            url,
                            cert=(settings.HOST_CERT, settings.HOST_KEY),
                            timeout=60
                        )
                    else:
                        req = requests.get(url)

                ret = req.content

            except Exception as e:
                logger.error("%s: Error service flavours feed - %s" % (
                    schema.upper(), repr(e)))
                continue

            try:
                Root = ElementTree.XML(ret)
            except Exception as e:
                logger.error("%s: Error parsing service flavours - %s" % (
                    schema.upper(), e))
                continue

            elements = Root.findall("SERVICE_TYPE")
            if not elements:
                logger.error("%s: Error parsing service flavours"
                             % schema.upper())
                continue

            Feed_List = []
            for element in elements:
                Element_List = {}
                if element.getchildren():
                    for child_element in element.getchildren():
                        Element_List[str(child_element.tag).lower()] = (child_element.text)
                Feed_List.append(Element_List)

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
                    for feed in Feed_List
                ]
            )
            if sfindb != sfs:
                for s in sfs.difference(sfindb):
                    try:
                        service_flavour, created = models.ServiceFlavour.objects.get_or_create(name=s[0])
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
                logger.info("%s: Service Flavours database is up to date"
                            % schema.upper())

main()
