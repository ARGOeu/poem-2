from django.conf import settings
from django.db import models, connection
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.utils.translation import ugettext_lazy as _

from Poem.poem.dbmodels.aggregations import GroupOfAggregations
from Poem.poem.dbmodels.metricstags import GroupOfMetrics
from Poem.poem.dbmodels.metricprofiles import GroupOfMetricProfiles
from Poem.poem.dbmodels.thresholdsprofiles import GroupOfThresholdsProfiles
from Poem.poem.dbmodels.reports import GroupOfReports

from tenant_schemas.utils import get_public_schema_name


class UserProfile(models.Model):
    """
    Extension of auth.User model that adds certificate DN.
    """
    class Meta:
        app_label = 'poem'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING
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
    groupsofaggregations = models.ManyToManyField(
        GroupOfAggregations,
        verbose_name=_('groups of aggregations'),
        blank=True,
        help_text=_('The groups of aggregations that user will control'),
        related_name='user_set',
        related_query_name='user'
    )
    groupsofthresholdsprofiles = models.ManyToManyField(
        GroupOfThresholdsProfiles,
        verbose_name=_('groups of thresholds profiles'),
        blank=True,
        help_text=_('The groups of thresholds profiles that user will control'),
        related_name='user_set',
        related_query_name='user'
    )
    groupsofreports = models.ManyToManyField(
        GroupOfReports,
        verbose_name=_('groups of reports'),
        blank=True,
        help_text=_('The groups of reports that user will control'),
        related_name='user_set',
        related_query_name='user'
    )


@receiver(pre_delete, sender=settings.AUTH_USER_MODEL)
def on_delete_user(sender, instance, **kwargs):
    if connection.schema_name != get_public_schema_name():
        userprofile = UserProfile.objects.get(user=instance).delete()
