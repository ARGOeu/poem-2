from django.db import IntegrityError

from Poem.api.views import NotFound
from Poem.poem_super_admin import models as admin_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListYumRepos(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request, name=None):
        if name:
            try:
                repo = admin_models.YumRepo.objects.get(name=name)
                result = {
                    'id': repo.id,
                    'name': repo.name,
                    'tag': repo.tag.name,
                    'content': repo.content,
                    'description': repo.description
                }
                return Response(result)

            except admin_models.YumRepo.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)

        else:
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

    def post(self, request):
        try:
            admin_models.YumRepo.objects.create(
                name=request.data['name'],
                tag=admin_models.OSTag.objects.get(name=request.data['tag']),
                content=request.data['content'],
                description=request.data['description']
            )

            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(
                {'detail': 'YUM repo with this name and tag already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def put(self, request):
        repo = admin_models.YumRepo.objects.get(id=request.data['id'])

        try:
            repo.name = request.data['name']
            repo.tag = admin_models.OSTag.objects.get(name=request.data['tag'])
            repo.content = request.data['content']
            repo.description = request.data['description']
            repo.save()

            return Response(status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(
                {'detail': 'YUM repo with this name and tag already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, name=None):
        if name:
            try:
                admin_models.YumRepo.objects.get(name=name).delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            except admin_models.YumRepo.DoesNotExist:
                raise NotFound(status=404, detail='YUM repo not found.')

        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
