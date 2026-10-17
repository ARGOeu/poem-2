"""Explicit read endpoints for upstream WEB-API resources.

These views return upstream profile/report/topology content to the React
frontend without exposing WEB-API credentials or URLs. The browser calls
these same-origin endpoints; Django performs the upstream request server-side
using the tenant's read-only credential.

Response contract:
    collections -> {"data": [...]}
    detail      -> {"data": {...}}
"""

from Poem.services.webapi_client import (
    WebApiClient,
    UpstreamError,
    WebApiClientError,
)
from Poem.services.webapi_credentials import CredentialError
from Poem.services.combined_tenants import (
    fetch_member_metric_profiles,
    CombinedTenantError,
)
from Poem.poem import models as poem_models

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .users import get_all_groups, get_groups_for_user
from .utils import error_response


def _upstream_error_response(exc):
    """Map a service-layer exception to a safe DRF response."""
    if isinstance(exc, UpstreamError):
        http_status = exc.status_code or status.HTTP_502_BAD_GATEWAY
        return error_response(status_code=http_status, detail=exc.detail)

    if isinstance(exc, CredentialError):
        return error_response(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WEB-API credential is unavailable. Please contact an "
                   "administrator.",
        )

    if isinstance(exc, WebApiClientError):
        return error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return error_response(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Unable to reach WEB-API.",
    )


class WebApiListReadView(APIView):
    """Authenticated read of an upstream collection."""

    authentication_classes = (SessionAuthentication,)
    permission_classes = (IsAuthenticated,)

    resource = None  # resource identifier from RESOURCE_REGISTRY

    def get(self, request):
        client = WebApiClient(request.tenant.name)
        try:
            data = client.get_data(self.resource)
        except (UpstreamError, CredentialError, WebApiClientError) as exc:
            return _upstream_error_response(exc)
        return Response({"data": data})


class WebApiDetailReadView(APIView):
    """Authenticated read of a single upstream object by id."""

    authentication_classes = (SessionAuthentication,)
    permission_classes = (IsAuthenticated,)

    resource = None

    def get(self, request, identifier):
        client = WebApiClient(request.tenant.name)
        try:
            data = client.get_data(self.resource, identifier)
        except (UpstreamError, CredentialError, WebApiClientError) as exc:
            return _upstream_error_response(exc)

        # Detail responses arrive as a one-element list; unwrap it.
        if isinstance(data, list):
            if not data:
                return error_response(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Not found.",
                )
            data = data[0]

        return Response({"data": data})


class ListWebApiMetricProfiles(WebApiListReadView):
    resource = "metricprofiles"


class DetailWebApiMetricProfile(WebApiDetailReadView):
    resource = "metricprofiles"


class ListWebApiAggregations(WebApiListReadView):
    resource = "aggregations"


class DetailWebApiAggregation(WebApiDetailReadView):
    resource = "aggregations"


class ListWebApiThresholdsProfiles(WebApiListReadView):
    resource = "thresholdsprofiles"


class DetailWebApiThresholdsProfile(WebApiDetailReadView):
    resource = "thresholdsprofiles"


class ListWebApiOperationsProfiles(WebApiListReadView):
    resource = "operationsprofiles"


class DetailWebApiOperationsProfile(APIView):
    """Look up an operations profile by name (server-side filter)."""

    authentication_classes = (SessionAuthentication,)
    permission_classes = (IsAuthenticated,)

    def get(self, request, name):
        client = WebApiClient(request.tenant.name)
        try:
            profiles = client.get_data("operationsprofiles")
        except (UpstreamError, CredentialError, WebApiClientError) as exc:
            return _upstream_error_response(exc)

        profile = next(
            (p for p in profiles if p.get("name") == name), None
        )
        if profile is None:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Operations profile not found.",
            )
        return Response({"data": profile})


class ListWebApiReports(WebApiListReadView):
    resource = "reports"


class DetailWebApiReport(APIView):
    """Look up a report by name (server-side filter on info.name)."""

    authentication_classes = (SessionAuthentication,)
    permission_classes = (IsAuthenticated,)

    def get(self, request, name):
        client = WebApiClient(request.tenant.name)
        try:
            reports = client.get_data("reports")
        except (UpstreamError, CredentialError, WebApiClientError) as exc:
            return _upstream_error_response(exc)

        report = next(
            (r for r in reports if r.get("info", {}).get("name") == name),
            None,
        )
        if report is None:
            return error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found.",
            )
        return Response({"data": report})


class ListWebApiTopologyTags(WebApiListReadView):
    resource = "reportstags"


class ListWebApiTopologyGroups(WebApiListReadView):
    resource = "reportstopologygroups"


class ListWebApiTopologyEndpoints(WebApiListReadView):
    resource = "reportstopologyendpoints"


class ListWebApiServiceTypes(WebApiListReadView):
    resource = "servicetypes"

    def get(self, request):
        client = WebApiClient(request.tenant.name)
        try:
            data = client.get_data("servicetypes")
        except UpstreamError as exc:
            # Preserve the existing 404 -> empty-collection behavior only for
            # a documented "no collection" response.
            if exc.status_code == 404:
                return Response({"data": []})
            return _upstream_error_response(exc)
        except (CredentialError, WebApiClientError) as exc:
            return _upstream_error_response(exc)

        # Normalize: entries without tags default to ["topology"].
        data = [
            {**item, "tags": item.get("tags", ["topology"])}
            for item in (data or [])
        ]
        return Response({"data": data})


# ---------------------------------------------------------------------------
# Public (anonymous) read views.
#
# These expose an explicit allowlist of upstream resources without a session.
# They use the tenant read-only credential server-side and must reject all
# write methods (they only define ``get``).
# ---------------------------------------------------------------------------


class PublicWebApiListReadView(WebApiListReadView):
    authentication_classes = ()
    permission_classes = ()


class PublicWebApiDetailReadView(WebApiDetailReadView):
    authentication_classes = ()
    permission_classes = ()


class ListPublicWebApiMetricProfiles(PublicWebApiListReadView):
    resource = "metricprofiles"


class DetailPublicWebApiMetricProfile(PublicWebApiDetailReadView):
    resource = "metricprofiles"


class ListPublicWebApiAggregations(PublicWebApiListReadView):
    resource = "aggregations"


class DetailPublicWebApiAggregation(PublicWebApiDetailReadView):
    resource = "aggregations"


class ListPublicWebApiThresholdsProfiles(PublicWebApiListReadView):
    resource = "thresholdsprofiles"


class DetailPublicWebApiThresholdsProfile(PublicWebApiDetailReadView):
    resource = "thresholdsprofiles"


class ListPublicWebApiOperationsProfiles(PublicWebApiListReadView):
    resource = "operationsprofiles"


class DetailPublicWebApiOperationsProfile(DetailWebApiOperationsProfile):
    authentication_classes = ()
    permission_classes = ()


class ListPublicWebApiReports(PublicWebApiListReadView):
    resource = "reports"


class DetailPublicWebApiReport(DetailWebApiReport):
    authentication_classes = ()
    permission_classes = ()


class ListPublicWebApiTopologyTags(PublicWebApiListReadView):
    resource = "reportstags"


class ListPublicWebApiTopologyGroups(PublicWebApiListReadView):
    resource = "reportstopologygroups"


class ListPublicWebApiTopologyEndpoints(PublicWebApiListReadView):
    resource = "reportstopologyendpoints"


class ListPublicWebApiServiceTypes(ListWebApiServiceTypes):
    authentication_classes = ()
    permission_classes = ()


class ListWebApiCombinedMetricProfiles(APIView):
    """Read metric profiles for every permitted member tenant.

    Replaces the browser-side ``fetchTenantsMetricProfiles`` loop. The server
    discovers the member tenants and reads each with its own RO credential.
    """

    authentication_classes = (SessionAuthentication,)
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if not request.tenant.combined:
            return error_response(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This tenant is not a combined tenant.",
            )

        if request.user.is_superuser:
            groups = get_all_groups()
        else:
            try:
                groups = get_groups_for_user(request.user)
            except poem_models.UserProfile.DoesNotExist:
                groups = {}

        # Preserve the existing eligibility rule: a combined-tenant user must
        # have at least one metric-profile group.
        if not request.user.is_superuser and not groups.get("metricprofiles"):
            return error_response(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view combined-tenant "
                       "metric profiles.",
            )

        try:
            result = fetch_member_metric_profiles(request.tenant.name)
        except CombinedTenantError as exc:
            return error_response(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            )

        return Response(result)
