from Poem.api.models import MyAPIKeyManager
from django.db import models
from rest_framework_api_key.models import AbstractAPIKey


class WebAPIKey(AbstractAPIKey):
    objects = MyAPIKeyManager()

    token = models.CharField(max_length=100)
