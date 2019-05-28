from django import template

from Poem.helpers.versioned_comments import new_comment

register = template.Library()


@register.simple_tag
def get_new_comment(comment, obj_id=None, version_id=None, ctt_id=None):
    return new_comment(comment, obj_id, version_id, ctt_id)
