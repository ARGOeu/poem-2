from django.db import models

class ServiceFlavour(models.Model):
    name = models.CharField(max_length=256, help_text='',
                            verbose_name='Service flavour',
                            primary_key=True)
    description = models.CharField(max_length=4096, blank=True, null=True)

    class Meta:
        app_label = 'poem'

    def __str__(self):
        return u'%s' % self.name
