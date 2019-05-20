from rest_framework import serializers

from Poem.poem import models


class AggregationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('name', 'apiid', 'groupname')
        model = models.Aggregation


class UsersSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('first_name', 'last_name', 'username', 'is_active',
                  'is_superuser', 'is_staff', 'email', 'date_joined')
        model = models.CustUser


class MetricInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('service_flavour', 'metric')
        model = models.MetricInstance


class ProfileSerializer(serializers.ModelSerializer):
    metric_instances = MetricInstanceSerializer(many=True, read_only=True)

    class Meta:
        fields = (
            'name',
            'vo',
            'description',
            'metric_instances'
        )
        model = models.Profile
