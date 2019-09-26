import datetime

from Poem.api.models import MyAPIKey
from Poem.api.views import NotFound

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListAPIKeys(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            try:
                apikey = MyAPIKey.objects.get(name=name)
                api_format = dict(
                    id=apikey.id,
                    name=apikey.name,
                    token=apikey.token,
                    created=datetime.datetime.strftime(apikey.created,
                                                       '%Y-%m-%d %H:%M:%S'),
                    revoked=apikey.revoked
                )

            except MyAPIKey.DoesNotExist:
                raise NotFound(status=404, detail='API key not found')

        else:
            apikeys = MyAPIKey.objects.all()
            api_format = [
                dict(id=e.id,
                     name=e.name,
                     token=e.token,
                     created=datetime.datetime.strftime(e.created,
                                                        '%Y-%m-%d %H:%M:%S'),
                     revoked=e.revoked) for e in apikeys]

        return Response(api_format)

    def put(self, request):
        try:
            names = MyAPIKey.objects.all().values_list('name', flat=True)
            if request.data['name'] not in names:
                obj = MyAPIKey.objects.get(id=request.data['id'])
                obj.name = request.data['name']
                obj.revoked = request.data['revoked']
                obj.save()

            else:
                return Response(status=status.HTTP_403_FORBIDDEN)

            return Response(status=status.HTTP_201_CREATED)

        except MyAPIKey.DoesNotExist:
            raise NotFound(status=404, detail='API key not found')

    def post(self, request):
        names = MyAPIKey.objects.get_usable_keys().values_list('name',
                                                               flat=True)
        if request.data['name'] not in names:
            MyAPIKey.objects.create_key(
                name=request.data['name']
            )

            return Response(status=status.HTTP_201_CREATED)

        else:
            return Response(status=status.HTTP_403_FORBIDDEN)

    def delete(self, request, name=None):
        if name:
            try:
                apikey = MyAPIKey.objects.get(name=name)
                apikey.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except MyAPIKey.DoesNotExist:
                raise NotFound(status=404, detail='API key not found')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
