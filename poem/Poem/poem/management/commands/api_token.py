import datetime

from django.core.management.base import BaseCommand

from Poem.api.models import MyAPIKey


class Command(BaseCommand):
    help = """Create a token for tenant. If token is not specified, it will be
              automatically generated. If tenant already exist, his token will 
              be updated."""

    def add_arguments(self, parser):
        parser.add_argument('--tenant', required=True, type=str)
        parser.add_argument('--token', nargs='?', type=str)

    def handle(self, *args, **kwargs):
        token = None

        if kwargs['token'] is None:
            entry = dict(
                name=kwargs['tenant']
            )
        else:
            entry = dict(
                name=kwargs['tenant'],
                token=kwargs['token']
            )

        try:
            obj = MyAPIKey.objects.get(name=kwargs['tenant'])
            obj.token = token
            obj.created = datetime.datetime.now()
            obj.save()

        except MyAPIKey.DoesNotExist as e:
            key = MyAPIKey.objects.create_key(**entry)
