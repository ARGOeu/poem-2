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
                    item['fields']['nameversion']: history_index
                }
            )

            history_index += 1

    new_data = new_data + new_history

    for item in data:
        if item['model'] == 'users.custuser' or \
                item['model'] == 'poem_super_admin.metrictemplatetype' or \
                item['model'] == 'poem_super_admin.metrictemplate' or \
                item['model'] == 'reversion.revision' or \
                item['model'] == 'reversion.version':
            new_data.append(item)

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
