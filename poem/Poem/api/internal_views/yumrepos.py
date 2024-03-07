from Poem.api.views import NotFound
from Poem.poem_super_admin import models as admin_models
from django.db import IntegrityError
from django_tenants.utils import get_public_schema_name
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


class ListYumRepos(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None, tag=None):
        if name and tag:
            try:
                ostag = [
                    t for t in admin_models.OSTag.objects.all() if
                    t.name.lower().replace(" ", "") == tag
                ][0]

                repo = admin_models.YumRepo.objects.get(name=name, tag=ostag)
                result = {
                    'id': repo.id,
                    'name': repo.name,
                    'tag': repo.tag.name,
                    'content': repo.content,
                    'description': repo.description
                }
                return Response(result)

            except (IndexError, admin_models.YumRepo.DoesNotExist):
                return Response(status=status.HTTP_404_NOT_FOUND)

        elif not name and not tag:
            repos = admin_models.YumRepo.objects.all()

            results = []
            for repo in repos:
                results.append(
                    {
                        'id': repo.id,
                        'name': repo.name,
                        'tag': repo.tag.name,
                        'content': repo.content,
                        'description': repo.description
                    }
                )

            results = sorted(results, key=lambda k: k['name'].lower())

            return Response(results)

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            try:
                admin_models.YumRepo.objects.create(
                    name=request.data['name'],
                    tag=admin_models.OSTag.objects.get(
                        name=request.data['tag']
                    ),
                    content=request.data['content'],
                    description=request.data['description']
                )

                return Response(status=status.HTTP_201_CREATED)

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='YUM repo with this name and tag already exists.'
                )

            except admin_models.OSTag.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='OS tag does not exist.'
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Missing data key: {}'.format(e.args[0])
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to add YUM repos.'
            )

    def put(self, request):
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            try:
                repo = admin_models.YumRepo.objects.get(id=request.data['id'])

                repo.name = request.data['name']
                repo.tag = admin_models.OSTag.objects.get(name=request.data['tag'])
                repo.content = request.data['content']
                repo.description = request.data['description']
                repo.save()

                return Response(status=status.HTTP_201_CREATED)

            except admin_models.YumRepo.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='YUM repo does not exist.'
                )

            except admin_models.OSTag.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='OS tag does not exist.'
                )

            except IntegrityError:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='YUM repo with this name and tag already exists.'
                )

            except KeyError as e:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Missing data key: {}'.format(e.args[0])
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to change YUM repos.'
            )

    def delete(self, request, name=None, tag=None):
        if request.tenant.schema_name == get_public_schema_name() and \
                request.user.is_superuser:
            if name and tag:
                if tag == 'centos6':
                    ostag = admin_models.OSTag.objects.get(name='CentOS 6')

                elif tag == 'centos7':
                    ostag = admin_models.OSTag.objects.get(name='CentOS 7')

                else:
                    raise NotFound(status=404, detail='OS tag does not exist.')

                try:
                    admin_models.YumRepo.objects.get(
                        name=name, tag=ostag
                    ).delete()

                    return Response(status=status.HTTP_204_NO_CONTENT)

                except admin_models.YumRepo.DoesNotExist:
                    raise NotFound(
                        status=404, detail='YUM repo does not exist.'
                    )

            else:
                return error_response(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='YUM repo name and/or tag should be specified.'
                )

        else:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to delete YUM repos.'
            )


class ListOSTags(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        tags = admin_models.OSTag.objects.all().values_list('name', flat=True)
        return Response(tags)


class ListPublicOSTags(ListOSTags):
    authentication_classes = ()
    permission_classes = ()
