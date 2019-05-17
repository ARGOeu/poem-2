from django.utils.translation import ugettext_lazy as _
from django.db import models

class Saml2LoginCache(models.Model):
    username = models.CharField(_('username'), max_length=30, unique=True)
    first_name = models.CharField(_('first name'), max_length=30, blank=True)
    last_name = models.CharField(_('last name'), max_length=30, blank=True)
    is_superuser = models.BooleanField(_('superuser status'), default=False)

    class Meta:
        verbose_name = 'Saml2LoginCache'
        app_label = 'poem'

