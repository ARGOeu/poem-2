import json


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
