from gettext import gettext

from django.contrib import admin
from django.utils.html import format_html

from Poem.poem.models import *
from Poem.helpers.versioned_comments import new_comment

from reversion.models import Version, Revision


def get_new_logentry_name(obj):
    if obj.is_addition():
        return gettext('Added "%(object)s".' % {'object': obj.object_repr})
    elif obj.is_change():
        return gettext('Changed "%(object)s".' % {'object': obj.object_repr})
    elif obj.is_deletion():
        return gettext('Deleted "%(object)s".' % {'object': obj.object_repr})


def get_version_id(obj):
    vers = Version.objects.filter(
        object_id=obj.object_id,
        object_repr=obj.object_repr,
        content_type_id=obj.content_type.id
    )
    revs = []
    for ver in vers:
        revs.append(Revision.objects.get(id=ver.id).date_created)

    date = min(revs, key=lambda x: abs(x - obj.action_time))
    ver = vers[revs.index(date)]
    return ver.id


class LogEntryAdmin(admin.ModelAdmin):
    class Media:
        css = {"all": ("/poem_media/css/siteactions.css",
                       "/poem_media/ajax_select/css/ajax_select.css")}
        js = ("/poem_media/ajax_select/js/ajax_select.js",
              "/poem_media/ajax_select/js/bootstrap.js")

    def log_entry_name(obj):
        return get_new_logentry_name(obj)
    log_entry_name.short_description = 'Log entry'

    def new_change_message(self, obj):
        if obj.content_type.model in ('probe', 'metric'):
            change_message = new_comment(
                obj.change_message,
                obj.object_id,
                get_version_id(obj),
                obj.content_type.id
            )
        else:
            change_message = new_comment(
                comment=obj.change_message,
                obj_id=obj.object_id,
                ctt_id=obj.content_type.id
            )
        return change_message
    new_change_message.short_description = 'change message'

    def obj_repr(self, obj):
        if obj.content_type.model in ('probe', 'metric'):
            url = '/poem/admin/poem/{}/{}/history/{}/'.format(
                obj.content_type.model,
                obj.object_id,
                get_version_id(obj)
            )
        else:
            url = '/poem/admin/poem/{}/{}/change/'.format(
                obj.content_type.model,
                obj.object_id
            )
        urlrepr = format_html(
            '<a href="{0}">{1}</a>',
            (url),
            obj.object_repr,
        )
        return urlrepr
    obj_repr.short_description = 'object representation'

    list_display = (log_entry_name, 'user', 'action_time')
    list_filter = (
        ('content_type', admin.RelatedOnlyFieldListFilter),
    )
    fields = ('content_type', 'user', 'action_time', 'obj_repr',
              'new_change_message')
    readonly_fields = (
        'content_type',
        'user',
        'action_time',
        'obj_repr',
        'new_change_message'
    )
    search_fields = ['user__username']
    date_hierarchy = 'action_time'

    def has_delete_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request, obj=None):
        return False

    def get_actions(self, request):
        actions = super(LogEntryAdmin, self).get_actions(request)
        del actions['delete_selected']
        return actions


    def change_view(self, request, object_id, form_url='', extra_context=None):
        """
        Overriding admin.ModelAdmin change_view so that it doesn't show save
        button in change_view
        """
        extra_context = extra_context or {}
        extra_context['show_save_and_continue'] = False
        extra_context['show_save'] = False
        return super(LogEntryAdmin, self).change_view(request, object_id,
                                                      form_url, extra_context=extra_context)
