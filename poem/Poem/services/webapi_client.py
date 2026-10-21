"""Shared HTTP client for the ARGO WEB-API.

This is the single place that constructs outbound requests to WEB-API. It
takes a trusted tenant context and a resource identifier, never a
browser-supplied URL or token. It enforces timeouts, disables redirects on
credential-bearing requests, bounds response size and raises typed errors.

Existing callers that should migrate here:

    api/internal_views/utils.py      sync_webapi / sync_tags_webapi
    helpers/metrics_helpers.py       get_metrics_in_profiles / ...
    helpers/tenant_helpers.py        CombinedTenant._fetch_data_feed
"""

import json

import requests
from django.conf import settings

from .webapi_credentials import resolve_credential, READ, WRITE

# Resource identifiers -> settings attribute holding the upstream URL.
RESOURCE_REGISTRY = {
    "metricprofiles": "WEBAPI_METRIC",
    "aggregations": "WEBAPI_AGGREGATION",
    "thresholdsprofiles": "WEBAPI_THRESHOLDS",
    "operationsprofiles": "WEBAPI_OPERATIONS",
    "reports": "WEBAPI_REPORTS",
    "reportstags": "WEBAPI_REPORTSTAGS",
    "reportstopologygroups": "WEBAPI_REPORTSTOPOLOGYGROUPS",
    "reportstopologyendpoints": "WEBAPI_REPORTSTOPOLOGYENDPOINTS",
    "metrictags": "WEBAPI_METRICSTAGS",
    "servicetypes": "WEBAPI_SERVICETYPES",
    "datafeeds": "WEBAPI_DATAFEEDS",
}

# Defaults; override via Django settings if desired.
CONNECT_TIMEOUT = getattr(settings, "WEBAPI_CONNECT_TIMEOUT", 10)
READ_TIMEOUT = getattr(settings, "WEBAPI_READ_TIMEOUT", 30)
MAX_RESPONSE_BYTES = getattr(settings, "WEBAPI_MAX_RESPONSE_BYTES", 10 * 1024 * 1024)


class WebApiClientError(Exception):
    """Base class for client-level failures."""


class UnknownResource(WebApiClientError):
    """The requested resource identifier is not in the registry."""


class UpstreamError(WebApiClientError):
    """WEB-API returned a non-2xx status or an unparseable body."""

    def __init__(self, status_code=None, detail="", code="webapi_upstream_error"):
        self.status_code = status_code
        self.detail = detail
        self.code = code
        super().__init__(detail or f"WEB-API error (status {status_code})")


class UpstreamTimeout(UpstreamError):
    def __init__(self, detail="WEB-API request timed out."):
        super().__init__(status_code=504, detail=detail, code="webapi_timeout")


class UpstreamConnectionError(UpstreamError):
    def __init__(self, detail="Unable to reach WEB-API."):
        super().__init__(status_code=502, detail=detail, code="webapi_connection_error")


def _resource_url(resource):
    try:
        setting_name = RESOURCE_REGISTRY[resource]
    except KeyError:
        raise UnknownResource(f"Unknown WEB-API resource: {resource!r}")

    url = getattr(settings, setting_name, None)
    if not url:
        raise UnknownResource(
            f"WEB-API resource {resource!r} is not configured."
        )
    return url


def _join(base_url, identifier):
    """Append a single validated path segment to a base URL."""
    if identifier is None:
        return base_url.rstrip("/")

    segment = str(identifier)
    if not segment or "/" in segment or "\\" in segment or segment in (".", ".."):
        raise WebApiClientError(
            f"Invalid WEB-API path segment: {identifier!r}"
        )

    return f"{base_url.rstrip('/')}/{segment}"


def _headers(tenant_name, purpose):
    return {
        "Accept": "application/json",
        "x-api-key": resolve_credential(tenant_name, purpose),
    }


def _parse_error(response):
    """Extract a safe detail string from a non-2xx WEB-API response."""
    detail = ""
    try:
        body = response.json()
    except (ValueError, TypeError):
        return detail

    if isinstance(body, dict):
        status = body.get("status")
        if isinstance(status, dict) and status.get("details"):
            detail = status["details"]
        elif isinstance(body.get("errors"), list) and body["errors"]:
            first = body["errors"][0]
            if isinstance(first, dict) and first.get("details"):
                detail = first["details"]
    return detail


def _request(method, url, tenant_name, purpose, data=None):
    headers = _headers(tenant_name, purpose)
    kwargs = {
        "headers": headers,
        "timeout": (CONNECT_TIMEOUT, READ_TIMEOUT),
        "allow_redirects": False,
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
        kwargs["data"] = json.dumps(data)

    try:
        response = requests.request(method, url, **kwargs)
    except requests.exceptions.Timeout:
        raise UpstreamTimeout()
    except requests.exceptions.ConnectionError:
        raise UpstreamConnectionError()
    except requests.exceptions.RequestException as exc:
        raise UpstreamConnectionError(detail=f"WEB-API request failed: {exc}")

    if response.status_code >= 400:
        raise UpstreamError(
            status_code=response.status_code,
            detail=_parse_error(response),
        )

    return response


def _read_json(response):
    if response.content and len(response.content) > MAX_RESPONSE_BYTES:
        raise UpstreamError(
            status_code=502,
            detail="WEB-API response too large.",
            code="webapi_response_too_large",
        )
    try:
        return response.json()
    except (ValueError, TypeError):
        raise UpstreamError(
            status_code=502,
            detail="WEB-API returned malformed JSON.",
            code="webapi_malformed_response",
        )


class WebApiClient:
    """Thin wrapper around the module-level request helpers.

    Instantiate with a tenant name; each call resolves the appropriate
    credential for the operation's purpose.
    """

    def __init__(self, tenant_name):
        self.tenant_name = tenant_name

    def get(self, resource, identifier=None, purpose=READ):
        url = _join(_resource_url(resource), identifier)
        response = _request("GET", url, self.tenant_name, purpose)
        return _read_json(response)

    def get_data(self, resource, identifier=None, purpose=READ):
        """Return the ``data`` key of a collection/detail response."""
        return self.get(resource, identifier, purpose=purpose).get("data")

    def put(self, resource, identifier, data):
        url = _join(_resource_url(resource), identifier)
        response = _request("PUT", url, self.tenant_name, WRITE, data=data)
        return _read_json(response)

    def post(self, resource, data):
        url = _resource_url(resource)
        response = _request("POST", url, self.tenant_name, WRITE, data=data)
        return _read_json(response)

    def delete(self, resource, identifier):
        url = _join(_resource_url(resource), identifier)
        response = _request("DELETE", url, self.tenant_name, WRITE)
        return response.status_code
