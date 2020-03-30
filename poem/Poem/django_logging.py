import logging.config

from django.conf import settings

__all__ = ('django_logging')

class _Logging(object):
    def __init__(self):
        logging.config.fileConfig(settings.LOG_CONFIG)

LOG = _Logging()

def django_logging():
    return LOG

