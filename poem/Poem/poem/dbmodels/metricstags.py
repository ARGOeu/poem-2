import json

from django.contrib.auth.models import GroupManager, Permission
from django.db import models, transaction
from django.db.models.signals import post_delete
from django.utils.translation import ugettext_lazy as _
from django.contrib.contenttypes.models import ContentType

from reversion.models import Version, Revision
from reversion.signals import post_revision_commit, pre_revision_commit


class Metrics(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)

    class Meta:
        permissions = (('metricsown', 'Read/Write/Modify'),)
        app_label = 'poem'

    def __str__(self):
        return u'%s' % self.name


class Tags(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)

    class Meta:
        app_label = 'poem'

    def __str__(self):
        return u'%s' % (self.name)


class MetricType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)

    class Meta:
        app_label = 'poem'

    def __str__(self):
        return u'%s' % (self.name)


class GroupOfMetrics(models.Model):
    name = models.CharField(_('name'), max_length=80, unique=True)
    permissions = models.ManyToManyField(Permission,
                                         verbose_name=_('permissions'), blank=True)
    metrics = models.ManyToManyField(Metrics, blank=True)
    objects = GroupManager()

    class Meta:
        verbose_name = _('Group of metrics')
        verbose_name_plural = _('Groups of metrics')
        app_label = 'poem'

    def __str__(self):
        return self.name

    def natural_key(self):
        return (self.name,)


class Metric(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)
    tag = models.ForeignKey(Tags, on_delete=models.CASCADE)
    mtype = models.ForeignKey(MetricType, on_delete=models.CASCADE)
    probeversion = models.CharField(max_length=128)
    probekey = models.ForeignKey(Version, blank=True, null=True, on_delete=models.SET_NULL)
    group = models.ForeignKey(GroupOfMetrics, null=True, on_delete=models.CASCADE)
    parent = models.CharField(max_length=128)
    probeexecutable = models.CharField(max_length=128)
    config = models.CharField(max_length=1024)
    attribute = models.CharField(max_length=1024)
    dependancy = models.CharField(max_length=1024)
    flags = models.CharField(max_length=1024)
    files = models.CharField(max_length=1024)
    parameter = models.CharField(max_length=1024)
    fileparameter = models.CharField(max_length=1024)
    cloned = models.CharField(max_length=128, null=True)

    class Meta:
        app_label = 'poem'
        verbose_name = 'Metric'
        unique_together = (('name', 'tag'),)

    def __str__(self):
        return u'%s (%s)' % (self.name, self.tag)


class MetricDependancy(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem'


class MetricFlags(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem'


class MetricFiles(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem'


class MetricParameter(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem'


class MetricFileParameter(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem'


class MetricAttribute(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem'


class MetricConfig(models.Model):
    key = models.CharField(max_length=384, blank=True, null=True)
    value = models.CharField(max_length=384, blank=True, null=True)
    metric = models.ForeignKey(Metric, blank=True, null=True, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem'


class MetricParent(models.Model):
    metric = models.ForeignKey(Metric, blank=True, null=True, on_delete=models.CASCADE)
    value = models.CharField(max_length=384, null=True,
                            help_text='Parent metric')
    class Meta:
        app_label = 'poem'


class MetricProbeExecutable(models.Model):
    metric = models.ForeignKey(Metric, blank=True, null=True, on_delete=models.CASCADE)
    value = models.CharField(max_length=384, null=True,
                            help_text='Probe executable')
    class Meta:
        app_label = 'poem'


def delete_entryfield(*args, **kwargs):
    i = kwargs['instance']
    deletedentry = '{0} {1}'.format(i.key, i.value)
    field = i.__class__.__name__.split('Metric')[1].lower()
    try:
        fielddata = json.loads(eval('i.metric.%s' % field))
        if deletedentry in fielddata:
            fielddata.remove(deletedentry)
            codestr = """i.metric.%s = json.dumps(fielddata)""" % field
            exec(codestr)
            i.metric.save()
    except Metric.DoesNotExist as e:
        pass

post_delete.connect(delete_entryfield, sender=MetricAttribute)
post_delete.connect(delete_entryfield, sender=MetricConfig)
post_delete.connect(delete_entryfield, sender=MetricDependancy)
post_delete.connect(delete_entryfield, sender=MetricFlags)
post_delete.connect(delete_entryfield, sender=MetricParameter)
post_delete.connect(delete_entryfield, sender=MetricFiles)
post_delete.connect(delete_entryfield, sender=MetricFileParameter)


def copy_derived_metric(revision, sender, signal, versions, **kwargs):
    """Realize copying of metric configuration changes from derived metric
       configuration

    """
    if len(versions) == 1:
        version = versions[0]
    ct = ContentType.objects.get_for_id(version.content_type_id)
    metric_ct = ContentType.objects.get_for_model(Metric)
    if ct.pk == metric_ct.pk:
        instance = ct.get_object_for_this_type(id=int(version.object_id))
        if instance.cloned:
            vers = list()
            derived_id = int(instance.cloned)
            ct = ContentType.objects.get_for_model(Metric)
            # Although get_for_object() VersionQuerySet should return date ordered
            # version, it does not so we sort manually
            # derived_vers = Version.objects.get_for_object(Metric.objects.get(pk=derived_id))
            derived_vers = Version.objects.filter(object_id=derived_id,
                                                  content_type_id=ct.id).order_by('revision__date_created')
            for v in derived_vers:
                rev = Revision.objects.get(pk=v.revision_id)
                copy_rev = Revision(date_created=rev.date_created,
                                    user_id=rev.user_id, comment=rev.comment)
                ver = Version(object_id=str(instance.id),
                              content_type_id=ct.id,
                              format=v.format,
                              serialized_data=v.serialized_data,
                              object_repr=v.object_repr,
                              db='default')

                copy_rev.save()
                # date_created is auto_now_add field which will contain the
                # timestamp when the model record is created. overwrite that
                # with the timestamp of copied revision.
                Revision.objects.filter(pk=copy_rev.id).update(date_created=rev.date_created)
                ver.revision = copy_rev
                data = json.loads(ver.serialized_data)[0]
                data['pk'] = instance.id
                ver.serialized_data = json.dumps([data])
                vers.append(ver)

            Version.objects.bulk_create(vers)

pre_revision_commit.connect(copy_derived_metric)
