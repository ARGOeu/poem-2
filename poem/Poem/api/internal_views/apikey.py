import datetime

from django.conf import settings
from django.db.utils import IntegrityError

from Poem.api.views import NotFound

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_api_key import models as api_models
from rest_framework_api_key.crypto import _generate_token, hash_token


class ListTokens(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            try:
                token = api_models.APIKey.objects.get(client_id=name)
                api_format = dict(
                    id=token.id,
                    name=token.client_id,
                    token=token.token,
                    created=datetime.datetime.strftime(token.created,
                                                       '%Y-%m-%d %H:%M:%S'),
                    revoked=token.revoked
                )

            except api_models.APIKey.DoesNotExist:
                raise NotFound(status=404, detail='API key not found')

        else:
            tokens = api_models.APIKey.objects.all()
            api_format = [
                dict(id=e.id,
                     name=e.client_id,
                     token=e.token,
                     created=datetime.datetime.strftime(e.created,
                                                        '%Y-%m-%d %H:%M:%S'),
                     revoked=e.revoked) for e in tokens]

        return Response(api_format)

    def put(self, request):
        try:
            obj = api_models.APIKey.objects.get(id=request.data['id'])
            obj.client_id = request.data['name']
            obj.revoked = request.data['revoked']
            try:
                obj.save()

            except IntegrityError:
                return Response(status=status.HTTP_403_FORBIDDEN)

            return Response(status=status.HTTP_201_CREATED)

        except api_models.APIKey.DoesNotExist:
            raise NotFound(status=404, detail='API key not found')

    def post(self, request):
        token = _generate_token()
        hashed_token = hash_token(token, settings.SECRET_KEY)
        obj = api_models.APIKey(
            client_id=request.data['name'],
            token=token,
            hashed_token=hashed_token
        )

        try:
            obj.save()
            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(status=status.HTTP_403_FORBIDDEN)

    def delete(self, request, name=None):
        if name:
            try:
                token = api_models.APIKey.objects.get(client_id=name)
                token.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except api_models.APIKey.DoesNotExist:
                raise NotFound(status=404, detail='API key not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
