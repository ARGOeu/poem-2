from django.db import models

from rest_framework_api_key.crypto import KeyGenerator
from rest_framework_api_key.models import AbstractAPIKey, BaseAPIKeyManager


class MyKeyGenerator(KeyGenerator):
    """
    Override generate method of KeyGenerator class to be able to fix the tenant
    token.
    """
    def generate(self, secret_key=None):
        prefix = self.get_prefix()
        if not secret_key:
            secret_key = self.get_secret_key()
        key = '{}.{}'.format(prefix, secret_key)
        hashed_key = self.hash(key)
        return key, prefix, hashed_key


class MyAPIKeyManager(BaseAPIKeyManager):
    """
    Calling MyAPIKey.objects.create_key() should create a key with given token
    if token is given; otherwise, it will generate token. Token will be saved
    in the database.
    """
    key_generator = MyKeyGenerator()

    def assign_key(self, obj):
        if obj.token:
            key, prefix, hashed_key = self.key_generator.generate(obj.token)
        else:
            key, prefix, hashed_key = self.key_generator.generate()

        pk = '{}.{}'.format(prefix, hashed_key)
        _, _, token = key.partition('.')

        obj.id = pk
        obj.token = token
        obj.prefix = prefix
        obj.hashed_key = hashed_key

        return obj, key

    def is_valid(self, key):
        queryset = self.get_usable_keys()

        try:
            api_key = queryset.get(token=key)
            test_key = '{}.{}'.format(api_key.prefix, key)
        except self.model.DoesNotExist:
            return False

        if not api_key.is_valid(test_key):
            return False

        if api_key.has_expired:
            return False

        return True


class MyAPIKey(AbstractAPIKey):
    objects = MyAPIKeyManager()

    token = models.CharField(max_length=100)
