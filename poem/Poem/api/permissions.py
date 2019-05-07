from rest_framework import permissions

from rest_framework_api_key.models import APIKey
from rest_framework_api_key.crypto import hash_token

from Poem.settings import SECRET_KEY, TOKEN_HEADER


class MyHasAPIKey(permissions.BasePermission):
    """
       Based on HasAPIKey from rest_framework_api_key except that SECRET_KEY is
       not sent and therefore not extracted from headers but from general
       settings.
    """

    def has_permission(self, request, view):
        """Check whether the API key grants access to a view."""
        token = request.META.get(TOKEN_HEADER, '')

        # Token and secret key must have been given
        if not token or not SECRET_KEY:
            return False

        # An unrevoked API key for this token must exist
        api_key = APIKey.objects.filter(token=token, revoked=False).first()
        if api_key is None:
            return False

        # Compare the hash of the given token by the given secret_key
        # to the hash stored no the api_key.
        hashed_token = hash_token(token, SECRET_KEY)
        granted = hashed_token == api_key.hashed_token

        return granted
