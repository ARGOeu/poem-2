"""Service-type replacement.

Moves the browser-side ``WebApi.addServiceTypes()`` sequence into Django. The
browser sends one replacement request; Django reads the current upstream
collection, skips DELETE when it is empty, and otherwise waits for DELETE
before POST.

Sequence (preserved from the existing frontend behavior):

    GET current collection
      -> empty:  skip DELETE
      -> non-empty: DELETE collection
    POST desired list
"""

from .webapi_client import WebApiClient, UpstreamError
from .webapi_credentials import CredentialError


class ServiceTypeReplacementError(Exception):
    """The replacement operation failed or is in an uncertain state."""

    def __init__(self, detail, code="service_types_replacement_failed",
                 partial=False):
        self.detail = detail
        self.code = code
        self.partial = partial
        super().__init__(detail)


def _validate(service_types):
    """Validate the replacement payload before any upstream mutation."""
    if not isinstance(service_types, list):
        raise ServiceTypeReplacementError(
            "Service types must be a list.",
            code="service_types_invalid",
        )

    names = []
    for item in service_types:
        if not isinstance(item, dict):
            raise ServiceTypeReplacementError(
                "Each service type must be an object.",
                code="service_types_invalid",
            )
        name = item.get("name")
        if not name:
            raise ServiceTypeReplacementError(
                "Each service type requires a name.",
                code="service_types_invalid",
            )
        names.append(name)

    if len(names) != len(set(names)):
        raise ServiceTypeReplacementError(
            "Service type names must be unique.",
            code="service_types_invalid",
        )


def replace_service_types(tenant_name, service_types):
    """Replace the tenant's service-type collection.

    Returns the accepted/canonical list on success. Raises
    :class:`ServiceTypeReplacementError` on failure; ``partial=True`` means
    the upstream state is uncertain (e.g. DELETE succeeded but POST failed).
    """
    _validate(service_types)

    client = WebApiClient(tenant_name)

    # 1. Read the current collection.
    try:
        current = client.get_data("servicetypes")
    except UpstreamError as exc:
        if exc.status_code == 404:
            current = []
        else:
            raise ServiceTypeReplacementError(
                f"Unable to read current service types: {exc.detail or exc}"
            )
    except CredentialError as exc:
        raise ServiceTypeReplacementError(
            f"Unable to read current service types: {exc}"
        )

    # 2. Delete the existing collection when non-empty.
    if current:
        try:
            client.delete("servicetypes", None)
        except (UpstreamError, CredentialError) as exc:
            raise ServiceTypeReplacementError(
                f"Unable to clear existing service types: {exc}"
            )

    # 3. Post the desired list.
    try:
        client.post("servicetypes", service_types)
    except (UpstreamError, CredentialError) as exc:
        raise ServiceTypeReplacementError(
            f"Service types were cleared but the new list could not be "
            f"saved: {exc}",
            code="service_types_replacement_incomplete",
            partial=True,
        )

    return service_types
