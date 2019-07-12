#!/usr/bin/env python
import argparse
import json


def extract_data(data):
    data = data.copy()
    extracted_data = []
    reversion_data = []
    pks = []
    for item in data:
        if item['model'] == 'poem.probe':
            del item['fields']['group']
            item['model'] = 'poem_super_admin.probe'
            extracted_data.append(item)

        elif item['model'] == 'reversion.version':
            if item['fields']['content_type'] == ['poem', 'probe']:
                item['fields']['content_type'] = ['poem_super_admin', 'probe']
                ser_data = json.loads(item['fields']['serialized_data'])
                for d in ser_data:
                    if d['model'] == 'poem.probe':
                        d['model'] = 'poem_super_admin.probe'
                        d['fields']['user'] = 'poem'
                        del d['fields']['group']
                item['fields']['serialized_data'] = json.dumps(ser_data)
                pks.append(item['fields']['revision'])
            reversion_data.append(item)

        elif item['model'] == 'reversion.revision':
            reversion_data.append(item)

    for rev in reversion_data:
        if rev['model'] == 'reversion.version':
            if rev['fields']['content_type'] == ['poem_super_admin', 'probe']:
                extracted_data.append(rev)

        elif rev['model'] == 'reversion.revision':
            if rev['pk'] in pks:
                rev['fields']['user'] = ['poem']
                extracted_data.append(rev)

    for item in data:
        if item['model'] == 'poem.extrevision':
            item['model'] = 'poem_super_admin.extrevision'
            extracted_data.append(item)

    return extracted_data


def create_public_data(d1, d2, d3):
    # extract only data needed in public schema
    data1 = extract_data(d1.copy())
    data2 = extract_data(d2.copy())
    data3 = extract_data(d3.copy())

    names = set()
    probe_pk = 0
    extrev_pk = 0
    revision_pk = 0
    probepks = {}
    revisionpks = {}
    for item in data1:
        if item['model'] == 'poem_super_admin.probe':
            probe_pk += 1
            probepks.update({item['pk']: probe_pk})
            item['pk'] = probe_pk
            names.add(item['fields']['name'])

        if item['model'] == 'reversion.revision':
            revision_pk += 1
            revisionpks.update({item['pk']: revision_pk})
            item['pk'] = revision_pk

    version_pk = 0
    versionpks = {}
    namevers = {}
    # update reversion.version table
    for item in data1:
        if item['model'] == 'reversion.version':
            if item['fields']['content_type'] == ['poem_super_admin', 'probe']:
                ser_data = json.loads(item['fields']['serialized_data'])
                for d in ser_data:
                    d['pk'] = probepks[int(item['fields']['object_id'])]
                    if d['fields']['name'] in namevers:
                        namevers[d['fields']['name']].append(
                            d['fields']['version']
                        )
                    else:
                        namevers[d['fields']['name']] = [d['fields']['version']]
                item['fields']['serialized_data'] = json.dumps(ser_data)
                item['fields']['object_id'] = \
                    str(probepks[int(item['fields']['object_id'])])

            version_pk += 1
            versionpks.update({item['pk']: version_pk})
            item['pk'] = version_pk
            item['fields']['revision'] = \
                revisionpks[item['fields']['revision']]

    # update extrevision table
    for item in data1:
        if item['model'] == 'poem_super_admin.extrevision':
            extrev_pk += 1
            item['fields']['probeid'] = probepks[item['fields']['probeid']]
            item['fields']['revision'] = revisionpks[item['fields']['revision']]
            item['pk'] = extrev_pk

    data = data1

    for dat in [data2, data3]:
        # reset dicts
        probepks = {}
        versionpks = {}
        revisionpks = {}
        new_names = set()
        new_vers = {}

        for item in dat:
            if item['model'] == 'poem_super_admin.probe' and \
                item['fields']['name'] not in names:
                probe_pk += 1
                probepks.update({item['pk']: probe_pk})
                item['pk'] = probe_pk
                new_names.add(item['fields']['name'])
                data.append(item)

            if item['model'] == 'poem_super_admin.probe' and \
                item['fields']['name'] in names and \
                item['fields']['version'] not in \
                    namevers[item['fields']['name']]:
                for i in data:
                    if i['model'] == 'poem_super_admin.probe' and \
                        i['fields']['name'] == item['fields']['name']:
                        i['fields'].update(item['fields'])
                        probepks.update({item['pk']: i['pk']})

        used_revisions = []
        for item in dat:
            if item['model'] == 'reversion.version':
                dd = json.loads(item['fields']['serialized_data'])[0]['fields']
                if dd['name'] not in names or \
                        (dd['name'] in names and
                         dd['version'] not in namevers[dd['name']]):
                    used_revisions.append(item['fields']['revision'])
                    if dd['name'] in new_vers:
                        new_vers[dd['name']].append(dd['version'])
                    else:
                        new_vers[dd['name']] = [dd['version']]

        for item in dat:
            if item['model'] == 'reversion.revision' and \
                    item['pk'] in used_revisions:
                revision_pk += 1
                revisionpks.update({item['pk']: revision_pk})
                item['pk'] = revision_pk
                data.append(item)

        for item in dat:
            if item['model'] == 'reversion.version':
                dd = json.loads(item['fields']['serialized_data'])[0]['fields']
                if dd['name'] not in names or \
                        (dd['name'] in names and
                         dd['version'] not in namevers[dd['name']]):
                    if item['fields']['content_type'] == \
                            ['poem_super_admin', 'probe']:
                        ser_data = json.loads(item['fields']['serialized_data'])
                        for d in ser_data:
                            d['pk'] = probepks[int(item['fields']['object_id'])]
                        item['fields']['serialized_data'] = json.dumps(ser_data)
                        item['fields']['object_id'] = \
                            str(probepks[int(item['fields']['object_id'])])

                    version_pk += 1
                    versionpks.update({item['pk']: version_pk})
                    item['pk'] = version_pk
                    item['fields']['revision'] = \
                        revisionpks[item['fields']['revision']]
                    data.append(item)

        for item in dat:
            if item['model'] == 'poem_super_admin.extrevision' and \
                item['fields']['revision'] in used_revisions:
                item['fields']['probeid'] = \
                    probepks[item['fields']['probeid']]
                item['fields']['revision'] = \
                    revisionpks[item['fields']['revision']]
                extrev_pk += 1
                item['pk'] = extrev_pk
                data.append(item)

        names = names.union(new_names)
        for k, v in new_vers.items():
            if k in namevers:
                namevers[k].append(v)
            else:
                namevers[k] = [v]

    probe_dict = {}
    for item in data:
        if item['model'] == 'reversion.version' and \
            item['fields']['content_type'] == ['poem_super_admin', 'probe']:
            probe_dict.update({item['fields']['object_repr']: item['pk']})

    # order revisions by date and return resulting data
    return order_revisions(data)


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


def adapt_tenant_data(data):
    tenant_data = data.copy()
    new_data = []

    for item in tenant_data:
        if item['model'] == 'poem.probe' or \
                item['model'] == 'poem.extrevision' or \
                item['model'] == 'poem.groupofprobes':
            pass
        elif item['model'] == 'reversion.version':
            if item['fields']['content_type'] == ['poem', 'probe']:
                item['fields']['content_type'] = ['poem_super_admin', 'probe']
                ser_data = json.loads(item['fields']['serialized_data'])
                for d in ser_data:
                    if d['model'] == 'poem.probe':
                        d['model'] = 'poem_super_admin.probe'
                        d['fields']['user'] = 'poem'
                        del d['fields']['group']
                item['fields']['serialized_data'] = json.dumps(ser_data)
            new_data.append(item)

        elif item['model'] == 'poem.service':
            item['fields']['service_category'] = item['fields']['service_area']
            del item['fields']['service_area']
            new_data.append(item)
        else:
            new_data.append(item)

    return new_data


def create_tenant_data(tenant_data, public_data):
    pub_data = public_data.copy()
    data = adapt_tenant_data(tenant_data.copy())
    new_data = []

    revision_ids = []
    probe_dict = {}
    for item in pub_data:
        if item['model'] == 'reversion.version' and \
                item['fields']['content_type'] == ['poem_super_admin', 'probe']:
            revision_ids.append(item['fields']['revision'])
            probe_dict.update({item['fields']['object_repr']: item['pk']})

    for item in data:
        if item['model'] == 'poem.metric':
            if item['fields']['probeversion'] != '':
                item['fields']['probekey'] = \
                    probe_dict[item['fields']['probeversion']]
            new_data.append(item)

        elif item['model'] == 'admin.logentry':
            if item['fields']['content_type'] == ['poem', 'probe']:
                pass
            else:
                new_data.append(item)

        elif item['model'] != 'reversion.version' and \
                item['model'] != 'reversion.revision':
            new_data.append(item)

    revs = []
    for item in pub_data:
        if item['model'] == 'reversion.revision':
            if item['pk'] in revision_ids:
                new_data.append(item)
                revs.append(item['pk'])
        elif item['model'] == 'reversion.version':
            if item['fields']['revision'] in revision_ids:
                new_data.append(item)

    old_revs = []
    for item in data:
        if item['model'] == 'reversion.version':
            if item['fields']['content_type'] == ['poem_super_admin', 'probe']:
                old_revs.append(item['fields']['revision'])
            else:
                item['fields']['revision'] = max(revs) + item['pk']
                item['pk'] = max(revs) + item['pk']
                new_data.append(item)

    for item in data:
        if item['model'] == 'reversion.revision':
            if item['pk'] in old_revs:
                pass
            else:
                item['pk'] = max(revs) + item['pk']
                new_data.append(item)

    return new_data


def order_revisions(d):
    data = d.copy()
    new_data = []

    dates = []
    for item in data:
        if item['model'] == 'reversion.revision':
           dates.append(item['fields']['date_created'])

    sorted_dates = sorted(dates)

    multiple_pks = {}
    for dat in sorted_dates:
        for item in data:
            if item['model'] == 'reversion.revision':
                if item['fields']['date_created'] == dat:
                    if dat in multiple_pks:
                        multiple_pks[dat].append(item['pk'])
                    else:
                        multiple_pks[dat] = [item['pk']]

    new_rev_pk = 0
    new_revpks = {}
    for item in data:
        if item['model'] == 'reversion.revision':
            if item['pk'] in multiple_pks[item['fields']['date_created']]:
                new_rev_pk += 1
                new_revpks.update({item['pk']: new_rev_pk})
                item['pk'] = new_rev_pk
                new_data.append(item)


    # sort versions, too
    for item in data:
        if item['model'] == 'reversion.version':
            item['fields']['revision'] = new_revpks[item['pk']]
            item['pk'] = new_revpks[item['pk']]
            new_data.append(item)
        elif item['model'] != 'reversion.version' and \
            item['model'] != 'reversion.revision':
            new_data.append(item)

    return new_data


def create_public_data_file(f1, f2, f3):
    # load data
    with open(f1, 'r') as f:
        d1 = json.load(f)

    with open(f2, 'r') as f:
        d2 = json.load(f)

    with open(f3, 'r') as f:
        d3 = json.load(f)

    data1 = users_data(d1)
    data2 = users_data(d2)
    data3 = users_data(d3)

    data = create_public_data(data1, data2, data3)

    with open('new-datadump-public.json', 'w') as f:
        json.dump(data, f, indent=2)


def create_tenant_data_file(ft):
    with open(ft, 'r') as f:
        dat = json.load(f)

    with open('new-datadump-public.json', 'r') as f:
        public_data = json.load(f)

    dat = users_data(dat)

    tenant_data = create_tenant_data(dat, public_data)

    with open('new-' + ft, 'w') as f:
        json.dump(tenant_data, f, indent=2)


def main():
    parser = argparse.ArgumentParser('Helper tool that converts .json files '
                                     'containing old db data into .json file '
                                     'which reflects changes in the db')
    parser.add_argument('--egi', dest='egi', help='input file for EGI tenant',
                        type=str, required=True)
    parser.add_argument('--eudat', dest='eudat', type=str, required=True,
                        help='input file for EUDAT tenant')
    parser.add_argument('--sdc', dest='sdc', help='input file for SDC tenant',
                        type=str, required=True)
    args = parser.parse_args()

    file1 = args.egi
    file2 = args.eudat
    file3 = args.sdc

    create_public_data_file(file1, file2, file3)

    create_tenant_data_file(file1)
    create_tenant_data_file(file2)
    create_tenant_data_file(file3)


main()
