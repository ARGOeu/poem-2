import os

from django.conf import settings
from django.conf.urls import include, url
from django.conf.urls.static import static
from django.views.generic import TemplateView

from Poem.django_logging import django_logging

django_logging()

# Apache settings
urlpatterns = [
    url(r'^$', TemplateView.as_view(template_name='index.html')),
    url(r'^api/0.2/', include('Poem.poem.urls')),
    url(r'^api/v2/', include('Poem.api.urls', namespace='poemapi')),
    url(r'^saml2/', include(('djangosaml2.urls', 'poem'), namespace='saml2')),
    url(r'^rest-auth/', include('rest_auth.urls')),
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
