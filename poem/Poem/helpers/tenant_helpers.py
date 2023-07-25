import requests
from Poem.poem_super_admin.models import WebAPIKey
from django.conf import settings


class CombinedTenant:
    def __init__(self, tenant):
        self.tenant = tenant

    def _fetch_token(self):
        token = WebAPIKey.objects.get(name=f"WEB-API-{self.tenant.name}")

        return token.token

    def _fetch_data_feed(self):
        response = requests.get(
            settings.WEBAPI_DATAFEEDS,
            headers={
                "Accept": "application/json",
                "x-api-key": self._fetch_token()
            },
            timeout=20
        )

        response.raise_for_status()

        return response.json()["data"]

    def tenants(self):
        try:
            return self._fetch_data_feed()[0]["tenants"]

        except (
            requests.exceptions.HTTPError,
            requests.exceptions.ConnectionError,
            requests.exceptions.RequestException,
            requests.exceptions.Timeout,
            WebAPIKey.DoesNotExist,
            Exception
        ):
            return []
