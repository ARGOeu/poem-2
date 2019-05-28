import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Poem.settings')
django.setup()

import requests
import logging
from Poem import settings
from Poem.poem import models
from Poem.tenants.models import Tenant
from xml.etree import ElementTree
from tenant_schemas.utils import schema_context, get_public_schema_name
from configparser import ConfigParser

logging.basicConfig(format='%(filename)s[%(process)s]: %(levelname)s %(message)s', level=logging.INFO)
logger = logging.getLogger("POEM")


def tenant_vo_url(tenant):
    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    return config.get('SYNC_' + tenant.upper(), 'vo')


def main():
    "Parses VO list provided by CIC portal"

    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    for schema in schemas:
        with schema_context(schema):
            tenant = Tenant.objects.get(schema_name=schema)

            try:
                ret = requests.get(tenant_vo_url(tenant.name),
                                   timeout=60).content
            except Exception as e:
                logger.error('%s: VO card - '+'%s' % (schema.upper(), e))
                continue
            try:
                Root = ElementTree.XML(ret)
                idcards = Root.findall("IDCard")
            except Exception as e:
                logger.error('%s: Could not parse VO card - %s' % (
                    schema.upper(), e))
                continue
            if len(idcards) > 0:
                vos = []
                for vo_element in idcards:
                    dict_vo_element = dict(vo_element.items())
                    if 'Name' not in dict_vo_element or 'Status' not in dict_vo_element:
                        logger.warning("%s: vo card does not contain 'Name' "
                                       "and 'Status' attributes for %s"
                                       % (schema.upper(), vo_element))
                    else:
                        if dict_vo_element['Status'].lower() == 'production' and dict_vo_element['Name'] != '':
                            vos.append(dict_vo_element['Name'])
            else:
                logger.error("%s: Error synchronizing VO due to invalid VO "
                             "card" % schema.upper())
                continue

            voindb = set([vo.name for vo in models.VO.objects.all()])
            svos = set([vo for vo in vos])

            if voindb != svos:
                try:
                    if len(svos.difference(voindb)) > 0:
                        for vo in svos.difference(voindb):
                            models.VO.objects.create(name=vo)
                        logger.info(
                            "%s: Added %d VO"
                            % (schema.upper(), len(svos.difference(voindb)))
                        )

                    if len(voindb.difference(svos)) > 0:
                        for vo in voindb.difference(svos):
                            models.VO.objects.filter(name=vo).delete()
                        logger.info(
                            "%s: Deleted %d VO"
                            % (schema.upper(), len(voindb.difference(svos)))
                        )
                except Exception as e:
                    logger.error(
                        "%s: database operations failed - %s"
                        % (schema.upper(), e)
                    )
            else:
                logger.info("%s: VO database is up to date" % schema.upper())

main()
