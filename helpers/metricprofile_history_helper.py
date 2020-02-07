#!/usr/bin/env python
import os
import django
import json
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Poem.settings')
django.setup()

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core import serializers

from Poem.api.models import MyAPIKey
from Poem.helpers.history_helpers import create_comment
from Poem.poem import models as poem_models
from Poem.tenants.models import Tenant

from tenant_schemas.utils import schema_context, get_public_schema_name


schemas = list(Tenant.objects.all().values_list('schema_name', flat=True))
schemas.remove(get_public_schema_name())


def flatten_services(services):
    flat_services = []

    for service in services:
        for metric in service["metrics"]:
            flat_services.append([service["service"], metric])

    return flat_services


def create_metricprofile_initial_history():
    for schema in schemas:
        with schema_context(schema):
            token = MyAPIKey.objects.get(name='WEB-API')

            headers = {'Accept': 'application/json', 'x-api-key': token.token}

            response = requests.get(
                settings.WEBAPI_METRIC, headers=headers
            )

            data = response.json()['data']

            profiles = poem_models.MetricProfiles.objects.all()

            for profile in profiles:
                for item in data:
                    if item["id"] == profile.apiid:
                        serialized_data = json.loads(
                            serializers.serialize(
                                'json', [profile],
                                use_natural_foreign_keys=True,
                                use_natural_primary_keys=True
                            )
                        )
                        serialized_data[0]["fields"].update({
                            "metricinstances": flatten_services(
                                item["services"]
                            )
                        })

                        comment = create_comment(
                            profile,
                            ContentType.objects.get_for_model(profile),
                            json.dumps(serialized_data)
                        )

                        poem_models.TenantHistory.objects.create(
                            object_id=profile.id,
                            serialized_data=json.dumps(serialized_data),
                            object_repr=profile.__str__(),
                            comment=comment,
                            user='poem',
                            content_type=ContentType.objects.get_for_model(
                                profile
                            )
                        )


def main():
    create_metricprofile_initial_history()


main()
