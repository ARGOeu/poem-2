#!/usr/bin/env python
import argparse
import datetime
import json

probekey_pks = {}
probeversion_pks = {}


def create_public_file(file):
    with open(file, 'r') as f:
        data = json.load(f)

    new_data = []
    new_history = []
    history_index = 1
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


def create_tenant_file(file):
    with open(file, 'r') as f:
        data = json.load(f)

    new_data = []
    for item in data:
        if item['model'] == 'poem.serviceflavour' or \
                item['model'] == 'poem.metrictype' or \
                item['model'] == 'poem.service':
            new_data.append(item)

        if item['model'] == 'poem.groupofmetrics':
            del item['fields']['metrics']
            item['fields']['permissions'][0] = \
                [p.replace('metrics', 'metric') for p in item['fields']['permissions'][0]]
            item['fields']['permissions'][0] = \
                [p.replace('metricown', 'metricsown') for p in item['fields']['permissions'][0]]
            new_data.append(item)

        if item['model'] == 'users.custuser':
            item['fields']['user_permissions'] = []
            new_data.append(item)

        if item['model'] == 'poem.metricinstance':
            del item['fields']['profile']
            del item['fields']['vo']
            del item['fields']['fqan']
            new_data.append(item)

        if item['model'] == 'poem.metric':
            del item['fields']['tag']
            if item['fields']['probekey']:
                item['fields']['probeversion'] = probeversion_pks[
                    item['fields']['probeversion'].split(' ')[0]
                ]
                item['fields']['probekey'] = probekey_pks[
                    item['fields']['probeversion'].split(' ')[0]
                ]
            new_data.append(item)

        if item['model'] == 'poem.userprofile':
            del item['fields']['groupsofprofiles']
            item['fields']['groupsofmetricprofiles'] = []
            item['fields']['groupsofaggregations'] = []
            new_data.append(item)

    with open('new-' + file, 'w') as f:
        json.dump(new_data, f, indent=2)


def main():
    parser = argparse.ArgumentParser('Helper tool for react-poem')
    parser.add_argument('--public', dest='public', help='input public file',
                        type=str, required=True)
    parser.add_argument('--egi', dest='egi', help='input file for EGI tenant',
                        type=str, required=True)
    parser.add_argument('--eudat', dest='eudat', type=str, required=True,
                        help='input file for EUDAT tenant')
    parser.add_argument('--sdc', dest='sdc', help='input file for SDC tenant',
                        type=str, required=True)
    parser.add_argument('--ni4os', dest='ni4os', type=str, required=True,
                        help='input file for NI4OS tenant')
    args = parser.parse_args()

    file0 = args.public
    file1 = args.egi
    file2 = args.eudat
    file3 = args.sdc
    file4 = args.ni4os

    create_public_file(file0)
    create_tenant_file(file1)
    create_tenant_file(file2)
    create_tenant_file(file3)
    create_tenant_file(file4)


main()
