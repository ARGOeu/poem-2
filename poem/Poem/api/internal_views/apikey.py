import datetime

from Poem.api.models import MyAPIKey
from Poem.api.views import NotFound
from django.db.models import Q
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
            if request.user.is_superuser:
                apikeys = MyAPIKey.objects.all().order_by('name')
            else:
                apikeys = MyAPIKey.objects.filter(name__startswith='WEB-API').order_by('name')
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
            names = MyAPIKey.objects.filter(
                ~Q(id=request.data['id'])
            ).values_list('name', flat=True)
            if request.data['name'] not in names:
                obj = MyAPIKey.objects.get(id=request.data['id'])
                obj.name = request.data['name']
                obj.revoked = request.data['revoked']
                obj.save()

            else:
                return Response(
                    {'detail': 'API key with this name already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response(status=status.HTTP_201_CREATED)

        except MyAPIKey.DoesNotExist:
            raise NotFound(status=404, detail='API key not found')

    def post(self, request):
        names = MyAPIKey.objects.get_usable_keys().values_list('name',
                                                               flat=True)
        if request.data['name'] not in names:
            token = request.data.get('token', False)
            if token:
                MyAPIKey.objects.create_key(
                    name=request.data['name'],
                    token=token
                )
            else:
                MyAPIKey.objects.create_key(
                    name=request.data['name']
                )

            return Response(status=status.HTTP_201_CREATED)

        else:
            return Response(
                {'detail': 'API key with this name already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, name=None):
        if name:
            try:
                apikey = MyAPIKey.objects.get(name=name)
                apikey.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except MyAPIKey.DoesNotExist:
                raise NotFound(status=404, detail='API key not found')

        else:
            return Response(
                {'detail': 'API key name must be defined'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ListPublicAPIKey(APIView):
    authentication_classes = ()
    permission_classes = ()

    def get(self, request):
        try:
            apikey = MyAPIKey.objects.get(name='WEB-API-RO')
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

        return Response(api_format)
