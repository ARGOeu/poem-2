from django.conf.urls import include
from django.urls import path

from . import views

app_name = 'poem'

urlpatterns = [
    path('metrics/', views.ListMetrics.as_view()),
    path('metrics/<str:tag>/', views.ListMetrics.as_view()),
    path('repos/', views.ListRepos.as_view()),
    path('repos/<str:profile>/', views.ListRepos.as_view()),
    path('repos/<str:tag>', views.ListRepos.as_view()),
    path('metrictemplates/', views.ListMetricTemplates.as_view()),
    path('metrictemplates/<str:tag>', views.ListMetricTemplates.as_view()),
    path('internal/', include('Poem.api.urls_internal', namespace='internal'))
]
