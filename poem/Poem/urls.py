import os

from django.conf import settings
from django.conf.urls import include
from django.urls import path, re_path
from django.conf.urls.static import static
from django.views.generic import TemplateView

from Poem.django_logging import django_logging

django_logging()

# Apache settings
urlpatterns = [
    re_path(r'^ui', TemplateView.as_view(template_name='index.html')),
    re_path(r'^api/v2/', include('Poem.api.urls', namespace='poemapi')),
    re_path(r'^saml2/', include(('djangosaml2.urls', 'poem'), namespace='saml2')),
    re_path(r'^rest-auth/', include('rest_auth.urls')),
]

# Django development server settings
# urlpatterns = [
#     url(r'^$', lambda x: HttpResponseRedirect('/poem/admin/')),
#     url(r'^admin/', myadmin.urls),
#     url(r'^admin/lookups/', include(ajax_select_urls)),
#     url(r'^api/', include('Poem.urls_api')),
#     url(r'^saml2/', include(('djangosaml2.urls', 'poem'), namespace='saml2')),
# ] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) + \
#     static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
