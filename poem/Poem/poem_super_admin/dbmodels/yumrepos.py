from django.db import models


class PackageManager(models.Manager):
    def get_by_natural_key(self, name, version):
        return self.get(name=name, version=version)


class NameManager(models.Manager):
    def get_by_natural_key(self, name):
        return self.get(name=name)


class OSTag(models.Model):
    name = models.CharField(max_length=128, unique=True)

    objects = NameManager()

    class Meta:
        app_label = 'poem_super_admin'

    def __str__(self):
        return u'%s' % self.name

    def natural_key(self):
        return (self.name,)


class YumRepo(models.Model):
    name = models.TextField(unique=True)
    content = models.TextField(blank=True)
    description = models.TextField()

    objects = NameManager()

    class Meta:
        app_label = 'poem_super_admin'

    def natural_key(self):
        return (self.name,)


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
