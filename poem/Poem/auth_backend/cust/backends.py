from __future__ import unicode_literals
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import Permission
from Poem.poem.models import UserProfile

class CustModelBackend(ModelBackend):
    def get_group_permissions(self, user_obj, obj=None):
        if user_obj.is_anonymous or obj is not None:
            return set()
        if not hasattr(user_obj, '_group_perm_cache'):
            if user_obj.is_superuser:
                perms = Permission.objects.all()
            else:
                user_groupsofprofiles_field = UserProfile._meta.get_field('groupsofprofiles')
                user_groupsofprofiles_query = 'groupofprofiles__%s' % user_groupsofprofiles_field.related_query_name()
                obj = UserProfile.objects.get(user=user_obj)
                perms = Permission.objects.filter(**{user_groupsofprofiles_query: obj})
            perms = perms.values_list('content_type__app_label', 'codename').order_by()
            user_obj._group_perm_cache = set(["%s.%s" % (ct, name) for ct, name in perms])
        return user_obj._group_perm_cache
