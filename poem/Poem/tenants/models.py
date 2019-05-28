from django.db import models
from tenant_schemas.models import TenantMixin


class Tenant(TenantMixin):
    name = models.CharField(max_length=100)
    created_on = models.DateField(auto_now_add=True)

    auto_create_schema = True

    class Meta:
        app_label = 'tenants'
