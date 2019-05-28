from django.forms import ModelForm
from django.utils.translation import gettext_lazy as _

from rest_framework_api_key.admin import APIKeyAdmin
from rest_framework_api_key.crypto import assign_token

from Poem.settings import SECRET_KEY


class APIKeyForm(ModelForm):
    class Meta:
        labels = {
            'client_id': _('Tenant'),
        }


class MyAPIKeyAdmin(APIKeyAdmin):
    """
        Derived from plugins' Admin panel. Override client_id form field as we
        would like to call it "Tenant". Also, override token creation and use
        default SECRET_KEY from settings and don't show it on UI.
    """
    class Media:
        css = { "all" : ("/poem_media/css/siteapikey.css",) }

    def tenant_name(obj):
        return obj.client_id
    tenant_name.short_description = 'Tenant'

    form = APIKeyForm
    list_display = (tenant_name, 'created', 'revoked')

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            assign_token(obj, SECRET_KEY)
            obj.save()
        else:
            obj.save()
