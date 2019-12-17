from django.db import models


class PackageManager(models.Manager):
    def get_by_natural_key(self, name, version):
        return self.get(name=name, version=version)


class TagManager(models.Manager):
    def get_by_natural_key(self, name):
        return self.get(name=name)


class YumRepoManager(models.Manager):
    def get_by_natural_key(self, name, tag):
        return self.get(name=name, tag__name=tag)


class OSTag(models.Model):
    name = models.CharField(max_length=128, unique=True)

    objects = TagManager()

    class Meta:
        app_label = 'poem_super_admin'

    def __str__(self):
        return u'%s' % self.name

    def natural_key(self):
        return (self.name,)


class YumRepo(models.Model):
    name = models.TextField(max_length=128)
    tag = models.ForeignKey(OSTag, on_delete=models.CASCADE)
    content = models.TextField(blank=True)
    description = models.TextField()

    objects = YumRepoManager()

    class Meta:
        app_label = 'poem_super_admin'
        unique_together = [['name', 'tag']]

    def natural_key(self):
        return (self.name, self.tag.name)


class Package(models.Model):
    name = models.TextField(null=False)
    version = models.TextField(null=False)
    repos = models.ManyToManyField(YumRepo)

    objects = PackageManager()

    class Meta:
        app_label = 'poem_super_admin'
        unique_together = [['name', 'version']]

    def __str__(self):
        return u'%s (%s)' % (self.name, self.version)

    def natural_key(self):
        return (self.name, self.version)
