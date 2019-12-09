from django.db import IntegrityError

from Poem.api.views import NotFound
from Poem.poem_super_admin import models as admin_models

from re import compile

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListPackages(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, nameversion=None):
        if nameversion:
            try:
                nv = compile('(\S+)-(.*)')
                package_name, package_version = nv.match(nameversion).groups()
                package = admin_models.Package.objects.get(
                    name=package_name, version=package_version
                )

                result = {
                    'id': package.id,
                    'name': package.name,
                    'version': package.version,
                    'repo': package.repo.name
                }

                return Response(result)

            except admin_models.Package.DoesNotExist:
                raise NotFound(status=404, detail='Package not found.')

        else:
            packages = admin_models.Package.objects.all()

            results = []
            for package in packages:
                results.append({
                    'name': package.name,
                    'version': package.version,
                    'repo': package.repo.name
                })

            results = sorted(results, key=lambda k: k['name'].lower())

            return Response(results)

    def post(self, request):
        try:
            admin_models.Package.objects.create(
                name=request.data['name'],
                version=request.data['version'],
                repo=admin_models.YumRepo.objects.get(name=request.data['repo'])
            )

            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(
                {'detail':
                     'Package with this name and version already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )
