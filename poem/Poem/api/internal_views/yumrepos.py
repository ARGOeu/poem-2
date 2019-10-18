from Poem.poem_super_admin.models import YumRepo

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView


class ListYumRepos(APIView):
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        repos = YumRepo.objects.all()

        results = []
        for repo in repos:
            results.append(
                {
                    'name': repo.name,
                    'description': repo.description
                }
            )

        results = sorted(results, key=lambda k: k['name'].lower())

        return Response(results)