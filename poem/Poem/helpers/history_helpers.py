import json

from Poem.poem import models as poem_models
from Poem.poem_super_admin import models as admin_models
from Poem.users.models import CustUser
from deepdiff import DeepDiff
from django.contrib.contenttypes.models import ContentType
from django.core import serializers


def to_dict(instance):
    serialized_data = serializers.serialize(
        'json', [instance],
        use_natural_foreign_keys=True,
        use_natural_primary_keys=True
    )
    return json.loads(serialized_data)[0]['fields']


def serialized_data_to_dict(data):
    return json.loads(data)[0]['fields']


def inline_models_to_dicts(data):
    new_data = {}

    if data:
        data = json.loads(data)

        for item in data:
            new_data.update({item.split(' ')[0]: item.split(' ')[1]})

    return new_data


def inline_one_to_dict(data):
    if data:
        return json.loads(data)[0]
    else:
        return ''


def serialize_metric(metric_instance, tags=None):
    if metric_instance.probeversion:
        instance_probe = metric_instance.probeversion.split("(")
        probe_name = instance_probe[0].strip()
        probe_version = instance_probe[1][:-1].strip()
        mt_instance = admin_models.MetricTemplateHistory.objects.get(
            name=metric_instance.name, probekey__name=probe_name,
            probekey__package__version=probe_version
        )

    else:
        mt_instance = admin_models.MetricTemplateHistory.objects.get(
            name=metric_instance.name
        )

    serialized_data = serializers.serialize(
        "json", [metric_instance],
        use_natural_foreign_keys=True,
        use_natural_primary_keys=True
    )

    if not tags or len(tags) == 0:
        tags_list = []

    else:
        tags_list = [[tag.name] for tag in tags]

    unserialized = json.loads(serialized_data)[0]

    if mt_instance.probekey:
        probekey = [
            mt_instance.probekey.name, mt_instance.probekey.package.version
        ]

    else:
        probekey = None

    unserialized["fields"].pop("probeversion")

    unserialized["fields"].update({
        "tags": tags_list,
        "mtype": [mt_instance.mtype.name],
        "description": mt_instance.description,
        "parent": mt_instance.parent,
        "probekey": probekey,
        "probeexecutable": mt_instance.probeexecutable,
        "attribute": mt_instance.attribute,
        "dependancy": mt_instance.dependency,
        "flags": mt_instance.flags,
        "parameter": mt_instance.parameter
    })

    return json.dumps([unserialized])


def create_history_entry(instance, user, comment, tags=None):
    if isinstance(instance, poem_models.Metric):
        poem_models.TenantHistory.objects.create(
            object_id=instance.id,
            serialized_data=serialize_metric(instance, tags=tags),
            object_repr=instance.__str__(),
            content_type=ContentType.objects.get_for_model(instance),
            comment=comment,
            user=user
        )

    elif isinstance(instance, admin_models.Probe):
        admin_models.ProbeHistory.objects.create(
            object_id=instance,
            name=instance.name,
            package=instance.package,
            description=instance.description,
            comment=instance.comment,
            repository=instance.repository,
            docurl=instance.docurl,
            version_comment=comment,
            version_user=user
        )

    else:
        history = admin_models.MetricTemplateHistory.objects.create(
            object_id=instance,
            name=instance.name,
            mtype=instance.mtype,
            probekey=instance.probekey,
            description=instance.description,
            parent=instance.parent,
            probeexecutable=instance.probeexecutable,
            config=instance.config,
            attribute=instance.attribute,
            dependency=instance.dependency,
            flags=instance.flags,
            parameter=instance.parameter,
            version_comment=comment,
            version_user=user
        )
        for tag in instance.tags.all():
            history.tags.add(tag)


def create_history(instance, user, comment=None, tags=None):
    if isinstance(instance, poem_models.Metric):
        serialized_data = serialize_metric(instance, tags=tags)
        content_type = ContentType.objects.get_for_model(instance)

        if not comment:
            comment = create_comment(
                instance, ct=content_type, new_serialized_data=serialized_data
            )

    else:
        if not comment:
            comment = create_comment(instance)

    create_history_entry(instance, user, comment, tags)


def analyze_differences(old_data, new_data):
    inlines = [
        'config', 'attribute', 'dependency', 'flags', 'parameter', 'dependancy'
    ]

    foreignkeys = ['probekey', 'package', 'group']

    changed = []
    added = []
    deleted = []
    msg = []
    if old_data:
        res = DeepDiff(old_data, new_data, ignore_order=True)

        # I'm counting how many times the for loop has passed because foreign
        # keys are serialized in lists
        passed = 0
        added_groups = list()
        deleted_groups = list()
        added_rules = list()
        deleted_rules = list()
        if 'iterable_item_removed' in res:
            for key, value in res['iterable_item_removed'].items():
                field = key.split('[')[1][0:-1].strip('\'')
                if field in foreignkeys:
                    passed += 1
                    pass
                elif field == 'groups':
                    deleted_groups.append(value['name'])
                elif field == 'rules':
                    deleted_rules.append(value['metric'])
                else:
                    msg.append(
                        {
                            'deleted': {
                                'fields': [field], 'object': value
                            }
                        }
                    )

        if 'iterable_item_added' in res:
            for key, value in res['iterable_item_added'].items():
                field = key.split('[')[1][0:-1].strip('\'')
                if field in foreignkeys:
                    passed += 1
                    pass
                elif field == 'groups':
                    added_groups.append(value['name'])
                elif field == 'rules':
                    added_rules.append(value['metric'])
                else:
                    msg.append(
                        {
                            'added': {
                                'fields': [field], 'object': value
                            }
                        }
                    )

        if added_groups or deleted_groups:
            for item in added_groups:
                if item in deleted_groups:
                    deleted_groups.remove(item)
                    msg.append(
                        {
                            'changed': {
                                'fields': ['groups'], 'object': [item]
                            }
                        }
                    )

                else:
                    msg.append(
                        {
                            'added': {
                                'fields': ['groups'], 'object': [item]
                            }
                        }
                    )

            for item in deleted_groups:
                msg.append(
                    {
                        'deleted': {
                            'fields': ['groups'], 'object': [item]
                        }
                    }
                )

        if added_rules or deleted_rules:
            for item in added_rules:
                if item in deleted_rules:
                    deleted_rules.remove(item)
                    msg.append(
                        {
                            'changed': {
                                'fields': ['rules'], 'object': [item]
                            }
                        }
                    )

                else:
                    msg.append(
                        {
                            'added': {
                                'fields': ['rules'], 'object': [item]
                            }
                        }
                    )

            for item in deleted_rules:
                msg.append(
                    {
                        'deleted': {
                            'fields': ['rules'], 'object': [item]
                        }
                    }
                )

        if passed > 0:
            res = DeepDiff(old_data, new_data)

        if 'dictionary_item_added' in res:
            for item in res['dictionary_item_added']:
                added.append(item.split('[')[1][0:-1].strip('\''))

        if 'type_changes' in res:
            for key, value in res['type_changes'].items():
                field = key.split('[')[1][0:-1].strip('\'')

                if value['new_value'] is None:
                    deleted.append(field)

                if value['old_value'] is None:
                    added.append(field)

                if not value['new_value'] is None and \
                        not value['old_value'] is None:
                    changed.append(field)

        if 'values_changed' in res:
            for key, value in res['values_changed'].items():
                field = key.split('[')[1][1:-2]
                try:
                    if field in inlines:
                        old = inline_models_to_dicts(value['old_value'])
                        new = inline_models_to_dicts(value['new_value'])
                        deleted_fields = []
                        changed_fields = []
                        added_fields = []
                        res = DeepDiff(old, new, ignore_order=True)
                        if 'values_changed' in res:
                            for k, v in res['values_changed'].items():
                                changed_fields.append(
                                    k.split('[')[1][0:-1].strip('\'')
                                )

                        if 'dictionary_item_added' in res:
                            for item in res['dictionary_item_added']:
                                added_fields.append(
                                    item.split('[')[1][0:-1].strip('\'')
                                )

                        if 'dictionary_item_removed' in res:
                            for item in res['dictionary_item_removed']:
                                deleted_fields.append(
                                    item.split('[')[1][0:-1].strip('\'')
                                )

                        if deleted_fields:
                            msg.append(
                                {'deleted': {
                                    'fields': [field],
                                    'object': sorted(deleted_fields)
                                }}
                            )

                        if changed_fields:
                            msg.append(
                                {'changed': {
                                    'fields': [field],
                                    'object': sorted(changed_fields)
                                }}
                            )

                        if added_fields:
                            msg.append(
                                {'added': {'fields': [field],
                                           'object': sorted(added_fields)}}
                            )

                    else:
                        if not value['new_value']:
                            deleted.append(field)

                        elif not value['old_value']:
                            added.append(field)

                        else:
                            if field != 'tags':
                                changed.append(field)

                except KeyError:
                    pass

        if added:
            msg.append({'added': {'fields': sorted(list(set(added)))}})
        if changed:
            msg.append({'changed': {'fields': sorted(list(set(changed)))}})
        if deleted:
            msg.append({'deleted': {'fields': sorted(list(set(deleted)))}})

        return json.dumps(msg)
    else:
        return 'Initial version.'


def create_comment(instance, ct=None, new_serialized_data=None):
    if isinstance(instance, (admin_models.Probe, admin_models.MetricTemplate)):
        if isinstance(instance, admin_models.Probe):
            history_model = admin_models.ProbeHistory
        else:
            history_model = admin_models.MetricTemplateHistory

        history = history_model.objects.filter(object_id=instance) \
            .order_by('-date_created')

        new_data = to_dict(instance)
        if isinstance(instance, admin_models.Probe):
            del new_data['user'], new_data['datetime']

    else:
        history = poem_models.TenantHistory.objects.filter(
            object_id=instance.id,
            content_type=ct
        ).order_by('-date_created')
        new_data = serialized_data_to_dict(new_serialized_data)

    if len(history) > 0:
        if isinstance(
                instance,
                (poem_models.Metric, poem_models.MetricProfiles,
                 poem_models.Aggregation, poem_models.ThresholdsProfiles)
        ):
            old_data = serialized_data_to_dict(history[0].serialized_data)
        else:
            old_data = to_dict(history[0])
            del old_data['object_id'], old_data['version_comment'], \
                old_data['version_user'], old_data['date_created']
    else:
        old_data = ''

    return analyze_differences(old_data, new_data)


def update_comment(instance):
    if isinstance(instance, admin_models.Probe):
        history_model = admin_models.ProbeHistory

    else:
        history_model = admin_models.MetricTemplateHistory

    history = history_model.objects.filter(object_id=instance)\
        .order_by('-date_created')

    new_data = to_dict(instance)
    if isinstance(instance, admin_models.Probe):
        del new_data['user'], new_data['datetime']

    if len(history) > 1:
        old_data = to_dict(history[1])
        del old_data['object_id'], old_data['version_comment'], \
            old_data['version_user'], old_data['date_created']

    else:
        old_data = ''

    return analyze_differences(old_data, new_data)


def create_profile_history(instance, data, user, description=None):
    ct = ContentType.objects.get_for_model(instance)

    if isinstance(user, CustUser):
        username = user.username
    else:
        username = user

    serialized_data = json.loads(
        serializers.serialize(
            'json', [instance],
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True
        )
    )

    if isinstance(instance, poem_models.MetricProfiles):
        mis = []
        for item in data:
            if isinstance(item, str):
                item = json.loads(item.replace('\'', '\"'))

            mis.append([item['service'], item['metric']])

        serialized_data[0]['fields'].update({
            'metricinstances': mis
        })

        serialized_data[0]['fields'].update({
            'description': description
        })

    elif isinstance(
            instance, (poem_models.Aggregation, poem_models.ThresholdsProfiles,
                       poem_models.Reports)
    ):
        serialized_data[0]['fields'].update(**data)

    comment = create_comment(instance, ct, json.dumps(serialized_data))

    poem_models.TenantHistory.objects.create(
        object_id=instance.id,
        serialized_data=json.dumps(serialized_data),
        object_repr=instance.__str__(),
        comment=comment,
        user=username,
        content_type=ct
    )
