#!/usr/bin/env python
import argparse
import json


def users_data(inputdata):
    data = inputdata.copy()
    for item in data:
        if item['model'] == 'poem.custuser':
            item['model'] = 'users.custuser'

    perms = {}
    for item in data:
        if item['model'] == 'users.custuser':
            try:
                perms.update(
                    {
                        item['fields']['username']: {
                            'groupsofmetrics': item['fields'][
                                'groupsofmetrics'],
                            'groupsofaggregations': item['fields'][
                                'groupsofaggregations']
                        }
                    }
                )
                del item['fields']['groupsofaggregations']
            except KeyError:
                perms.update(
                    {
                        item['fields']['username']: {
                            'groupsofprofiles': item['fields'][
                                'groupsofprofiles'],
                            'groupsofmetrics': item['fields'][
                                'groupsofmetrics']
                        }
                    }
                )
            del item['fields']['groupsofprofiles']
            del item['fields']['groupsofmetrics']
            del item['fields']['groupsofprobes']

        if item['model'] == 'poem.metricinstance':
            del item['fields']['profile']
            del item['fields']['vo']
            del item['fields']['fqan']

    for key, value in perms.items():
        for item in data:
            if item['model'] == 'poem.userprofile' and \
                item['fields']['user'] == [key]:
                item['fields'].update(value)


    new_data = []
    for item in data:
        if item['model'] == 'poem.profile' or \
                item['model'] == 'poem.vo' or \
                item['model'] == 'poem.groupofprofiles':
            pass
        else:
            new_data.append(item)

    return new_data


def main():
    parser = argparse.ArgumentParser('Helper tool that converts .json files '
                                     'containing old db data into .json file '
                                     'which reflects changes in the db')
    parser.add_argument('-i', dest='input', type=str, required=True,
                        help='input file')
    parser.add_argument('-o', dest='output', type=str, required=True,
                        help='output file')
    args = parser.parse_args()

    input_file = args.input
    output_file = args.output

    with open(input_file, 'r') as f:
        data = json.load(f)

    new_data = users_data(data)

    with open(output_file, 'w') as f:
        json.dump(new_data, f, indent=2)


main()
