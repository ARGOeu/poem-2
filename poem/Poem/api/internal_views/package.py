from Poem.api.views import NotFound
from Poem.poem_super_admin.models import Package

from re import compile

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
                package = Package.objects.get(
                    name=package_name, version=package_version
                )

                result = {
                    'id': package.id,
                    'name': package.name,
                    'version': package.version,
                    'repo': package.repo.name
                }

                return Response(result)

            except Package.DoesNotExist:
                raise NotFound(status=404, detail='Package not found.')

        else:
            packages = Package.objects.all()

            results = []
            for package in packages:
                results.append({
                    'name': package.name,
                    'version': package.version,
                    'repo': package.repo.name
                })

            results = sorted(results, key=lambda k: k['name'].lower())

            return Response(results)
