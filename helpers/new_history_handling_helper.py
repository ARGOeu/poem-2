#!/usr/bin/env python
import argparse
import datetime
import json


def create_tenant_file(file):
    new_data = []
    with open(file, 'r') as f:
        data = json.load(f)

    for item in data:
        if item['model'] == 'poem.metric':
            del item['fields']['probeversion']
            if item['fields']['probekey']:
                name = item['fields']['probekey'][0].split(' ')[0]
                version = item['fields']['probekey'][0].split(' ')[1][1:-1]
                if version == '0..4.0':
                    version = '0.4.0'
                item['fields']['probekey'] = [name, version]
            new_data.append(item)

        elif item['model'] == 'poem.tenanthistory':
            serialized_data = json.loads(item['fields']['serialized_data'])[0]
            if serialized_data['fields']['probekey']:
                serialized_data['fields']['probekey'] = [
                    serialized_data['fields']['probekey'][0].split(' ')[0],
                    serialized_data['fields']['probekey'][0].split(' ')[1][1:-1]
                ]
                item['fields']['serialized_data'] = json.dumps(
                    [serialized_data]
                )
            new_data.append(item)

        else:
            new_data.append(item)

    with open('new-' + file, 'wt') as f:
        json.dump(new_data, f, indent=2)


def create_public_file(file):
    new_data = []
    with open(file, 'r') as f:
        data = json.load(f)

    probe_history = []
    metrictemplate_history = []
    for item in data:
        if item['model'] == 'poem_super_admin.metrictemplate':
            del item['fields']['probeversion']
            if item['fields']['probekey']:
                name = item['fields']['probekey'][0].split(' ')[0]
                version = item['fields']['probekey'][0].split(' ')[1][1:-1]
                if version == '0..4.0':
                    version = '0.4.0'
                item['fields']['probekey'] = [name, version]
            new_data.append(item)
            metrictemplate_history.append({
                'model': 'poem_super_admin.metrictemplatehistory',
                'fields': {
                    'object_id': [item['fields']['name']],
                    'name': item['fields']['name'],
                    'mtype': item['fields']['mtype'],
                    'probekey': item['fields']['probekey'],
                    'parent': item['fields']['parent'],
                    'probeexecutable': item['fields']['probeexecutable'],
                    'config': item['fields']['config'],
                    'attribute': item['fields']['attribute'],
                    'dependency': item['fields']['dependency'],
                    'flags': item['fields']['flags'],
                    'files': item['fields']['files'],
                    'parameter': item['fields']['parameter'],
                    'fileparameter': item['fields']['fileparameter'],
                    'date_created': datetime.datetime.strftime(
                        datetime.datetime.now(),
                        '%Y-%m-%dT%H:%M:%S.%f'
                    )[0:-3],
                    'version_comment': 'Initial version.',
                    'version_user': 'poem'
                }
            })

        elif item['model'] == 'poem_super_admin.history' or \
                item['model'] == 'poem_super_admin.extrevision':
            pass

        elif item['model'] == 'poem_super_admin.probe':
            del item['fields']['nameversion']
            new_data.append(item)
            probe_history.append({
                'model': 'poem_super_admin.probehistory',
                'fields': {
                    'object_id': [
                        item['fields']['name'],
                        item['fields']['version']
                    ],
                    'name': item['fields']['name'],
                    'version': item['fields']['version'],
                    'description': item['fields']['description'],
                    'comment': item['fields']['comment'],
                    'repository': item['fields']['repository'],
                    'docurl': item['fields']['docurl'],
                    'date_created': datetime.datetime.strftime(
                        datetime.datetime.now(),
                        '%Y-%m-%dT%H:%M:%S.%f'
                    )[0:-3],
                    'version_comment': 'Initial version.',
                    'version_user': 'poem'
                }
            })

        else:
            new_data.append(item)

    new_data.extend(probe_history)
    new_data.extend(metrictemplate_history)

    with open('new-' + file, 'wt') as f:
        json.dump(new_data, f, indent=2)


def main():
    parser = argparse.ArgumentParser('Helper for new history handling.')
    parser.add_argument('--public', dest='public', type=str, required=True,
                        help='Input file for public schema')
    parser.add_argument('--egi', dest='egi', type=str, required=True,
                        help='Input file for EGI tenant')
    parser.add_argument('--eudat', dest='eudat', type=str, required=True,
                        help='Input file for EUDAT tenant')
    parser.add_argument('--sdc', dest='sdc', type=str, required=True,
                        help='Input file for SDC tenant')
    parser.add_argument('--ni4os', dest='ni4os', type=str, required=True,
                        help='Input file for NI4OS tenant')
    args = parser.parse_args()

    file1 = args.public
    file2 = args.egi
    file3 = args.eudat
    file4 = args.sdc
    file5 = args.ni4os

    create_public_file(file1)

    create_tenant_file(file2)
    create_tenant_file(file3)
    create_tenant_file(file4)
    create_tenant_file(file5)


main()
