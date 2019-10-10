from django.utils.text import get_text_list

from gettext import gettext
import json

from Poem.poem.models import *


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
            if 'changed' in submessage:
                submessage['changed']['fields'] = get_text_list(
                    [gettext(field) for field in submessage['changed']['fields']],
                    gettext('and')
                )
                messages.append(gettext('Changed {fields}.').format(
                    **submessage['changed']
                ))

        change_message = ' '.join(msg[0].upper() + msg[1:] for msg in messages)
        return change_message or gettext('No fields changed.')

    else:
        return comment
