#!/usr/bin/env python
import argparse
import datetime
import json


def create_public_file(file):
    with open(file, 'r') as f:
        data = json.load(f)

    new_data = []
    new_history = []
    history_index = 1
    probekey_pks = {}
    probeversion_pks = {}
    for item in data:
        if item['model'] == 'poem_super_admin.probe':
            item['fields']['datetime'] = datetime.datetime.now().strftime(
                '%Y-%m-%dT%H:%M:%S.%f'
            )[:-3]
            new_data.append(item)
            new_history.append(
                {
                    'model': 'poem_super_admin.history',
                    'pk': history_index,
                    'fields': {
                        'object_id': str(item['pk']),
                        'serialized_data': json.dumps([item]),
                        'object_repr': item['fields']['nameversion'],
                        'content_type': [
                            'poem_super_admin',
                            'probe'
                        ],
                        'date_created': datetime.datetime.now().strftime(
                            '%Y-%m-%dT%H:%M:%S.%f'
                        )[:-3],
                        'comment': 'Initial version.',
                        'user': 'poem'
                    }
                }
            )

            probeversion_pks.update(
                {
                    item['fields']['name']: item['fields']['nameversion']
                }
            )

            probekey_pks.update(
                {
                    item['fields']['name']: history_index
                }
            )

            history_index += 1

    new_data = new_data + new_history

    mt_names = []
    for item in data:
        if item['model'] == 'users.custuser' or \
                item['model'] == 'poem_super_admin.metrictemplatetype':
            new_data.append(item)

        if item['model'] == 'poem_super_admin.metrictemplate':
            if item['fields']['probekey']:
                item['fields']['probeversion'] = probeversion_pks[
                    item['fields']['probeversion'].split(' ')[0]
                ]
                item['fields']['probekey'] = probekey_pks[
                    item['fields']['probeversion'].split(' ')[0]
                ]
            if item['fields']['name'] not in mt_names:
                new_data.append(item)
                mt_names.append(item['fields']['name'])

    with open('new-' + file, 'w') as f:
        json.dump(new_data, f, indent=2)


def main():
    parser = argparse.ArgumentParser('Helper tool for react-poem')
    parser.add_argument('--public', dest='public', help='input public file',
                        type=str, required=True)
    args = parser.parse_args()

    file0 = args.public

    create_public_file(file0)


main()
