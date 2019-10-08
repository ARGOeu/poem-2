from django.urls import path

from . import views_internal

app_name = 'poem'

urlpatterns = [
    path('aggregations/', views_internal.ListAggregations.as_view(), name='aggregations'),
    path('aggregations/<str:aggregation_name>', views_internal.ListAggregations.as_view(), name='aggregations'),
    path('aggregationsgroup/', views_internal.ListAggregationsInGroup.as_view(), name='aggregationprofiles'),
    path('aggregationsgroup/<str:group>', views_internal.ListAggregationsInGroup.as_view(), name='aggregationprofiles'),
    path('apikeys/', views_internal.ListAPIKeys.as_view(), name='tokens'),
    path('apikeys/<str:name>', views_internal.ListAPIKeys.as_view(), name='tokens'),
    path('config_options/', views_internal.GetConfigOptions.as_view(), name='config_options'),
    path('groups/', views_internal.ListGroupsForUser.as_view(), name='groups'),
    path('groups/<str:group>', views_internal.ListGroupsForUser.as_view(), name='groups'),
    path('probes/', views_internal.ListProbes.as_view(), name='probes'),
    path('probes/<str:name>', views_internal.ListProbes.as_view(), name='probes'),
    path('metric/', views_internal.ListMetric.as_view(), name='metric'),
    path('metric/<str:name>', views_internal.ListMetric.as_view(), name='metric'),
    path('metricprofiles/', views_internal.ListMetricProfiles.as_view(), name='metricprofiles'),
    path('metricprofiles/<str:profile_name>', views_internal.ListMetricProfiles.as_view(), name='metricprofiles'),
    path('metricprofilesgroup/', views_internal.ListMetricProfilesInGroup.as_view(), name='metricprofilesgroup'),
    path('metricprofilesgroup/<str:group>', views_internal.ListMetricProfilesInGroup.as_view(), name='metricprofilesgroup'),
    path('metricsall/', views_internal.ListAllMetrics.as_view(), name='metricsall'),
    path('metricsgroup/', views_internal.ListMetricsInGroup.as_view(), name='metrics'),
    path('metricsgroup/<str:group>', views_internal.ListMetricsInGroup.as_view(), name='metrics'),
    path('mtypes/', views_internal.ListMetricTypes.as_view(), name='mtypes'),
    path('saml2login', views_internal.Saml2Login.as_view(), name='saml2login'),
    path('schema/', views_internal.GetPoemVersion.as_view(), name='schema'),
    path('serviceflavoursall/', views_internal.ListAllServiceFlavours.as_view(), name='serviceflavoursall'),
    path('services/', views_internal.ListServices.as_view(), name='services'),
    path('tags/', views_internal.ListTags.as_view(), name='tags'),
    path('usergroups/', views_internal.ListGroupsForGivenUser.as_view(), name='usergroups'),
    path('usergroups/<str:username>', views_internal.ListGroupsForGivenUser.as_view(), name='usergroups'),
    path('userprofile/', views_internal.GetUserprofileForUsername.as_view(), name='userprofile'),
    path('userprofile/<str:username>', views_internal.GetUserprofileForUsername.as_view(), name='userprofile'),
    path('users/', views_internal.ListUsers.as_view(), name='users'),
    path('users/<str:username>', views_internal.ListUsers.as_view(), name='users'),
    path('version/<str:obj>/<str:name>', views_internal.ListVersions.as_view(), name='version'),
]
