from django.db import models


class Service(models.Model):
    id = models.CharField(max_length=1024, primary_key=True)
    service_id = models.CharField(max_length=1024)
    service_name = models.CharField(max_length=128)
    service_area = models.CharField(max_length=1024)
    service_version = models.CharField(max_length=1024)
    service_type = models.CharField(max_length=1024)
    component_version = models.CharField(max_length=1024)
    component_name = models.CharField(max_length=1024)
    visible_to_marketplace = models.BooleanField(default=False)
    in_catalogue = models.BooleanField(default=False)
    external_service = models.BooleanField(default=False)
    internal_service = models.BooleanField(default=False)

    class Meta:
        app_label = 'poem'

    def __str__(self):
        return self.service_name
