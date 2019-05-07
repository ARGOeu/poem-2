from django.utils.text import get_text_list

from Poem.poem.models import *

from reversion.models import Version

from gettext import gettext
import json


def get_obj_from_db(objname, all_changes, action, object_id, version_id,
                    contenttype_id):
    """Get object from the database by its id and content_type. Version table
    is used for getting the object from database, and differences between
    versions are returned."""

    objname = objname.split(' ')

    """In case there are multiple changes in the same objectname, the whole 
    comment is used to determine which of the entries in serialized_data in 
    reversion_version table is used in which function call."""
    nr = 0
    for x in all_changes:
        if action in x:
            if x[action]['object'].split(' ')[0] == objname[0]:
                nr += 1
        else:
            continue

    if nr > 1:
        obj_id = list()
        for obj in all_changes:
            if action in obj:
                obj_id.append(obj[action]['object'].split(' ')[2][1:-1])
        ind = obj_id.index(objname[2][1:-1])
    else:
        ind = 0

    versionset = Version.objects.all().filter(
        object_id=object_id).filter(content_type_id=contenttype_id)
    versionid = [i.id for i in versionset if i.id == version_id]
    allversionid = [i.id for i in versionset]
    olderversionid = versionset[allversionid.index(versionid[0]) + 1]
    fieldnameold = eval("json.loads(Version.objects.get("
                        "id=%s).serialized_data)[0]['fields']" %
                        olderversionid.id)
    fieldname = eval("json.loads(Version.objects.get("
                     "id=%s).serialized_data)[0]['fields']" % version_id)
    if objname[0].startswith('Metric'):
        objname[0] = objname[0][6:]

    if fieldname[objname[0].lower()]:
        value = json.loads(fieldname[objname[0].lower()])
    else:
        value = []

    if fieldnameold[objname[0].lower()]:
        valueold = json.loads(fieldnameold[objname[0].lower()])
    else:
        valueold = []

    list_fieldname = list(set(value).union(set(valueold)) - set(
        value).intersection(set(valueold)))

    if len(list_fieldname) == 0:
        diff_fieldname = ''
    else:
        diff_fieldname = list_fieldname[ind].split(' ')[0]

    return diff_fieldname


def new_comment(comment, obj_id=None, version_id=None, ctt_id=None):
    """Makes nicer comments in object_history templates. It makes plaintext
    messages from default json comment in log table."""

    new_comment = comment

    if new_comment and new_comment[0] == '[':
        try:
            new_comment = json.loads(new_comment)
        except json.JSONDecodeError:
            return new_comment

    if 'Derived' in new_comment:
        pass

    else:
        messages = []
        for sub_message in new_comment:
            if 'added' in sub_message:
                if sub_message['added']:
                    sub_message['added']['name'] = \
                        gettext(sub_message['added']['name'])
                    if version_id:
                        if get_obj_from_db(
                                gettext(sub_message['added']['object']),
                                new_comment,
                                'added',
                                obj_id,
                                version_id,
                                ctt_id
                        ):
                            messages.append(
                                'Added %s "%s".'
                                % (sub_message['added']['name'],
                                   get_obj_from_db(
                                       gettext(sub_message['added']['object']),
                                       new_comment,
                                       'added',
                                       obj_id,
                                       version_id,
                                       ctt_id
                                   )
                                   )
                            )
                        else:
                            messages.append('')
                    else:
                        messages.append(
                            'Added new %s.' % (sub_message['added']['name'])
                        )
                else:
                    messages.append('Initial version.')
                    break

            elif 'changed' in sub_message:
                sub_message['changed']['fields'] = \
                    get_text_list(
                        sub_message['changed']['fields'],
                        gettext('and')
                    )

                if 'name' in sub_message['changed']:
                    sub_message['changed']['name'] = \
                        gettext(sub_message['changed']['name'])
                    if version_id:
                        if get_obj_from_db(
                                gettext(sub_message['changed']['object']),
                                new_comment,
                                'changed',
                                obj_id,
                                version_id,
                                ctt_id
                        ):
                            messages.append(
                                'Changed %s for %s "%s".'
                                % (sub_message['changed']['fields'],
                                   gettext(sub_message['changed']['name']),
                                   get_obj_from_db(
                                       gettext(
                                           sub_message['changed']['object']
                                       ),
                                       new_comment,
                                       'changed',
                                       obj_id,
                                       version_id,
                                       ctt_id
                                   ))
                            )
                        else:
                            messages.append('')
                    else:
                        messages.append(
                            'Changed %s for %s.'
                            % (sub_message['changed']['fields'],
                               gettext(sub_message['changed']['name']))
                        )

                else:
                    messages.append(
                        gettext(
                            'Changed {fields}.'
                        ).format(**sub_message['changed'])
                    )

            elif 'deleted' in sub_message:
                sub_message['deleted']['name'] = \
                    gettext(
                        sub_message['deleted']['name']
                    )

                if version_id:
                    if get_obj_from_db(
                            gettext(sub_message['deleted']['object']),
                            new_comment,
                            'deleted',
                            obj_id,
                            version_id,
                            ctt_id
                    ):
                        messages.append(
                            'Deleted %s "%s".'
                            % (
                                sub_message['deleted']['name'],
                                get_obj_from_db(
                                    gettext(sub_message['deleted']['object']),
                                    new_comment,
                                    'deleted',
                                    obj_id,
                                    version_id,
                                    ctt_id
                                )
                            )
                        )
                    else:
                        messages.append('')
                else:
                    messages.append(
                        'Deleted %s.' % (sub_message['deleted']['name'])
                    )

        new_comment = ' '.join(msg[0].upper() + msg[1:] if msg != '' else
                               '' for msg in messages)
        if new_comment == ' ':
            new_comment = 'No fields changed.'

    return new_comment or gettext('No fields changed.')
