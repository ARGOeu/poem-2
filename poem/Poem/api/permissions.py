from Poem.api.models import MyAPIKey

from rest_framework_api_key.permissions import BaseHasAPIKey


class MyHasAPIKey(BaseHasAPIKey):
    model = MyAPIKey
