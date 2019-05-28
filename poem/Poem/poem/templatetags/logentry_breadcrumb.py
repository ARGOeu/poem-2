from django import template
from django.template.defaultfilters import stringfilter


register = template.Library()


@register.filter(name='first_sentence')
@stringfilter
def first_sentence(value):
    return value.split(' - ')[0].strip() + '.'
