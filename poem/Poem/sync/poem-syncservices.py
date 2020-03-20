import logging
import os
from configparser import ConfigParser

import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Poem.settings')
django.setup()

from Poem.poem.models import Service
from Poem.tenants.models import Tenant
from django.conf import settings

from tenant_schemas.utils import schema_context, get_public_schema_name


def tenant_service_url(tenant):
    config = ConfigParser()
    config.read(settings.CONFIG_FILE)

    return config.get('SYNC_' + tenant.upper(), 'services')


logging.basicConfig(format='%(filename)s[%(process)s]: %(levelname)s %('
                           'message)s', level=logging.INFO)
logger = logging.getLogger('POEM')


def main():
    """Parses service category, services and service types from eosc-hub api."""

    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    for schema in schemas:
        with schema_context(schema):
            tenant = Tenant.objects.get(schema_name=schema)
            try:
                r = requests.get(tenant_service_url(tenant.name))
            except Exception as e:
                logger.error('%s: Request - %s' % (schema.upper(), repr(e)))
                continue
            try:
                feed = r.json()
            except Exception as e:
                logger.error('%s: Error parsing data: %s' % (schema.upper(), e))
                continue

            feedset = set()
            for f in feed:
                feedset.add((f['id'], f['service_id'], f['service_name'],
                            f['service_category'], f['service_version'],
                            f['service_type'], f['component_version'],
                            f['component_name'],
                            f['visible_to_marketplace'], f['in_catalogue'],
                            f['external_service'], f['internal_service'],))

            servindb = Service.objects.all()
            servindbset = set()
            for serv in servindb:
                servindbset.add((serv.id, serv.service_id,
                                serv.service_name, serv.service_category,
                                serv.service_version, serv.service_type,
                                serv.component_version,
                                serv.component_name,
                                serv.visible_to_marketplace,
                                serv.in_catalogue, serv.external_service,
                                serv.internal_service,))

            if servindbset != feedset:
                try:
                    if len(servindbset.difference(feedset)):
                        for serv in servindbset.difference(feedset):
                            Service.objects.filter(
                                id=serv[0],
                                service_id=serv[1],
                                service_name=serv[2],
                                service_category=serv[3],
                                service_version=serv[4],
                                service_type=serv[5],
                                component_version=serv[6],
                                component_name=serv[7],
                                visible_to_marketplace=serv[8],
                                in_catalogue=serv[9],
                                external_service=serv[10],
                                internal_service=serv[11]
                            ).delete()
                        logger.info(
                            "%s: Deleted %d services."
                            % (schema.upper(),
                               len(servindbset.difference(feedset)))
                        )

                    if len(feedset.difference(servindbset)) > 0:
                        for serv in feedset.difference(servindbset):
                            Service.objects.create(
                                id=serv[0],
                                service_id=serv[1],
                                service_name=serv[2],
                                service_category=serv[3],
                                service_version=serv[4],
                                service_type=serv[5],
                                component_version=serv[6],
                                component_name=serv[7],
                                visible_to_marketplace=serv[8],
                                in_catalogue=serv[9],
                                external_service=serv[10],
                                internal_service=serv[11]
                            )
                        logger.info(
                            "%s: Added %d services"
                            % (schema.upper(),
                               len(feedset.difference(servindbset)))
                        )

                except Exception as e:
                    logger.error(
                        "%s: database operations failed - %s"
                        % (schema.upper(), e)
                    )
            else:
                logger.info(
                    "%s: Service database is up to date" % schema.upper()
                )


main()
