from django.contrib.contenttypes.models import ContentType

import json

from Poem.api.models import MyAPIKey
from Poem.helpers.history_helpers import create_metricprofile_history
from Poem.poem import models as poem_models

import requests


def one_value_inline(input):
    if input:
        return json.loads(input)[0]
    else:
        return ''


def two_value_inline(input):
    results = []

    if input:
        data = json.loads(input)

        for item in data:
            if len(item.split(' ')) == 1:
                results.append({
                    'key': item.split(' ')[0],
                    'value': ''
                })
            else:
                val = ' '.join(item.split(' ')[1:])
                results.append(({'key': item.split(' ')[0],
                                 'value': val}))

    return results


def inline_metric_for_db(data):
    result = []

    for item in data:
        if item['key']:
            result.append('{} {}'.format(item['key'], item['value']))

    if result:
        return json.dumps(result)

    else:
        return ''


def two_value_inline_dict(input):
    results = dict()

    if input:
        data = json.loads(input)

        for item in data:
            if len(item.split(' ')) == 1:
                results.update({item.split(' ')[0]: ''})
            else:
                val = ' '.join(item.split(' ')[1:])
                results.update(({item.split(' ')[0]: val}))

    return results


def sync_webapi(api, model):
    token = MyAPIKey.objects.get(name="WEB-API")

    headers = {'Accept': 'application/json', 'x-api-key': token.token}
    response = requests.get(api,
                            headers=headers,
                            timeout=180)
    response.raise_for_status()
    data = response.json()['data']

    data_api = set([p['id'] for p in data])
    data_db = set(model.objects.all().values_list('apiid', flat=True))
    entries_not_indb = data_api.difference(data_db)

    new_entries = []
    for p in data:
        if p['id'] in entries_not_indb:
            new_entries.append(
                dict(name=p['name'], apiid=p['id'], groupname='')
            )

    if new_entries:
        for entry in new_entries:
            instance = model.objects.create(**entry)

            if isinstance(instance, poem_models.MetricProfiles):
                services = []
                for item in data:
                    if item['id'] == instance.apiid:
                        for service in item['services']:
                            for metric in service['metrics']:
                                services.append(
                                    dict(
                                        service=service['service'],
                                        metric=metric
                                    )
                                )
                create_metricprofile_history(instance, services, 'poem')

    entries_deleted_onapi = data_db.difference(data_api)
    for p in entries_deleted_onapi:
        instance = model.objects.get(apiid=p)
        poem_models.TenantHistory.objects.filter(
            object_id=instance.id,
            content_type=ContentType.objects.get_for_model(model)
        ).delete()
        instance.delete()

