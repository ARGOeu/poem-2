import sys
import os
from distutils.sysconfig import get_python_lib

sys.path.append(get_python_lib() + '/django/contrib/admin/static/admin/')
os.environ['DJANGO_SETTINGS_MODULE'] = 'Poem.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
