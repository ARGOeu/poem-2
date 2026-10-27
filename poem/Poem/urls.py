import os

from django.conf import settings
from django.conf.urls import include
from django.conf.urls.static import static
from django.http import HttpResponseRedirect
from django.urls import path, re_path
from django.views.generic import TemplateView

from Poem.django_logging import django_logging

django_logging()

# Apache settings
urlpatterns = [
    re_path(r'^$', lambda x: HttpResponseRedirect('/ui/login')),
    re_path(r'^ui', TemplateView.as_view(template_name='index.html')),
    re_path(r'^api/v2/', include('Poem.api.urls', namespace='poemapi')),
    re_path(r'^dj-rest-auth/', include('dj_rest_auth.urls')),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
