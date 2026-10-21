"""Server-side resolution of WEB-API credentials.

The browser must never receive a WEB-API token. This module resolves the
correct tenant credential for an already-authorized read or write purpose and
returns only the secret value to the *server-side* HTTP client.

Credential naming convention (see ``poem_super_admin/dbmodels/apikey.py``):

    WEB-API-<tenant>       read/write key
    WEB-API-<tenant>-RO    read-only key

Resolution fails closed: a missing, revoked, expired or ambiguous credential
raises a typed error and never falls back to a broader key.
"""

from Poem.poem_super_admin.models import WebAPIKey

READ = "read"
WRITE = "write"

_PURPOSES = (READ, WRITE)


class CredentialError(Exception):
    """Base class for credential resolution failures."""


class MissingCredential(CredentialError):
    """No credential with the expected name exists."""


class AmbiguousCredential(CredentialError):
    """More than one credential matches the expected name."""


class RevokedCredential(CredentialError):
    """The credential exists but has been revoked."""


class ExpiredCredential(CredentialError):
    """The credential exists but has expired."""


def _key_name(tenant_name, purpose):
    if purpose == READ:
        return f"WEB-API-{tenant_name}-RO"
    if purpose == WRITE:
        return f"WEB-API-{tenant_name}"
    raise ValueError(f"Unknown purpose: {purpose!r}")


def resolve_credential(tenant_name, purpose):
    """Return the usable token for ``tenant_name`` and ``purpose``.

    ``tenant_name`` is the tenant name as used in the key name (e.g. the
    value of ``request.tenant.name``). ``purpose`` is ``READ`` or ``WRITE``.

    Raises a :class:`CredentialError` subclass on any failure. The secret is
    returned only to the caller (the server-side client), never to a browser.
    """
    if purpose not in _PURPOSES:
        raise ValueError(f"Unknown purpose: {purpose!r}")

    name = _key_name(tenant_name, purpose)

    try:
        key = WebAPIKey.objects.get(name=name)
    except WebAPIKey.DoesNotExist:
        raise MissingCredential(
            f"No WEB-API credential named {name!r}."
        )
    except WebAPIKey.MultipleObjectsReturned:
        raise AmbiguousCredential(
            f"Multiple WEB-API credentials named {name!r}."
        )

    if key.revoked:
        raise RevokedCredential(
            f"WEB-API credential {name!r} is revoked."
        )

    if key.has_expired:
        raise ExpiredCredential(
            f"WEB-API credential {name!r} has expired."
        )

    return key.token
