import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Poem.settings')
django.setup()

from django.conf import settings
import logging

from Poem.poem.models import MetricInstance
from Poem.tenants.models import Tenant

import requests
from requests.exceptions import HTTPError

from Poem.api.models import MyAPIKey

from tenant_schemas.utils import schema_context, get_public_schema_name

logging.basicConfig(
    format='%(filename)s[%(process)s]: %(levelname)s %(message)s',
    level=logging.INFO
)
logger = logging.getLogger('POEM')


def main():
    schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
    schemas.remove(get_public_schema_name())

    for schema in schemas:
        with schema_context(schema):
            token = MyAPIKey.objects.get(name='WEB-API')

            headers = {'Accept': 'application/json', 'x-api-key': token.token}

            try:
                response = requests.get(settings.WEBAPI_METRIC,
                                        headers=headers,
                                        timeout=180)
                response.raise_for_status()
            except HTTPError as http_error:
                logger.error(
                    '%s: HTTP error occured: %s' % (schema.upper(), http_error)
                )
                continue

            try:
                data = response.json()['data']
            except Exception as e:
                logger.error(
                    '%s: Error parsing data: %s' % (schema.upper(), e)
                )
                continue

            miindb = set(
                [
                    (mi.service_flavour, mi.metric)
                    for mi in MetricInstance.objects.all()
                ]
            )

            miweb = set()
            for item in data:
                for s in item['services']:
                    for m in s['metrics']:
                        miweb.add((s['service'], m))

            if len(miweb.difference(miindb)) != 0:
                for mi in miweb.difference(miindb):
                    try:
                        MetricInstance.objects.create(
                            service_flavour=mi[0],
                            metric=mi[1]
                        )
                    except Exception as e:
                        logger.error(
                            '%s: database operations failed: %s'
                            % (schema.upper(), e)
                        )
                        continue

                logger.info(
                    '%s: Added %d metric instances'
                    % (schema.upper(), len(miweb.difference(miindb)))
                )

            else:
                logger.info(
                    "%s: MetricInstance database is up to date" % schema.upper()
                )


main()
