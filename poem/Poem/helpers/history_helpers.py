from django.contrib.contenttypes.models import ContentType
from django.core import serializers

import json

from Poem.poem_super_admin.models import History


def create_history(instance, user):
    object_id = instance.id
    serialized_data = serializers.serialize('json', [instance])
    object_repr = instance.__str__()
    content_type = ContentType.objects.get_for_model(instance)
    comment = create_comment(object_id, content_type, serialized_data)

    History.objects.create(
        object_id=object_id,
        serialized_data=serialized_data,
        object_repr=object_repr,
        content_type=content_type,
        comment=comment,
        user=user
    )


def create_comment(object_id, ct, new_serialized_data):
    history = History.objects.filter(object_id=object_id, content_type=ct).\
        order_by('-date_created')

    changed = []
    if len(history) > 0:
        new_serialized_data = json.loads(new_serialized_data)[0]['fields']
        old_serialized_data = json.loads(history[0].serialized_data)[0][
            'fields']

        for key, value in old_serialized_data.items():
            if old_serialized_data[key] != new_serialized_data[key]:
                changed.append(key)
        return json.dumps([{'changed': {'fields': changed}}])
    else:
        return 'Initial version.'
