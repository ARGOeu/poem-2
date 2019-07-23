from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models.signals import post_delete
import json
from reversion.models import Version, Revision
from reversion.signals import pre_revision_commit


class MetricTemplateType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)

    class Meta:
        app_label = 'poem_super_admin'

    def __str__(self):
        return u'%s' % self.name


class MetricTemplate(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=128)
    mtype = models.ForeignKey(MetricTemplateType, on_delete=models.CASCADE)
    probeversion = models.CharField(max_length=128)
    probekey = models.ForeignKey(Version, blank=True, null=True,
                                 on_delete=models.SET_NULL)
    parent = models.CharField(max_length=128)
    probeexecutable = models.CharField(max_length=128)
    config = models.CharField(max_length=1024)
    attribute = models.CharField(max_length=1024)
    dependency = models.CharField(max_length=1024)
    flags = models.CharField(max_length=1024)
    files = models.CharField(max_length=1024)
    parameter = models.CharField(max_length=1024)
    fileparameter = models.CharField(max_length=1024)
    cloned = models.CharField(max_length=128, null=True)

    class Meta:
        app_label = 'poem_super_admin'
        verbose_name = 'Metric template'

    def __str__(self):
        return u'%s' % self.name


class MetricTemplateDependency(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metrictemplate = models.ForeignKey(MetricTemplate, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem_super_admin'


class MetricTemplateFlags(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metrictemplate = models.ForeignKey(MetricTemplate, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem_super_admin'


class MetricTemplateFiles(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metrictemplate = models.ForeignKey(MetricTemplate, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem_super_admin'


class MetricTemplateParameter(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metrictemplate = models.ForeignKey(MetricTemplate, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem_super_admin'


class MetricTemplateFileParameter(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metrictemplate = models.ForeignKey(MetricTemplate, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem_super_admin'


class MetricTemplateAttribute(models.Model):
    key = models.CharField(max_length=384)
    value = models.CharField(max_length=384)
    metrictemplate = models.ForeignKey(MetricTemplate, on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem_super_admin'


class MetricTemplateConfig(models.Model):
    key = models.CharField(max_length=384, blank=True, null=True)
    value = models.CharField(max_length=384, blank=True, null=True)
    metrictemplate = models.ForeignKey(MetricTemplate, blank=True, null=True,
                                       on_delete=models.CASCADE)

    class Meta:
        app_label = 'poem_super_admin'


class MetricTemplateParent(models.Model):
    metrictemplate = models.ForeignKey(MetricTemplate, blank=True, null=True,
                                       on_delete=models.CASCADE)
    value = models.CharField(max_length=384, null=True,
                             help_text='Parent metric')
    class Meta:
        app_label = 'poem_super_admin'


class MetricTemplateProbeExecutable(models.Model):
    metrictemplate = models.ForeignKey(MetricTemplate, blank=True, null=True,
                                       on_delete=models.CASCADE)
    value = models.CharField(max_length=384, null=True,
                             help_text='Probe executable')
    class Meta:
        app_label = 'poem_super_admin'


def delete_template_entryfield(*args, **kwargs):
    i = kwargs['instance']
    deletedentry = '{0} {1}'.format(i.key, i.value)
    field = i.__class__.__name__.split('MetricTemplate')[1].lower()
    try:
        fielddata = json.loads(eval('i.metrictemplate.%s' % field))
        if deletedentry in fielddata:
            fielddata.remove(deletedentry)
        codestr = """i.metrictemplate.%s = json.dumps(fielddata)""" % field
        exec(codestr)
        i.metrictemplate.save()
    except MetricTemplate.DoesNotExist as e:
        pass

post_delete.connect(delete_template_entryfield, sender=MetricTemplateAttribute)
post_delete.connect(delete_template_entryfield, sender=MetricTemplateConfig)
post_delete.connect(delete_template_entryfield, sender=MetricTemplateDependency)
post_delete.connect(delete_template_entryfield, sender=MetricTemplateFlags)
post_delete.connect(delete_template_entryfield, sender=MetricTemplateParameter)
post_delete.connect(delete_template_entryfield, sender=MetricTemplateFiles)
post_delete.connect(delete_template_entryfield, sender=MetricTemplateFileParameter)


def copy_derived_metric(revision, sender, signal, versions, **kwargs):
    """Realize copying of metric configuration changes from derived metric
       configuration

    """
    if len(versions) == 1:
        version = versions[0]
    ct = ContentType.objects.get_for_id(version.content_type_id)
    metric_ct = ContentType.objects.get_for_model(MetricTemplate)
    if ct.pk == metric_ct.pk:
        instance = ct.get_object_for_this_type(id=int(version.object_id))
        if instance.cloned:
            vers = list()
            derived_id = int(instance.cloned)
            ct = ContentType.objects.get_for_model(MetricTemplate)
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
