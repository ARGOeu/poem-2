from Poem.api import serializers
from Poem.api.internal_views.users import get_groups_for_user
from Poem.api.internal_views.utils import sync_webapi
from Poem.api.views import NotFound
from Poem.poem import models as poem_models
from Poem.users.models import CustUser
from django.conf import settings
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import error_response


def user_groups(username):
    user = CustUser.objects.get(username=username)
    groups = get_groups_for_user(user)
    return groups


class ListReports(APIView):
    authentication_classes = (SessionAuthentication,)

    def _check_onchange_groupperm(self, groupname, user):
        groups = user_groups(user)
        if not user.is_superuser and groupname not in groups['reports']:
            return False
        return True

    def post(self, request):
        user = request.user

        if not user.is_superuser and \
                len(user_groups(user)['reports']) == 0:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to add reports.'
            )

        serializer = serializers.ReportsSerializer(data=request.data)
        if serializer.is_valid():
            try:
                groupreports = poem_models.GroupOfReports.objects.get(
                    name=request.data['groupname']
                )

                if not self._check_onchange_groupperm(
                        request.data['groupname'], user
                ):
                    return error_response(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail='You do not have permission to assign reports '
                               'to the given group.'
                    )

                serializer.save()
                report = poem_models.Reports.objects.get(
                    apiid=request.data['apiid']
                )
                groupreports.reports.add(report)

                return Response(serializer.data, status=status.HTTP_201_CREATED)

            except poem_models.GroupOfReports.DoesNotExist:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail='Group of reports not found.'
                )

        else:
            details = []
            for error in serializer.errors:
                details.append(
                    '{}: {}'.format(error, serializer.errors[error][0])
                )
            return Response(
                {'detail': ' '.join(details)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get(self, request, report_name=None):
        sync_webapi(settings.WEBAPI_REPORTS, poem_models.Reports)

        if report_name:
            try:
                report = poem_models.Reports.objects.get(
                    name=report_name
                )
                serializer = serializers.ReportsSerializer(report)
                return Response(serializer.data)

            except poem_models.Reports.DoesNotExist:
                raise NotFound(status=404,
                               detail='Report not found')

        else:
            reports = poem_models.Reports.objects.all().order_by('name')
            serializer = serializers.ReportsSerializer(reports, many=True)
            return Response(serializer.data)

    def put(self, request):
        user = request.user

        if not self._check_onchange_groupperm(request.data['groupname'], user):
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to change'
                       'report.'
            )

        if request.data['apiid']:
            report = poem_models.Reports.objects.get(
                apiid=request.data['apiid']
            )
            report.name = request.data['name']
            report.description = request.data['description']
            report.groupname = request.data['groupname']
            report.save()

            groupreport = poem_models.GroupOfReports.objects.get(
                name=request.data['groupname']
            )
            groupreport.reports.add(report)

            return Response(status=status.HTTP_201_CREATED)

        else:
            return Response(
                {'detail': 'Apiid field undefined!'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, report_name=None):
        user = request.user

        if report_name:
            try:
                report = poem_models.Reports.objects.get(
                    apiid=report_name
                )

                if (not user.is_superuser and report.groupname not in
                        user_groups(user)['reports']):
                    return error_response(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail='You do not have permission to delete'
                               'report.'
                    )

                report.delete()

                return Response(status=status.HTTP_204_NO_CONTENT)

            except poem_models.Reports.DoesNotExist:
                raise NotFound(status=404,
                               detail='Report not found')

        else:
            return Response(
                {'detail': 'Report not specified!'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ListPublicReports(ListReports):
    authentication_classes = ()
    permission_classes = ()

    def _denied(self):
        return Response(status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        return self._denied()

    def put(self, request, report_name):
        return self._denied()

    def delete(self, request, report_name):
        return self._denied()
