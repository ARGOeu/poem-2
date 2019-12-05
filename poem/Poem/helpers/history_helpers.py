from django.contrib.contenttypes.models import ContentType
from django.core import serializers

import json

from Poem.poem.models import TenantHistory, Metric
from Poem.poem_super_admin import models as admin_models


def to_dict(instance):
    serialized_data = serializers.serialize(
        'json', [instance],
        use_natural_foreign_keys=True,
        use_natural_primary_keys=True
    )
    return json.loads(serialized_data)[0]['fields']


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


def create_probe_history(instance, user, comment):
    admin_models.ProbeHistory.objects.create(
        object_id=instance,
        name=instance.name,
        version=instance.version,
        description=instance.description,
        comment=instance.comment,
        repository=instance.repository,
        docurl=instance.docurl,
        version_comment=comment,
        version_user=user
    )


def create_history(instance, user, comment=None):
    if isinstance(instance, Metric):
        model = TenantHistory
    else:
        model = admin_models.History
    object_id = instance.id
    serialized_data = serializers.serialize(
        'json', [instance],
        use_natural_foreign_keys=True,
        use_natural_primary_keys=True
    )
    object_repr = instance.__str__()
    content_type = ContentType.objects.get_for_model(instance)

    if not comment:
        if isinstance(instance, admin_models.Probe):
            comment = create_new_comment(instance)
        else:
            comment = create_comment(object_id, content_type, serialized_data)

    if isinstance(instance, admin_models.Probe):
        create_probe_history(instance, user, comment)
    else:
        model.objects.create(
            object_id=object_id,
            serialized_data=serialized_data,
            object_repr=object_repr,
            content_type=content_type,
            comment=comment,
            user=user
        )


def analyze_differences(old_data, new_data):
    inlines = ['config', 'attribute', 'dependency', 'flags', 'files',
               'parameter', 'fileparameter', 'dependancy']

    single_value_inline = ['parent', 'probeexecutable']

    not_tracked_fields = ['probekey']

    changed = []
    added = []
    deleted = []
    msg = []
    if old_data:
        for key, value in old_data.items():
            try:
                if key in not_tracked_fields:
                    pass

                elif key in inlines:
                    old = inline_models_to_dicts(old_data[key])
                    new = inline_models_to_dicts(new_data[key])

                    deleted_fields = []
                    changed_fields = []
                    added_fields = []
                    for k, v in old.items():
                        if k not in new:
                            deleted_fields.append(k)

                        elif old[k] != new[k]:
                            changed_fields.append(k)

                    for k, v in new.items():
                        if k not in old:
                            added_fields.append(k)

                    if deleted_fields:
                        msg.append(
                            {'deleted': {
                                'fields': [key], 'object': deleted_fields
                            }}
                        )

                    if changed_fields:
                        msg.append(
                            {'changed': {
                                'fields': [key], 'object': changed_fields
                            }}
                        )

                    if added_fields:
                        msg.append(
                            {'added': {'fields': [key], 'object': added_fields}}
                        )

                elif key in single_value_inline:
                    old = inline_one_to_dict(old_data[key])
                    new = inline_one_to_dict(new_data[key])

                    if old and new and old != new:
                        changed.append(key)

                    elif old and not new:
                        deleted.append(key)

                    elif not old and new:
                        added.append(key)

                else:
                    if old_data[key] and old_data[key] != new_data[key]:
                        changed.append(key)

                    elif not new_data[key] and old_data[key]:
                        deleted.append(key)

            except KeyError:
                pass

        for key, value in new_data.items():
            if key not in inlines and key not in single_value_inline:
                try:
                    if not old_data[key] and new_data[key]:
                        added.append(key)

                except KeyError:
                    added.append(key)

        if added:
            msg.append({'added': {'fields': added}})
        if changed:
            msg.append({'changed': {'fields': changed}})
        if deleted:
            msg.append({'deleted': {'fields': deleted}})
        return json.dumps(msg)
    else:
        return 'Initial version.'


def create_new_comment(instance):
    history = admin_models.ProbeHistory.objects.filter(
        object_id=instance
    ).order_by('-date_created')

    if len(history) > 0:
        old_data = to_dict(history[0])
        del old_data['object_id'], old_data['version_comment'], \
            old_data['version_user'], old_data['date_created']
    else:
        old_data = ''

    new_data = to_dict(instance)

    del new_data['user'], new_data['datetime']

    return analyze_differences(old_data, new_data)


def create_comment(object_id, ct, new_serialized_data):
    if ct == ContentType.objects.get_for_model(Metric):
        history = TenantHistory.objects.filter(
            object_id=object_id,
            content_type=ct
        ).order_by('-date_created')
    else:
        history = admin_models.History.objects.filter(
            object_id=object_id,
            content_type=ct
        ).order_by('-date_created')

    inlines = ['config', 'attribute', 'dependency', 'flags', 'files',
               'parameter', 'fileparameter', 'dependancy']

    single_value_inline = ['parent', 'probeexecutable']

    not_tracked_fields = ['nameversion', 'datetime']

    changed = []
    added = []
    deleted = []
    msg = []
    if len(history) > 0:
        new_serialized_data = json.loads(new_serialized_data)[0]['fields']
        old_serialized_data = json.loads(history[0].serialized_data)[0][
            'fields']

        for key, value in old_serialized_data.items():
            try:
                if key in not_tracked_fields:
                    pass

                elif key in inlines:
                    old = inline_models_to_dicts(old_serialized_data[key])
                    new = inline_models_to_dicts(new_serialized_data[key])

                    deleted_fields = []
                    changed_fields = []
                    added_fields = []
                    for k, v in old.items():
                        if k not in new:
                            deleted_fields.append(k)

                        elif old[k] != new[k]:
                            changed_fields.append(k)

                    for k, v in new.items():
                        if k not in old:
                            added_fields.append(k)

                    if deleted_fields:
                        msg.append(
                            {'deleted': {
                                'fields': [key], 'object': deleted_fields
                            }}
                        )

                    if changed_fields:
                        msg.append(
                            {'changed': {
                                'fields': [key], 'object': changed_fields
                            }}
                        )

                    if added_fields:
                        msg.append(
                            {'added': {'fields': [key], 'object': added_fields}}
                        )

                elif key in single_value_inline:
                    old = inline_one_to_dict(old_serialized_data[key])
                    new = inline_one_to_dict(new_serialized_data[key])

                    if old and new and old != new:
                        changed.append(key)

                    elif old and not new:
                        deleted.append(key)

                    elif not old and new:
                        added.append(key)

                else:
                    if old_serialized_data[key] and \
                            old_serialized_data[key] != new_serialized_data[key]:
                        changed.append(key)

                    elif not new_serialized_data[key] and \
                            old_serialized_data[key]:
                        deleted.append(key)

            except KeyError:
                pass

        for key, value in new_serialized_data.items():
            if key not in inlines and key not in single_value_inline:
                try:
                    if not old_serialized_data[key] and \
                            new_serialized_data[key]:
                        added.append(key)

                except KeyError:
                    added.append(key)

        if added:
            msg.append({'added': {'fields': added}})
        if changed:
            msg.append({'changed': {'fields': changed}})
        if deleted:
            msg.append({'deleted': {'fields': deleted}})
        return json.dumps(msg)
    else:
        return 'Initial version.'
