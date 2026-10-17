"""Upstream profile/report write coordination.

The existing local application views (``ListMetricProfiles``,
``ListAggregations``, ``ListThresholdsProfiles``, ``ListReports``) currently
persist local metadata and history while the browser performs the upstream
mutation separately. This module provides the upstream write primitives those
views must call *inside* a single server-side operation, after authorization
and validation, so that the upstream change and local persistence happen
together.

A Django database transaction cannot roll back an external WEB-API mutation.
Callers must treat these helpers as non-transactional with respect to the
upstream system and handle partial outcomes explicitly.
"""

from .webapi_client import WebApiClient, UpstreamError
from .webapi_credentials import CredentialError


class ProfileOperationError(Exception):
    """An upstream profile/report write failed."""

    def __init__(self, detail, code="webapi_upstream_error", partial=False):
        self.detail = detail
        self.code = code
        self.partial = partial
        super().__init__(detail)


def _client(tenant_name):
    return WebApiClient(tenant_name)


def create_profile(resource, tenant_name, profile):
    """Create an upstream profile/report and return its upstream id.

    ``resource`` is a key from ``RESOURCE_REGISTRY`` (e.g. ``metricprofiles``).
    ``profile`` is the full upstream payload. The upstream id is derived from
    the response, never from a client assertion.
    """
    client = _client(tenant_name)
    try:
        response = client.post(resource, profile)
    except (UpstreamError, CredentialError) as exc:
        raise ProfileOperationError(
            f"Unable to create {resource}: {exc.detail or exc}"
        )

    data = response.get("data")
    if isinstance(data, dict):
        upstream_id = data.get("id")
    else:
        upstream_id = None

    if not upstream_id:
        raise ProfileOperationError(
            f"WEB-API did not return an id for the created {resource}.",
            code="webapi_missing_upstream_id",
        )

    return upstream_id


def update_profile(resource, tenant_name, profile_id, profile):
    """Update an existing upstream profile/report."""
    client = _client(tenant_name)
    try:
        client.put(resource, profile_id, profile)
    except (UpstreamError, CredentialError) as exc:
        raise ProfileOperationError(
            f"Unable to update {resource}: {exc.detail or exc}"
        )


def delete_profile(resource, tenant_name, profile_id):
    """Delete an existing upstream profile/report."""
    client = _client(tenant_name)
    try:
        client.delete(resource, profile_id)
    except (UpstreamError, CredentialError) as exc:
        raise ProfileOperationError(
            f"Unable to delete {resource}: {exc.detail or exc}"
        )
