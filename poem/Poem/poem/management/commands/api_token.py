from django.core.management.base import BaseCommand, CommandError
from django.db.utils import IntegrityError

from rest_framework_api_key.models import APIKey
from rest_framework_api_key.crypto import _generate_token, hash_token

from Poem.settings import SECRET_KEY

import datetime


class Command(BaseCommand):
    help = """Create a token for tenant. If token is not specified, it will be
              automatically generated. If tenant already exist, his token will be
              updated."""

    def add_arguments(self, parser):
        parser.add_argument('--tenant', required=True, type=str)
        parser.add_argument('--token', nargs='?', type=str)

    def handle(self, *args, **kwargs):
        token = None

        if kwargs['token'] is None:
            token = _generate_token()
        else:
            token = kwargs['token']

        hashed_token = hash_token(token, SECRET_KEY)
        entry = dict(client_id=kwargs['tenant'],
                     token=token,
                     hashed_token=hashed_token)

        try:
            obj = APIKey.objects.get(client_id=kwargs['tenant'])
            obj.token = token
            obj.hashed_token = hashed_token
            obj.created = datetime.datetime.now()
            obj.save()

        except APIKey.DoesNotExist as e:
            # skip APIKeyManager create() and have a token fixed to passed
            # value instead of randomly generated
            key = APIKey(**entry)
            key.save()
