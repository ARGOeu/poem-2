from django.db import models


class Service(models.Model):
    id = models.CharField(max_length=1024, primary_key=True)
    service_id = models.CharField(max_length=1024)
    service_name = models.CharField(max_length=128, null=True)
    service_category = models.CharField(max_length=1024, null=True)
    service_version = models.CharField(max_length=1024, null=True)
    service_type = models.CharField(max_length=1024, null=True)
    component_version = models.CharField(max_length=1024, null=True)
    component_name = models.CharField(max_length=1024, null=True)
    visible_to_marketplace = models.BooleanField(default=False)
    in_catalogue = models.BooleanField(default=False)
    external_service = models.BooleanField(default=False)
    internal_service = models.BooleanField(default=False)

    class Meta:
        app_label = 'poem'

    def __str__(self):
        return self.service_name


class ServiceFlavour(models.Model):
    name = models.CharField(max_length=128, help_text='',
                            verbose_name='Service flavour',
                            primary_key=True)
    description = models.CharField(max_length=1024, blank=True, null=True)

    class Meta:
        app_label = 'poem'

    def __str__(self):
        return u'%s' % self.name


class MetricInstance(models.Model):
    id = models.AutoField(primary_key=True)
    service_flavour = models.CharField(max_length=128)
    metric = models.CharField(max_length=128)

    class Meta:
        app_label = 'poem'

    def __str__(self):
        return u'%s %s' % (self.service_flavour, self.metric)
