from django.contrib import admin
from django.conf.urls import url
from . import views

admin.autodiscover()

urlpatterns = [
    url(r'^json/profiles/?$', views.Profiles.as_view()),
    url(r'^json/metrics_in_profiles/?$', views.MetricsInProfiles.as_view()),
    url(r'^json/metrics_in_group/?$', views.MetricsInGroup.as_view()),
    url(r'^json/metrics/?$', views.Metrics.as_view())
]
