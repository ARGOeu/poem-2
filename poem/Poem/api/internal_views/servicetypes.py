from Poem.poem.models import ServiceFlavour
from Poem.api import serializers

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListServiceTypesDescriptions(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        serviceflavours = ServiceFlavour.objects.all().order_by('name')
        serializer = serializers.ServiceFlavourSerializer(serviceflavours, many=True)
        return Response(serializer.data)
