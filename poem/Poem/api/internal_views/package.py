from django.db import IntegrityError
from django.db.models import ProtectedError

from Poem.api.views import NotFound
from Poem.poem_super_admin import models as admin_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


def get_package_version(nameversion):
    version = nameversion.split('-')[-1]
    name = nameversion.split(version)[0][0:-1]

    return name, version


class ListPackages(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, nameversion=None):
        if nameversion:
            try:
                package_name, package_version = get_package_version(nameversion)
                package = admin_models.Package.objects.get(
                    name=package_name, version=package_version
                )

                repos = []
                for repo in package.repos.all():
                    repos.append('{} ({})'.format(repo.name, repo.tag.name))

                result = {
                    'id': package.id,
                    'name': package.name,
                    'version': package.version,
                    'use_present_version': package.use_present_version,
                    'repos': repos
                }

                return Response(result)

            except admin_models.Package.DoesNotExist:
                raise NotFound(status=404, detail='Package not found.')

        else:
            packages = admin_models.Package.objects.all()

            results = []
            for package in packages:
                repos = []
                for repo in package.repos.all():
                    repos.append('{} ({})'.format(repo.name, repo.tag.name))
                results.append({
                    'name': package.name,
                    'version': package.version,
                    'use_present_version': package.use_present_version,
                    'repos': repos
                })

            results = sorted(results, key=lambda k: k['name'].lower())

            return Response(results)

    def post(self, request):
        try:
            if request.data['use_present_version'] in [True, 'true', 'True']:
                version = 'present'
                use_present_version = True

            else:
                version = request.data['version']
                use_present_version = False

            # check if repos exist
            repos = dict(request.data)['repos']

            try:
                for repo in repos:
                    repo_name = repo.split(' ')[0]
                    repo_tag = admin_models.OSTag.objects.get(
                        name=repo.split('(')[1][0:-1]
                    )
                    admin_models.YumRepo.objects.get(
                        name=repo_name, tag=repo_tag
                    )

            except admin_models.YumRepo.DoesNotExist:
                return Response(
                    {'detail': 'YUM repo not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            except IndexError:
                return Response(
                    {'detail': 'You should specify YUM repo tag!'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            package = admin_models.Package.objects.create(
                name=request.data['name'],
                version=version,
                use_present_version=use_present_version
            )

            for repo in repos:
                repo_name = repo.split(' ')[0]
                repo_tag = admin_models.OSTag.objects.get(
                    name=repo.split('(')[1][0:-1]
                )
                package.repos.add(admin_models.YumRepo.objects.get(
                    name=repo_name, tag=repo_tag
                ))

            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(
                {'detail':
                     'Package with this name and version already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def put(self, request):
        package = admin_models.Package.objects.get(id=request.data['id'])
        old_version = package.version
        try:
            package.name = request.data['name']
            if request.data['use_present_version'] in [True, 'true', 'True']:
                use_present_version = True
            else:
                use_present_version = False
            package.use_present_version = use_present_version
            package.version = request.data['version']
            package.save()

            repos = dict(request.data)['repos']

            for r in repos:
                repo_name = r.split(' ')[0]
                repo_tag = admin_models.OSTag.objects.get(
                    name=r.split('(')[1][0:-1]
                )
                repo = admin_models.YumRepo.objects.get(
                    name=repo_name, tag=repo_tag
                )
                if repo not in package.repos.all():
                    package.repos.add(repo)

            for repo in package.repos.all():
                r = '{} ({})'.format(repo.name, repo.tag.name)
                if r not in repos:
                    package.repos.remove(repo)

            if old_version != request.data['version']:
                probe_history = admin_models.ProbeHistory.objects.filter(
                    package=package
                )
                for ph in probe_history:
                    ph.version = package.version
                    ph.save()

            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(
                {'detail':
                     'Package with this name and version already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        except admin_models.YumRepo.DoesNotExist:
            return Response(
                {'detail': 'YUM repo not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        except IndexError:
            return Response(
                {'detail': 'You should specify YUM repo tag!'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, nameversion):
        package_name, package_version = get_package_version(nameversion)
        try:
            admin_models.Package.objects.get(
                name=package_name, version=package_version
            ).delete()

            return Response(status=status.HTTP_204_NO_CONTENT)

        except admin_models.Package.DoesNotExist:
            raise NotFound(status=404, detail='Package not found.')

        except ProtectedError:
            return Response(
                {'detail': 'You cannot delete package with associated probes!'},
                status=status.HTTP_400_BAD_REQUEST
            )

class ListPublicPackages(ListPackages):
    authentication_classes = ()
    permission_classes = ()
