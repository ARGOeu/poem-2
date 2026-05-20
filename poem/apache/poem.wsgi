import sys
import os
import sysconfig

sys.path.append(sysconfig.get_paths()['purelib'] + '/django/contrib/admin/static/admin/')
os.environ['DJANGO_SETTINGS_MODULE'] = 'Poem.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
