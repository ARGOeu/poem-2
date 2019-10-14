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
            results.append(({'key': item.split(' ')[0],
                             'value': item.split(' ')[1]}))

    return results


def inline_metric_for_db(input):
    result = []

    for item in input:
        result.append('{} {}'.format(item['key'], item['value']))

    return result


def two_value_inline_dict(input):
    results = dict()

    if input:
        data = json.loads(input)

        for item in data:
            results.update(({item.split(' ')[0]: item.split(' ')[1]}))

    return results
