from django.db import models


class PackageManager(models.Manager):
    def get_by_natural_key(self, name, version):
        return self.get(name=name, version=version)


class YumRepo(models.Model):
    name = models.TextField(unique=True)
    content = models.TextField(blank=True)
    description = models.TextField()

    class Meta:
        app_label = 'poem_super_admin'


class Package(models.Model):
    name = models.TextField(null=False)
    version = models.TextField(null=False)
    repo = models.ForeignKey(YumRepo, null=True, on_delete=models.SET_NULL)

    objects = PackageManager()

    class Meta:
        app_label = 'poem_super_admin'
        unique_together = [['name', 'version']]

    def __str__(self):
        return u'%s (%s)' % (self.name, self.version)

    def natural_key(self):
        return (self.name, self.version)
