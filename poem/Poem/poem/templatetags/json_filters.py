from django import template
from django.template.defaultfilters import stringfilter
from django.core.serializers import serialize
from django.db.models.query import QuerySet
from django.utils.safestring import mark_safe

import json

register = template.Library()

# TODO: use Django 2.1 builtin once the update happens

@register.filter(name='jsonify')
def jsonify(object):
    return mark_safe(json.dumps(object))
