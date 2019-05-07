# Django settings
import os
from configparser import ConfigParser, NoSectionError
from django.core.exceptions import ImproperlyConfigured

VENV = '/home/pyvenv/poem'
APP_PATH = os.path.abspath(os.path.split(__file__)[0])
CONFIG_FILE = '{}/etc/poem/poem.conf'.format(VENV)
LOG_CONFIG = '{}/etc/poem/poem_logging.conf'.format(VENV)

try:
    config = ConfigParser()

    if not config.read([CONFIG_FILE]):
        raise ImproperlyConfigured('Unable to parse config file %s' % CONFIG_FILE)

    # General
    DEBUG = bool(config.get('GENERAL', 'debug'))
    TIME_ZONE = config.get('GENERAL', 'timezone')

    DBNAME = config.get('DATABASE', 'name')
    DBUSER = config.get('DATABASE', 'user')
    DBPASSWORD = config.get('DATABASE', 'password')
    DBHOST = config.get('DATABASE', 'host')
    DBPORT = config.get('DATABASE', 'port')

    if not all([DBNAME, DBHOST, DBPORT, DBUSER, DBPASSWORD]):
        raise ImproperlyConfigured('Missing database settings in %s' % CONFIG_FILE)

    DATABASES = {
        'default': {
            'ENGINE': 'tenant_schemas.postgresql_backend',
            'NAME': DBNAME,
            'USER': DBUSER,
            'PASSWORD': DBPASSWORD,
            'HOST': DBHOST,
            'PORT': DBPORT,
        }
    }

    DATABASE_ROUTERS = ('tenant_schemas.routers.TenantSyncRouter',)

    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'TIMEOUT': 7200,
            'OPTIONS': {
                'MAX_ENTRIES': 8192
            }
        }
    }

    ALLOWED_HOSTS = config.get('SECURITY', 'AllowedHosts')
    HOST_CERT = config.get('SECURITY', 'HostCert')
    HOST_KEY = config.get('SECURITY', 'HostKey')
    SECRETKEY_PATH = config.get('SECURITY', 'SecretKeyPath')
    WEBAPI_METRIC = config.get('WEBAPI', 'MetricProfile')
    WEBAPI_AGGREGATION = config.get('WEBAPI', 'AggregationProfile')


except NoSectionError as e:
    print(e)
    raise SystemExit(1)

except ImproperlyConfigured as e:
    print(e)
    raise SystemExit(1)

if ',' in ALLOWED_HOSTS:
    ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS.split(',')]
else:
    ALLOWED_HOSTS = [ALLOWED_HOSTS]

# Make this unique, and don't share it with anybody.
try:
    SECRET_KEY = open(SECRETKEY_PATH, 'r').read()
except Exception as e:
    print(SECRETKEY_PATH + ': %s' % repr(e))
    raise SystemExit(1)


AUTHENTICATION_BACKENDS = (
    'Poem.auth_backend.cust.backends.CustModelBackend',
    'Poem.auth_backend.saml2.backends.SAML2Backend',
)

AUTH_USER_MODEL = 'poem.CustUser'
ROOT_URLCONF = 'Poem.urls'

APPEND_SLASH = True

SHARED_APPS = (
    'tenant_schemas',
    'Poem.tenants',
    'django.contrib.contenttypes',
)

TENANT_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'django.contrib.messages',
    'django.contrib.sessions',
    'ajax_select',
    'djangosaml2',
    'modelclone',
    'reversion',
    'reversion_compare',
    'rest_framework',
    'rest_framework_api_key',
    'webpack_loader',
    'Poem.api',
    'Poem.poem',
)

INSTALLED_APPS = (
    'tenant_schemas',
    'Poem.tenants',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'django.contrib.messages',
    'django.contrib.sessions',
    'ajax_select',
    'djangosaml2',
    'modelclone',
    'reversion',
    'reversion_compare',
    'rest_framework',
    'rest_framework_api_key',
    'webpack_loader',
    'Poem.api',
    'Poem.poem',
)

TENANT_MODEL = 'tenants.Tenant'

MIDDLEWARE = [
    'tenant_schemas.middleware.TenantMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': ['{}/poem/templates/'.format(APP_PATH)],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

TEMPLATE_CONTEXT_PROCESSORS = ('django.core.context_processors.request',)

AJAX_LOOKUP_CHANNELS = {
    'hintsvo' : ('Poem.poem.lookups', 'VOLookup'),
    'hintstags' : ('Poem.poem.lookups', 'TagsLookup'),
    'hintsprobes' : ('Poem.poem.lookups', 'ProbeLookup'),
    'hintsmetricsfilt' : ('Poem.poem.lookups', 'MetricsFilteredLookup'),
    'hintsmetricsall' : ('Poem.poem.lookups', 'MetricsAllLookup'),
    'hintsmetricinstances' : ('Poem.poem.lookups', 'MetricsInstancesLookup'),
    'hintsserviceflavours' : ('Poem.poem.lookups', 'ServiceFlavoursLookup'),
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

SITE_ID = 1

USE_I18N = True
LANGUAGE_CODE = 'en-us'
USE_L10N = True

URL_DEBUG = True
TEMPLATE_DEBUG = DEBUG

# Django REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ]
}
TOKEN_HEADER = 'HTTP_X_API_KEY'

# Django development server settings
# MEDIA_URL = '/poem_media/'
# MEDIA_ROOT = '{}/usr/share/poem/media/'.format(VENV)
# STATIC_URL = '/static/'
DEFAULT_FILE_STORAGE = 'tenant_schemas.storage.TenantFileSystemStorage'

STATICFILES_DIRS = [os.path.join(APP_PATH, 'assets')]

# Apache settings
STATIC_URL = '/static/'
STATIC_ROOT = '{}/usr/share/poem/static/'.format(VENV)

# load SAML settings
LOGIN_REDIRECT_URL = '/poem/admin/poem/profile'
LOGOUT_REDIRECT_URL = '/poem/admin'
SAML_CONFIG_LOADER = 'Poem.poem.saml2.config.get_saml_config'
SESSION_EXPIRE_AT_BROWSER_CLOSE = True


WEBPACK_LOADER = {
    'DEFAULT': {
        'BUNDLE_DIR_NAME': 'bundles/',
        'STATS_FILE': os.path.join(APP_PATH, 'webpack-stats.json')
    }
}
