from django.urls import path

from . import views_internal

app_name = 'poem'

urlpatterns = [
    path('config_options/', views_internal.GetConfigOptions.as_view(), name='config_options'),
    path('saml2login', views_internal.Saml2Login.as_view(), name='saml2login'),
    path('metrics/<str:group>', views_internal.ListMetricsInGroup.as_view(), name='metrics'),
    path('tokens/', views_internal.ListTokens.as_view(), name='tokens'),
    path('tokens/<str:name>', views_internal.ListTokenForTenant.as_view(), name='tokens'),
    path('users/', views_internal.ListUsers.as_view(), name='users'),
    path('users/<str:username>', views_internal.ListUsers.as_view(), name='users'),
    path('groups/', views_internal.ListGroupsForUser.as_view(), name='groups'),
    path('services/', views_internal.ListServices.as_view(), name='services'),
    path('groups/<str:group>', views_internal.ListGroupsForUser.as_view(), name='groups'),
    path('probes/<str:probe_name>', views_internal.ListProbes.as_view(), name='probes'),
    path('aggregations/', views_internal.ListAggregations.as_view(), name='aggregations'),
    path('aggregations/<str:aggregation_name>', views_internal.ListAggregations.as_view(), name='aggregations'),
]
