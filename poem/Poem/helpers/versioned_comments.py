from django.utils.text import get_text_list

from gettext import gettext
import json

from Poem.poem.models import *


iterable_fields = ['metricinstances']


def msg_with_object(msg, action):
    if msg[action]['fields'] in iterable_fields:
        return ' '.join(msg[action]['object'])

    else:
        return get_text_list(
            [gettext(field) for field in msg[action]['object']],
            gettext('and')
        )


def msg_with_fields(msg, action):
    return get_text_list(
        [gettext(field) for field in msg[action]['fields']],
        gettext('and')
    )


def new_comment(comment):
    """Makes nicer comments in object_history templates. It makes plaintext
    messages from default json comment in log table."""

    if comment and comment[0] == '[':
        try:
            change_message = json.loads(comment)
        except json.JSONDecodeError:
            return comment

        messages = []
        for submessage in change_message:
            if 'added' in submessage:
                submessage['added']['fields'] = msg_with_fields(
                    submessage, 'added'
                )

                if 'object' in submessage['added']:
                    if len(submessage['added']['object']) > 1 and \
                            submessage['added']['fields'] not in \
                            iterable_fields:
                        f = 'fields'
                    else:
                        f = 'field'

                    submessage['added']['object'] = msg_with_object(
                        submessage, 'added'
                    )

                    messages.append(
                        gettext('Added {fields} ' + f + ' "{object}".').format(
                            **submessage['added']
                        )
                    )

                else:
                    messages.append(gettext(
                        'Added {fields}.'.format(**submessage['added'])
                    ))

            elif 'changed' in submessage:
                submessage['changed']['fields'] = msg_with_fields(
                    submessage, 'changed'
                )

                if 'object' in submessage['changed']:
                    if len(submessage['changed']['object']) > 1 and \
                            submessage['changed']['fields'] not in \
                            iterable_fields:
                        f = 'fields'
                    else:
                        f = 'field'

                    submessage['changed']['object'] = msg_with_object(
                        submessage, 'changed'
                    )

                    messages.append(
                        gettext(
                            'Changed {fields} ' + f + ' "{object}".'
                        ).format(**submessage['changed'])
                    )

                else:
                    messages.append(gettext('Changed {fields}.').format(
                        **submessage['changed']
                    ))

            elif 'deleted' in submessage:
                submessage['deleted']['fields'] = msg_with_fields(
                    submessage, 'deleted'
                )

                if 'object' in submessage['deleted']:
                    if len(submessage['deleted']['object']) > 1 and \
                            submessage['deleted']['fields'] not in \
                            iterable_fields:
                        f = 'fields'
                    else:
                        f = 'field'

                    submessage['deleted']['object'] = msg_with_object(
                        submessage, 'deleted'
                    )

                    messages.append(
                        gettext(
                            'Deleted {fields} ' + f + ' "{object}".'
                        ).format(**submessage['deleted'])
                    )

                else:
                    messages.append(gettext('Deleted {fields}.').format(
                        **submessage['deleted']
                    ))

        change_message = ' '.join(msg[0].upper() + msg[1:] for msg in messages)
        return change_message or gettext('No fields changed.')

    else:
        return comment
