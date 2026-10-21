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


def extract_services(data):
    """Return the ``services`` list from request data.

    Handles both a ``QueryDict`` (multipart form encoding, where each entry is
    a JSON-encoded string) and a plain dict (JSON body, where entries are
    already dicts).
    """
    if hasattr(data, "getlist"):
        return data.getlist("services")
    return data.get("services", [])


def group_services(flat_services):
    """Convert a flat ``[{service, metric}, ...]`` list into the upstream
    grouped form ``[{service, metrics: [...]}, ...]``.

    Accepts either dict entries or JSON-encoded string entries (the latter
    arise from multipart form encoding in tests).
    """
    import json

    grouped = []
    for item in flat_services:
        if isinstance(item, str):
            item = json.loads(item.replace("'", '"'))
        service = item["service"]
        metric = item["metric"]
        existing = next(
            (s for s in grouped if s["service"] == service), None
        )
        if existing is None:
            grouped.append({"service": service, "metrics": [metric]})
        else:
            existing["metrics"].append(metric)
    return grouped


def flatten_services(grouped_services):
    """Convert the upstream grouped form ``[{service, metrics: [...]}, ...]``
    into a flat ``[{service, metric}, ...]`` list (used for history)."""
    flat = []
    for service in grouped_services:
        for metric in service.get("metrics", []):
            flat.append({"service": service["service"], "metric": metric})
    return flat


def thresholds_to_string(rules):
    """Convert structured threshold rules into the upstream string format.

    Mirrors the frontend ``thresholdsToString`` helper: each rule's
    ``thresholds`` list is collapsed into a space-joined string of
    ``label=value+uom;warn1:warn2;crit1:crit2[;min;max]`` entries, and empty
    ``host``/``endpoint_group`` keys are dropped.

    Accepts either a list of rules or a JSON-encoded string of rules; rules
    whose ``thresholds`` is already a string are left unchanged.
    """
    import json

    if isinstance(rules, str):
        rules = json.loads(rules)

    result = []
    for rule in rules:
        rule = dict(rule)
        if not rule.get("host"):
            rule.pop("host", None)
        if not rule.get("endpoint_group"):
            rule.pop("endpoint_group", None)

        thresholds = rule.get("thresholds", [])
        if isinstance(thresholds, str):
            rule["thresholds"] = thresholds
        else:
            entries = []
            for thresh in thresholds:
                thresh = dict(thresh)
                value = thresh.get("value") or "0"
                entry = (
                    f"{thresh.get('label', '')}={value}"
                    f"{thresh.get('uom', '')};"
                    f"{thresh.get('warn1', '')}:{thresh.get('warn2', '')};"
                    f"{thresh.get('crit1', '')}:{thresh.get('crit2', '')}"
                )
                if thresh.get("min") and thresh.get("max"):
                    entry += f";{thresh['min']};{thresh['max']}"
                entries.append(entry)
            rule["thresholds"] = " ".join(entries)

        result.append(rule)

    return result


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
