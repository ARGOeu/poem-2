#!/usr/bin/env python
import argparse
import datetime
import json


def create_mt_history(file):
    with open(file, 'r') as f:
        data = json.load(f)

    mt_data = []
    history_pks = []
    for item in data:
        if item['model'] == 'poem_super_admin.history':
            history_pks.append(item['pk'])

    history_pk = max(history_pks)
    for item in data:
        if item['model'] == 'poem_super_admin.metrictemplate':
            history_pk += 1
            mt_data.append(
                {
                    'model': 'poem_super_admin.history',
                    'pk': history_pk,
                    'fields': {
                        'object_id': str(item['pk']),
                        'serialized_data': json.dumps([item]),
                        'object_repr': item['fields']['name'],
                        'content_type': [
                            'poem_super_admin',
                            'metrictemplate'
                        ],
                        'date_created': datetime.datetime.now().strftime(
                            '%Y-%m-%dT%H:%M:%S.%f'
                        )[:-3],
                        'comment': 'Initial version.',
                        'user': 'poem'
                    }
                }
            )

    with open('metrictemplate-history-file.json', 'w') as f:
        json.dump(mt_data, f, indent=2)


def main():
    parser = argparse.ArgumentParser('Helper tool for Metric template history')
    parser.add_argument('--public', dest='public', help='input public file',
                        type=str, required=True)
    args = parser.parse_args()

    file = args.public

    create_mt_history(file)


main()
