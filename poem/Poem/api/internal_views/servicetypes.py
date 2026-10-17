"""Service-type replacement entry point.

The browser sends one PUT with the desired service-type list. Django
authorizes the caller (tenant administrator), validates the payload, and
performs the conditional DELETE-before-POST replacement server-side.

This view also serves GET (inherited from ``ListWebApiServiceTypes``) so that
both the current collection and the replacement operation live on the same
path: ``webapi/topology/service-types/``.
"""

from Poem.api.internal_views.webapi import ListWebApiServiceTypes
from Poem.services.service_types import (
    replace_service_types,
    ServiceTypeReplacementError,
)

from rest_framework import status
from rest_framework.response import Response

from .utils import error_response


class ReplaceServiceTypes(ListWebApiServiceTypes):
    def put(self, request):
        if not request.user.is_superuser:
            return error_response(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to change service types.",
            )

        try:
            result = replace_service_types(request.tenant.name, request.data)
        except ServiceTypeReplacementError as exc:
            http_status = (
                status.HTTP_502_BAD_GATEWAY
                if exc.partial
                else status.HTTP_400_BAD_REQUEST
            )
            return error_response(status_code=http_status, detail=exc.detail)

        return Response({"data": result})
