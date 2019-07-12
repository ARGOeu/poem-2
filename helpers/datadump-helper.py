#!/usr/bin/env python
import argparse
import datetime
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

        elif item['model'] == 'poem.metric':
            del item['fields']['tag']
            del item['fields']['group']
            item['fields']['dependency'] = item['fields']['dependancy']
            del item['fields']['dependancy']
            item['model'] = 'poem_super_admin.metrictemplate'
            extracted_data.append(item)

        elif item['model'] == 'poem.metricdependancy':
            item['model'] = 'poem_super_admin.metrictemplatedependency'
            extracted_data.append(item)

        elif item['model'] == 'poem.metricflags':
            item['model'] = 'poem_super_admin.metrictemplateflags'
            extracted_data.append(item)

        elif item['model'] == 'poem.metricfiles':
            item['model'] = 'poem_super_admin.metrictemplatefiles'
            extracted_data.append(item)

        elif item['model'] == 'poem.metricparameter':
            item['model'] = 'poem_super_admin.metrictemplateparameter'
            extracted_data.append(item)

        elif item['model'] == 'poem.metricfileparameter':
            item['model'] = 'poem_super_admin.metrictemplatefileparameter'
            extracted_data.append(item)

        elif item['model'] == 'poem.metricattribute':
            item['model'] = 'poem_super_admin.metrictemplateattribute'
            extracted_data.append(item)

        elif item['model'] == 'poem.metricconfig':
            item['model'] = 'poem_super_admin.metrictemplateconfig'
            extracted_data.append(item)

        elif item['model'] == 'poem.metricparent':
            item['model'] = 'poem_super_admin.metrictemplateparent'
            extracted_data.append(item)

        elif item['model'] == 'poem.metricprobeexecutable':
            item['model'] = 'poem_super_admin.metrictemplateprobeexecutable'
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

    inline_models = ['poem_super_admin.metrictemplatedependency',
                     'poem_super_admin.metrictemplateflags',
                     'poem_super_admin.metrictemplatefiles',
                     'poem_super_admin.metrictemplateparameter',
                     'poem_super_admin.metrictemplatefileparameter',
                     'poem_super_admin.metrictemplateattribute',
                     'poem_super_admin.metrictemplateconfig',
                     'poem_super_admin.metrictemplateparent',
                     'poem_super_admin.metrictemplateprobeexecutable']

    names = set()
    mnames = set()
    probe_pk = 0
    metric_pk = 0
    extrev_pk = 0
    revision_pk = 0
    probepks = {}
    revisionpks = {}
    metricpks = {}
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

        if item['model'] == 'poem_super_admin.metrictemplate':
            metric_pk += 1
            metricpks.update({item['pk']: metric_pk})
            item['pk'] = metric_pk
            mnames.add(item['fields']['name'])

    inlinepkmax = [0] * len(inline_models)
    for item in data1:
        if item['model'] == 'poem_super_admin.metrictemplate':
            if item['fields']['cloned']:
                item['fields']['cloned'] = \
                    str(metricpks[int(item['fields']['cloned'])])

        if item['model'] in inline_models:
            item['fields']['metrictemplate'] = \
            metricpks[int(item['fields']['metric'])]
            del item['fields']['metric']

            for i in range(len(inline_models)):
                if item['model'] == inline_models[i]:
                    inlinepkmax[i] = item['pk']

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

    probe_dict = {}
    for item in data1:
        if item['model'] == 'reversion.version' and \
            item['fields']['content_type'] == ['poem_super_admin', 'probe']:
            probe_dict.update({item['fields']['object_repr']: item['pk']})

    for item in data1:
        if item['model'] == 'poem_super_admin.metrictemplate':
            if item['fields']['probeversion'] != '':
                item['fields']['probekey'] = \
                probe_dict[item['fields']['probeversion']]

    # create versions and reversions for metric templates
    revlist = []
    for item in data1:
        if item['model'] == 'poem_super_admin.metrictemplate':
            version_pk += 1
            revision_pk += 1
            ser_data = json.dumps(
                [
                    {
                        'model': 'poem_super_admin.metrictemplate',
                        'pk': item['pk'],
                        'fields': {
                            'name': item['fields']['name'],
                            'mtype': item['fields']['mtype'],
                            'probeversion': item['fields']['probeversion'],
                            'probekey': item['fields']['probekey'],
                            'parent': item['fields']['parent'],
                            'probeexecutable': item['fields']['probeexecutable'],
                            'config': item['fields']['config'],
                            'attribute': item['fields']['attribute'],
                            'dependency': item['fields']['dependency'],
                            'flags': item['fields']['flags'],
                            'files': item['fields']['files'],
                            'parameter': item['fields']['parameter'],
                            'fileparameter': item['fields']['fileparameter']
                        }
                    }
                ]
            )
            ver = {
                    'model': 'reversion.version',
                    'pk': version_pk,
                    'fields': {
                        'revision': revision_pk,
                        'object_id': item['pk'],
                        'content_type': ['poem_super_admin', 'metrictemplate'],
                        'db': 'default',
                        'format': 'json',
                        'serialized_data': ser_data,
                        'object_repr': item['fields']['name']
                    }
            }

            rev = {
                'model': 'reversion.revision',
                'pk': revision_pk,
                'fields': {
                    'date_created': datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3],
                    'user': ['poem'],
                    'comment': 'Initial version.'
                }
            }
            revlist.append(rev)
            revlist.append(ver)

    # update extrevision table
    for item in data1:
        if item['model'] == 'poem_super_admin.extrevision':
            extrev_pk += 1
            item['fields']['probeid'] = probepks[item['fields']['probeid']]
            item['fields']['revision'] = revisionpks[item['fields']['revision']]
            item['pk'] = extrev_pk

    for item in revlist:
        data1.append(item)

    data = data1

    for dat in [data2, data3]:
        # reset dicts
        probepks = {}
        metricpks = {}
        versionpks = {}
        revisionpks = {}
        new_names = set()
        new_mnames = set()
        new_vers = {}
        inlinepks = set()

        for item in dat:
            if item['model'] == 'poem_super_admin.probe' and \
                item['fields']['name'] not in names:
                probe_pk += 1
                probepks.update({item['pk']: probe_pk})
                item['pk'] = probe_pk
                new_names.add(item['fields']['name'])
                data.append(item)

            if item['model'] == 'poem_super_admin.metrictemplate':
                if item['fields']['name'] not in mnames:
                    metric_pk += 1
                    metricpks.update({item['pk']: metric_pk})
                    inlinepks.add(item['pk'])
                    item['pk'] = metric_pk
                    new_mnames.add(item['fields']['name'])
                else:
                    for i in data:
                        if i['model'] == 'poem_super_admin.metrictemplate' and \
                                i['fields']['name'] == item['fields']['name']:
                            metricpks.update({item['pk']: i['pk']})

            if item['model'] == 'poem_super_admin.probe' and \
                item['fields']['name'] in names and \
                item['fields']['version'] not in \
                    namevers[item['fields']['name']]:
                for i in data:
                    if i['model'] == 'poem_super_admin.probe' and \
                        i['fields']['name'] == item['fields']['name']:
                        i['fields'].update(item['fields'])
                        probepks.update({item['pk']: i['pk']})

        for item in dat:
            if item['model'] == 'poem_super_admin.metrictemplate':
                if item['fields']['cloned']:
                    item['fields']['cloned'] = \
                    str(metricpks[int(item['fields']['cloned'])])

                if item['fields']['name'] not in mnames:
                    data.append(item)

            if item['model'] in inline_models:
                if item['fields']['metric'] in inlinepks:
                    item['fields']['metrictemplate'] = \
                    metricpks[int(item['fields']['metric'])]
                    del item['fields']['metric']
                    inlinepkmax[inline_models.index(item['model'])] += 1
                    item['pk'] = inlinepkmax[inline_models.index(item['model'])]
                    data.append(item)

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

        revlist = []
        for item in data:
            if item['model'] == 'poem_super_admin.metrictemplate' and \
                    item['fields']['name'] not in mnames:
                version_pk += 1
                revision_pk += 1
                ser_data = json.dumps(
                    [
                        {
                            'model': 'poem_super_admin.metrictemplate',
                            'pk': item['pk'],
                            'fields': {
                                'name': item['fields']['name'],
                                'mtype': item['fields']['mtype'],
                                'probeversion': item['fields']['probeversion'],
                                'probekey': item['fields']['probekey'],
                                'parent': item['fields']['parent'],
                                'probeexecutable': item['fields']['probeexecutable'],
                                'config': item['fields']['config'],
                                'attribute': item['fields']['attribute'],
                                'dependency': item['fields']['dependency'],
                                'flags': item['fields']['flags'],
                                'files': item['fields']['files'],
                                'parameter': item['fields']['parameter'],
                                'fileparameter': item['fields']['fileparameter']
                            }
                        }
                    ]
                )
                ver = {
                        'model': 'reversion.version',
                        'pk': version_pk,
                        'fields': {
                            'revision': revision_pk,
                            'object_id': item['pk'],
                            'content_type': ['poem_super_admin', 'metrictemplate'],
                            'db': 'default',
                            'format': 'json',
                            'serialized_data': ser_data,
                            'object_repr': item['fields']['name']
                        }
                }

                rev = {
                    'model': 'reversion.revision',
                    'pk': revision_pk,
                    'fields': {
                        'date_created': datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3],
                        'user': ['poem'],
                        'comment': 'Initial version.'
                    }
                }
                revlist.append(rev)
                revlist.append(ver)

        for item in revlist:
            data.append(item)

        names = names.union(new_names)
        mnames = mnames.union(new_mnames)
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

    metric_revisions = []
    for item in tenant_data:
        if item['model'] == 'poem.probe' or \
                item['model'] == 'poem.extrevision' or \
                item['model'] == 'poem.groupofprobes' or \
                item['model'] == 'reversion.revision':
            pass
        elif item['model'] == 'poem.metric':
            del item['fields']['cloned']
            new_data.append(item)
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

            if item['fields']['content_type'] == ['poem', 'metric']:
                metric_revisions.append(item['fields']['revision'])
                continue
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

    # check GroupOfMetrics to see which tenant is used:
    grps = []
    for item in tenant_data:
        if item['model'] == 'poem.groupofmetrics':
            grps.append(item['fields']['name'])

    if len(grps) == 3:
        gr = {'ARGOTEST': 1, 'EGI': 2, 'EUDAT': 3}
    else:
        if grps[0] == 'EUDAT':
            gr = {'EUDAT': 1}
        else:
            gr = {'all': 1}

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
            if item['fields']['content_type'] == ['poem', 'probe'] or \
                item['fields']['content_type'] == ['poem', 'metric']:
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

    # create new Version and Revision entries for Metric
    version = []
    revision = []
    for item in new_data:
        if item['model'] == 'reversion.version':
            version.append(item['pk'])
        if item['model'] == 'reversion.revision':
            revision.append(item['pk'])

    verpk = max(version)
    revpk = max(revision)
    for item in new_data:
        if item['model'] == 'poem.metric':
            verpk += 1
            revpk += 1
            ser_data = json.dumps(
                [
                    {
                        'model': 'poem.metric',
                        'pk': item['pk'],
                        'fields': {
                            'name': item['fields']['name'],
                            'tag': item['fields']['tag'],
                            'group': gr[item['fields']['group'][0]],
                            'mtype': item['fields']['mtype'],
                            'probeversion': item['fields']['probeversion'],
                            'probekey': item['fields']['probekey'],
                            'parent': item['fields']['parent'],
                            'probeexecutable': item['fields']['probeexecutable'],
                            'config': item['fields']['config'],
                            'attribute': item['fields']['attribute'],
                            'dependancy': item['fields']['dependancy'],
                            'flags': item['fields']['flags'],
                            'files': item['fields']['files'],
                            'parameter': item['fields']['parameter'],
                            'fileparameter': item['fields']['fileparameter']
                        }
                    }
                ]
            )

            ver = {
                'model': 'reversion.version',
                'pk': verpk,
                'fields': {
                    'revision': revpk,
                    'object_id': item['pk'],
                    'content_type': ['poem', 'metric'],
                    'db': 'default',
                    'format': 'json',
                    'serialized_data': ser_data,
                    'object_repr': u'%s (%s)' % (item['fields']['name'],
                                                 item['fields']['tag'])
                }
            }

            rev = {
                'model': 'reversion.revision',
                'pk': revpk,
                'fields': {
                    'date_created': datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3],
                    'user': ['poem'],
                    'comment': 'Derived from {}.'.format(item['fields']['name'])
                }
            }
            new_data.append(rev)
            new_data.append(ver)

    return new_data


def order_revisions(d):
    data = d.copy()
    new_data = []

    dates = []
    for item in data:
        if item['model'] == 'reversion.revision':
           dates.append(item['fields']['date_created'])

    sorted_dates = sorted(dates)

    for item in data:
        if item['model'] != 'reversion.revision' and \
            item['model'] != 'reversion.version':
            new_data.append(item)

    multiple_pks = {}
    for dat in sorted_dates:
        for item in data:
            if item['model'] == 'reversion.revision':
                if item['fields']['date_created'] == dat:
                    if dat in multiple_pks:
                        multiple_pks[dat].add(item['pk'])
                    else:
                        multiple_pks[dat] = {item['pk']}

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
