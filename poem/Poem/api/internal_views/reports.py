from Poem.api import serializers
from Poem.api.internal_views.users import get_groups_for_user
from Poem.api.internal_views.utils import sync_webapi
from Poem.api.views import NotFound
from Poem.poem import models as poem_models
from Poem.services.profile_operations import (
    create_profile,
    update_profile,
    delete_profile,
    ProfileOperationError,
)
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

        try:
            groupreports = poem_models.GroupOfReports.objects.get(
                name=request.data['groupname']
            )

        except poem_models.GroupOfReports.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Group of reports not found.'
            )

        if not self._check_onchange_groupperm(
                request.data['groupname'], user
        ):
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to assign reports to the '
                       'given group.'
            )

        # Validate the local fields with a placeholder apiid; name and
        # description come from the report's ``info`` block.
        info = request.data.get('info', {})
        data = {
            'name': info.get('name', ''),
            'description': info.get('description', ''),
            'apiid': '',
            'groupname': request.data['groupname'],
        }
        serializer = serializers.ReportsSerializer(data=data)
        if not serializer.is_valid():
            details = []
            for error in serializer.errors:
                details.append(
                    '{}: {}'.format(error, serializer.errors[error][0])
                )
            return Response(
                {'detail': ' '.join(details)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Perform the upstream create first so the local row stores the real
        # WEB-API id. The upstream payload is the full report minus the
        # local-only groupname.
        upstream_payload = dict(request.data)
        upstream_payload.pop('groupname', None)
        try:
            upstream_id = create_profile(
                'reports', request.tenant.name, upstream_payload
            )
        except ProfileOperationError as exc:
            return error_response(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.detail
            )

        serializer.save(apiid=upstream_id)
        report = poem_models.Reports.objects.get(apiid=upstream_id)
        groupreports.reports.add(report)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get(self, request, report_name=None):
        sync_webapi(
            settings.WEBAPI_REPORTS, poem_models.Reports, request.tenant.name
        )

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

        if not user.is_superuser and \
                len(user_groups(user)['reports']) == 0:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to change reports.'
            )

        try:
            if request.data['apiid']:
                report = poem_models.Reports.objects.get(
                    apiid=request.data['apiid']
                )
                old_groupreport = None
                if report.groupname:
                    if not self._check_onchange_groupperm(
                            report.groupname, user
                    ):
                        return error_response(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='You do not have permission to change '
                                   'reports in this group.'
                        )

                    old_groupreport = poem_models.GroupOfReports.objects.get(
                        name=report.groupname
                    )

                groupreport = poem_models.GroupOfReports.objects.get(
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

                # Perform the upstream update before persisting local
                # metadata. The upstream payload is the full report with the
                # local apiid mapped to the upstream ``id`` field.
                upstream_payload = dict(request.data)
                upstream_payload.pop('groupname', None)
                upstream_payload['id'] = request.data['apiid']
                upstream_payload.pop('apiid', None)
                try:
                    update_profile(
                        'reports', request.tenant.name,
                        request.data['apiid'], upstream_payload
                    )
                except ProfileOperationError as exc:
                    return error_response(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=exc.detail
                    )

                info = request.data.get('info', {})
                report.name = info.get('name', request.data.get('name', ''))
                report.description = info.get(
                    'description', request.data.get('description', '')
                )
                report.groupname = request.data['groupname']
                report.save()

                if old_groupreport and old_groupreport != groupreport:
                    old_groupreport.reports.remove(report)

                groupreport.reports.add(report)

                return Response(status=status.HTTP_201_CREATED)

            else:
                return Response(
                    {'detail': 'Apiid field undefined!'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except poem_models.GroupOfReports.DoesNotExist:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Given group of reports does not exist.'
            )

        except KeyError as e:
            return error_response(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Missing data key: {}'.format(e.args[0])
            )

    def delete(self, request, report_name=None):
        user = request.user

        if not user.is_superuser and \
                len(user_groups(user)['reports']) == 0:
            return error_response(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='You do not have permission to delete reports.'
            )

        if report_name:
            try:
                report = poem_models.Reports.objects.get(
                    apiid=report_name
                )

                if (not user.is_superuser and report.groupname not in
                        user_groups(user)['reports']):
                    return error_response(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail='You do not have permission to delete '
                               'reports assigned to this group.'
                    )

                # Perform the upstream delete before removing the local row.
                try:
                    delete_profile(
                        'reports', request.tenant.name, report_name
                    )
                except ProfileOperationError as exc:
                    return error_response(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=exc.detail
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
