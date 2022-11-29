from rest_framework import serializers

from Poem.poem import models
from Poem.poem_super_admin.models import Probe, MetricTags, DefaultPort
from Poem.users.models import CustUser


class AggregationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('name', 'description', 'apiid', 'groupname')
        model = models.Aggregation


class MetricProfileSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('name', 'description', 'apiid', 'groupname', )
        model = models.MetricProfiles


class ReportsSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('name', 'description', 'apiid', 'groupname', )
        model = models.Reports


class UsersSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('first_name', 'last_name', 'username', 'is_active',
                  'is_superuser', 'email', 'date_joined', 'pk')
        model = CustUser


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('subject', 'egiid', 'displayname')
        model = models.UserProfile


class ProbeSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        return Probe.objects.create(**validated_data)

    class Meta:
        model = Probe
        fields = '__all__'


class ThresholdsProfileSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        return models.ThresholdsProfiles.objects.create(**validated_data)

    class Meta:
        fields = ('name', 'description', 'apiid', 'groupname',)
        model = models.ThresholdsProfiles


class DefaultPortsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DefaultPort
        fields = "__all__"
