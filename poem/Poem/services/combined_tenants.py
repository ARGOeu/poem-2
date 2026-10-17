"""Combined-tenant reads.

A combined tenant is a tenant whose monitoring spans several member tenants.
The frontend currently receives a map of member-tenant RO tokens and loops
over them in the browser. This module moves that loop server-side: it
discovers the permitted member tenants and reads each member's metric profiles
using that member's read-only credential.
"""

from .webapi_client import WebApiClient, UpstreamError
from .webapi_credentials import READ, WRITE, CredentialError


class CombinedTenantError(Exception):
    """Discovery or member read failed for a combined tenant."""


def discover_member_tenants(tenant_name):
    """Return the list of member tenant names for a combined tenant.

    Raises :class:`CombinedTenantError` on discovery failure so that an outage
    is not mistaken for a legitimately empty membership list.
    """
    client = WebApiClient(tenant_name)
    try:
        # The data-feed endpoint historically requires the RW key.
        data = client.get_data("datafeeds", purpose=WRITE)
    except (UpstreamError, CredentialError) as exc:
        raise CombinedTenantError(
            f"Unable to discover member tenants: {exc}"
        )

    if not data:
        return []

    first = data[0] if isinstance(data, list) else data
    return first.get("tenants", [])


def fetch_member_metric_profiles(tenant_name):
    """Return ``{member_tenant: [profiles]}`` for a combined tenant.

    Each member is read with its own RO credential. Raises
    :class:`CombinedTenantError` if discovery or any member read fails.
    """
    members = discover_member_tenants(tenant_name)

    result = {}
    for member in members:
        client = WebApiClient(member)
        try:
            result[member] = client.get_data("metricprofiles", purpose=READ)
        except (UpstreamError, CredentialError) as exc:
            raise CombinedTenantError(
                f"Unable to read metric profiles for member {member!r}: {exc}"
            )

    return result
