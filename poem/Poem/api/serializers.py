from rest_framework import serializers

from Poem.poem import models
from Poem.users.models import CustUser


class AggregationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('name', 'apiid', 'groupname')
        model = models.Aggregation


class MetricProfileSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('name', 'apiid', 'groupname', )
        model = models.MetricProfiles


class ServiceFlavourSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('name', 'description', )
        model = models.ServiceFlavour


class MetricsSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('name', )
        model = models.Metrics


class UsersSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('first_name', 'last_name', 'username', 'is_active',
                  'is_superuser', 'is_staff', 'email', 'date_joined')
        model = CustUser


class MetricInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('service_flavour', 'metric')
        model = models.MetricInstance


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('subject', 'egiid', 'displayname')
        model = models.UserProfile
