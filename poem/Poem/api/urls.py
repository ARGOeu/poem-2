from django.urls import path
from django.conf.urls import include, url

from . import views

app_name = 'poem'

urlpatterns = [
    path('profiles/', views.ListProfile.as_view()),
    path('profiles/<str:name>', views.DetailProfile.as_view()),
    path('metrics/', views.ListMetrics.as_view()),
    path('metrics/<str:tag>', views.ListTaggedMetrics.as_view()),
    path('internal/', include('Poem.api.urls_internal', namespace='internal'))
]
