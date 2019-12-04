from django.db import models


class Probe(models.Model):
    name = models.CharField(max_length=128, null=False, unique=True)
    version = models.CharField(max_length=28)
    description = models.CharField(max_length=1024)
    comment = models.CharField(max_length=512)
    repository = models.CharField(max_length=512)
    docurl = models.CharField(max_length=512)
    user = models.CharField(max_length=32, blank=True)
    datetime = models.DateTimeField(blank=True, max_length=32, null=True)

    class Meta:
        verbose_name = 'Probe'
        app_label = 'poem_super_admin'

    def __str__(self):
        return u'%s (%s)' % (self.name, self.version)
