from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.utils.translation import ugettext_lazy as _

from Poem.poem.dbmodels.aggregations import GroupOfAggregations
from Poem.poem.dbmodels.metricstags import GroupOfMetrics
from Poem.poem.dbmodels.probes import GroupOfProbes
from Poem.poem.dbmodels.metricprofiles import GroupOfMetricProfiles


class UserProfile(models.Model):
    """
    Extension of auth.User model that adds certificate DN.
    """
    class Meta:
        app_label = 'poem'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    subject = models.CharField(
        'distinguishedName',
        max_length=512,
        blank=True,
        null=True
    )
    egiid = models.CharField(
        'eduPersonUniqueId',
        max_length=255,
        blank=True,
        null=True,
        unique=True
    )
    displayname = models.CharField(
        'displayName',
        max_length=30,
        blank=True,
        null=True
    )
    groupsofmetricprofiles = models.ManyToManyField(
        GroupOfMetricProfiles,
        verbose_name=_('groups of profiles'),
        blank=True,
        help_text=_('The groups of metric profiles that user will control.'),
        related_name='user_set',
        related_query_name='user'
    )
    groupsofmetrics = models.ManyToManyField(
        GroupOfMetrics,
        verbose_name=_('groups of metrics'),
        blank=True,
        help_text=_('The groups of metrics that user will control'),
        related_name='user_set',
        related_query_name='user'
    )
    groupsofprobes = models.ManyToManyField(
        GroupOfProbes,
        verbose_name=('groups of probes'),
        blank=True,
        help_text=_('The groups of probes that user will control'),
        related_name='user_set',
        related_query_name='user')
    groupsofaggregations = models.ManyToManyField(
        GroupOfAggregations,
        verbose_name=_('groups of aggregations'),
        blank=True,
        help_text=_('The groups of aggregations that user will control'),
        related_name='user_set',
        related_query_name='user'
    )


def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
post_save.connect(create_user_profile, sender=settings.AUTH_USER_MODEL)
