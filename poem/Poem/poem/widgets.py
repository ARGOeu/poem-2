"""
Custom widgets for POEM Admin interface.
"""
# widgets.py
from django import forms
from django.utils.safestring import mark_safe
from Poem.poem.views import poem_namespace


class NamespaceTextInput(forms.TextInput):
    """
    Widget adding namespace to the profile name.
    """
    def render(self, name, value, attrs=None):
        output = super(NamespaceTextInput, self).render(name, value, attrs)
        return mark_safe(u'<span class="namespace">%s-</span> %s' % (poem_namespace(), output) )
