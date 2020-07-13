import datetime

from Poem.tenants.models import Tenant
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from tenant_schemas.utils import get_public_schema_name


class ListTenants(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        results = []
        if name:
            if name == 'SuperPOEM_Tenant':
                tenants = Tenant.objects.filter(
                    schema_name=get_public_schema_name()
                )
            else:
                tenants = Tenant.objects.filter(name=name)

            if len(tenants) == 0:
                return Response(
                    {'detail': 'Tenant not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

        else:
            tenants = Tenant.objects.all()

        for tenant in tenants:
            if tenant.schema_name == get_public_schema_name():
                tenant_name = 'SuperPOEM Tenant'
            else:
                tenant_name = tenant.name
            results.append(dict(
                name=tenant_name,
                schema_name=tenant.schema_name,
                domain_url=tenant.domain_url,
                created_on=datetime.date.strftime(tenant.created_on, '%Y-%m-%d')
            ))

        results = sorted(results, key=lambda k: k['name'].lower())

        if name:
            return Response(results[0])

        else:
            return Response(results)
