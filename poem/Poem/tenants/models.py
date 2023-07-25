from django.db import models
from django_tenants.models import TenantMixin, DomainMixin


class Tenant(TenantMixin):
    name = models.CharField(max_length=100)
    combined = models.BooleanField(default=False)
    created_on = models.DateField(auto_now_add=True)

    auto_drop_schema = True
    auto_create_schema = True

    class Meta:
        app_label = 'tenants'


class Domain(DomainMixin):
    pass
