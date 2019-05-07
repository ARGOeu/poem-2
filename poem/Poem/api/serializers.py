from rest_framework import serializers

from Poem.poem import models


class AggregationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ('name', 'apiid', 'groupname')
        model = models.Aggregation


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
