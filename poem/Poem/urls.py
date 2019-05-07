import os

from django.conf.urls import include, url
from django.contrib import admin
from django.conf import settings
from django.http import HttpResponseRedirect
from Poem.django_logging import django_logging
from django.conf.urls.static import static

from ajax_select import urls as ajax_select_urls
from Poem.settings import URL_DEBUG
from Poem.poem.admin import myadmin

django_logging()

# Apache settings
urlpatterns = [
    url(r'^$', lambda x: HttpResponseRedirect('/poem/admin/')),
    url(r'^admin/', myadmin.urls),
    url(r'^admin/lookups/', include(ajax_select_urls)),
    url(r'^api/0.2/', include('Poem.poem.urls')),
    url(r'^api/v2/', include('Poem.api.urls', namespace='poemapi')),
    url(r'^saml2/', include(('djangosaml2.urls', 'poem'), namespace='saml2')),
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
