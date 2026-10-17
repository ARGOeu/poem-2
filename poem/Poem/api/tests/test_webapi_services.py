"""Tests for the server-side WEB-API service layer.

Covers credential resolution and the shared HTTP client. These tests use
mocked ``requests.request`` calls; they never contact a live WEB-API.
"""

import datetime
from unittest.mock import patch

from django.utils import timezone
from django_tenants.test.cases import TenantTestCase

from Poem.poem_super_admin.models import WebAPIKey
from Poem.services import webapi_client
from Poem.services.webapi_client import (
    WebApiClient,
    WebApiClientError,
    UnknownResource,
    UpstreamError,
    UpstreamTimeout,
    UpstreamConnectionError,
)
from Poem.services.webapi_credentials import (
    READ,
    WRITE,
    resolve_credential,
    MissingCredential,
    AmbiguousCredential,
    RevokedCredential,
    ExpiredCredential,
)

from .utils_test import MockResponse


class CredentialResolutionTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()

    def _create_key(self, name, token, **extra):
        obj, _ = WebAPIKey.objects.create_key(
            name=name, token=token, **extra
        )
        return obj

    def test_resolve_read_returns_ro_token(self):
        self._create_key("WEB-API-TENANT-RO", "ro-token")
        self.assertEqual(resolve_credential("TENANT", READ), "ro-token")

    def test_resolve_write_returns_rw_token(self):
        self._create_key("WEB-API-TENANT", "rw-token")
        self.assertEqual(resolve_credential("TENANT", WRITE), "rw-token")

    def test_resolve_missing_raises(self):
        with self.assertRaises(MissingCredential):
            resolve_credential("TENANT", READ)

    def test_resolve_revoked_raises(self):
        key = self._create_key("WEB-API-TENANT-RO", "ro-token")
        key.revoked = True
        key.save()
        with self.assertRaises(RevokedCredential):
            resolve_credential("TENANT", READ)

    def test_resolve_expired_raises(self):
        key = self._create_key("WEB-API-TENANT-RO", "ro-token")
        key.expiry_date = timezone.now() - datetime.timedelta(days=1)
        key.save()
        with self.assertRaises(ExpiredCredential):
            resolve_credential("TENANT", READ)

    def test_resolve_ambiguous_raises(self):
        self._create_key(
            "WEB-API-TENANT-RO", "t1", id="id1", prefix="p1", hashed_key="h1"
        )
        self._create_key(
            "WEB-API-TENANT-RO", "t2", id="id2", prefix="p2", hashed_key="h2"
        )
        with self.assertRaises(AmbiguousCredential):
            resolve_credential("TENANT", READ)

    def test_resolve_unknown_purpose_raises(self):
        with self.assertRaises(ValueError):
            resolve_credential("TENANT", "bogus")

    def test_read_does_not_fall_back_to_rw(self):
        # Only an RW key exists; a read must fail closed, not use it.
        self._create_key("WEB-API-TENANT", "rw-token")
        with self.assertRaises(MissingCredential):
            resolve_credential("TENANT", READ)


class WebApiClientTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        WebAPIKey.objects.create_key(name="WEB-API-TENANT-RO", token="ro-token")
        WebAPIKey.objects.create_key(name="WEB-API-TENANT", token="rw-token")

    def _client(self):
        return WebApiClient("TENANT")

    @patch("Poem.services.webapi_client.requests.request")
    def test_get_uses_ro_credential(self, mock_request):
        mock_request.return_value = MockResponse({"data": [{"id": "x"}]}, 200)
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            result = self._client().get("metricprofiles")

        self.assertEqual(result, {"data": [{"id": "x"}]})
        mock_request.assert_called_once()
        args, kwargs = mock_request.call_args
        self.assertEqual(args[0], "GET")
        self.assertEqual(args[1], "https://webapi.example/metric")
        self.assertEqual(kwargs["headers"]["x-api-key"], "ro-token")
        self.assertFalse(kwargs["allow_redirects"])

    @patch("Poem.services.webapi_client.requests.request")
    def test_put_uses_rw_credential(self, mock_request):
        mock_request.return_value = MockResponse({"data": {}}, 200)
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            self._client().put("metricprofiles", "abc", {"name": "p"})

        args, kwargs = mock_request.call_args
        self.assertEqual(args[0], "PUT")
        self.assertEqual(args[1], "https://webapi.example/metric/abc")
        self.assertEqual(kwargs["headers"]["x-api-key"], "rw-token")

    @patch("Poem.services.webapi_client.requests.request")
    def test_post_uses_rw_credential(self, mock_request):
        mock_request.return_value = MockResponse({"data": {}}, 200)
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            self._client().post("metricprofiles", {"name": "p"})

        args, kwargs = mock_request.call_args
        self.assertEqual(args[0], "POST")
        self.assertEqual(args[1], "https://webapi.example/metric")
        self.assertEqual(kwargs["headers"]["x-api-key"], "rw-token")

    @patch("Poem.services.webapi_client.requests.request")
    def test_delete_uses_rw_credential(self, mock_request):
        mock_request.return_value = MockResponse(None, 200)
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            status = self._client().delete("metricprofiles", "abc")

        self.assertEqual(status, 200)
        args, kwargs = mock_request.call_args
        self.assertEqual(args[0], "DELETE")
        self.assertEqual(kwargs["headers"]["x-api-key"], "rw-token")

    def test_unknown_resource_raises(self):
        with self.assertRaises(UnknownResource):
            self._client().get("doesnotexist")

    def test_invalid_path_segment_raises(self):
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            with self.assertRaises(WebApiClientError):
                self._client().get("metricprofiles", "a/b")

    @patch("Poem.services.webapi_client.requests.request")
    def test_upstream_error_raises_typed(self, mock_request):
        mock_request.return_value = MockResponse(
            {
                "status": {"message": "Bad", "code": "400", "details": "nope"}
            },
            400,
        )
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            with self.assertRaises(UpstreamError) as ctx:
                self._client().get("metricprofiles")

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "nope")

    @patch("Poem.services.webapi_client.requests.request")
    def test_timeout_raises_typed(self, mock_request):
        import requests

        mock_request.side_effect = requests.exceptions.Timeout()
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            with self.assertRaises(UpstreamTimeout):
                self._client().get("metricprofiles")

    @patch("Poem.services.webapi_client.requests.request")
    def test_connection_error_raises_typed(self, mock_request):
        import requests

        mock_request.side_effect = requests.exceptions.ConnectionError()
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            with self.assertRaises(UpstreamConnectionError):
                self._client().get("metricprofiles")

    @patch("Poem.services.webapi_client.requests.request")
    def test_malformed_json_raises(self, mock_request):
        mock_request.return_value = MockResponse("not json", 200)
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            with self.assertRaises(UpstreamError):
                self._client().get("metricprofiles")


class ServiceTypeReplacementTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        WebAPIKey.objects.create_key(
            name="WEB-API-TENANT-RO", token="ro-token"
        )
        WebAPIKey.objects.create_key(name="WEB-API-TENANT", token="rw-token")

    @patch("Poem.services.webapi_client.requests.request")
    def test_empty_collection_skips_delete(self, mock_request):
        from Poem.services.service_types import replace_service_types

        responses = {
            "GET": MockResponse({"data": []}, 200),
            "POST": MockResponse({"data": {}}, 200),
        }

        def side_effect(method, url, **kwargs):
            return responses[method]

        mock_request.side_effect = side_effect
        with self.settings(
            WEBAPI_SERVICETYPES="https://webapi.example/service-types"
        ):
            result = replace_service_types(
                "TENANT", [{"name": "s1", "tags": ["topology"]}]
            )

        self.assertEqual(result, [{"name": "s1", "tags": ["topology"]}])
        methods = [c[0][0] for c in mock_request.call_args_list]
        self.assertEqual(methods, ["GET", "POST"])

    @patch("Poem.services.webapi_client.requests.request")
    def test_existing_collection_deletes_before_post(self, mock_request):
        from Poem.services.service_types import replace_service_types

        responses = {
            "GET": MockResponse({"data": [{"name": "old"}]}, 200),
            "DELETE": MockResponse(None, 200),
            "POST": MockResponse({"data": {}}, 200),
        }

        def side_effect(method, url, **kwargs):
            return responses[method]

        mock_request.side_effect = side_effect
        with self.settings(
            WEBAPI_SERVICETYPES="https://webapi.example/service-types"
        ):
            replace_service_types("TENANT", [{"name": "s1"}])

        methods = [c[0][0] for c in mock_request.call_args_list]
        self.assertEqual(methods, ["GET", "DELETE", "POST"])

    @patch("Poem.services.webapi_client.requests.request")
    def test_post_failure_is_partial(self, mock_request):
        from Poem.services.service_types import (
            replace_service_types,
            ServiceTypeReplacementError,
        )

        responses = {
            "GET": MockResponse({"data": [{"name": "old"}]}, 200),
            "DELETE": MockResponse(None, 200),
            "POST": MockResponse(
                {"status": {"message": "Bad", "code": "400"}}, 400
            ),
        }

        def side_effect(method, url, **kwargs):
            return responses[method]

        mock_request.side_effect = side_effect
        with self.settings(
            WEBAPI_SERVICETYPES="https://webapi.example/service-types"
        ):
            with self.assertRaises(ServiceTypeReplacementError) as ctx:
                replace_service_types("TENANT", [{"name": "s1"}])

        self.assertTrue(ctx.exception.partial)

    @patch("Poem.services.webapi_client.requests.request")
    def test_duplicate_names_rejected_before_any_request(self, mock_request):
        from Poem.services.service_types import (
            replace_service_types,
            ServiceTypeReplacementError,
        )

        with self.settings(
            WEBAPI_SERVICETYPES="https://webapi.example/service-types"
        ):
            with self.assertRaises(ServiceTypeReplacementError):
                replace_service_types(
                    "TENANT",
                    [{"name": "s1"}, {"name": "s1"}],
                )

        mock_request.assert_not_called()


class CombinedTenantServiceTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        WebAPIKey.objects.create_key(name="WEB-API-TENANT", token="rw-token")
        WebAPIKey.objects.create_key(
            name="WEB-API-TENANT_X-RO", token="x-ro-token"
        )
        WebAPIKey.objects.create_key(
            name="WEB-API-TENANT_Y-RO", token="y-ro-token"
        )

    @patch("Poem.services.webapi_client.requests.request")
    def test_fetch_member_metric_profiles(self, mock_request):
        from Poem.services.combined_tenants import fetch_member_metric_profiles

        def side_effect(method, url, **kwargs):
            key = kwargs["headers"]["x-api-key"]
            if "datafeeds" in url:
                return MockResponse(
                    {"data": [{"tenants": ["TENANT_X", "TENANT_Y"]}]}, 200
                )
            if key == "x-ro-token":
                return MockResponse({"data": [{"name": "px"}]}, 200)
            if key == "y-ro-token":
                return MockResponse({"data": [{"name": "py"}]}, 200)
            return MockResponse({"data": []}, 200)

        mock_request.side_effect = side_effect
        with self.settings(
            WEBAPI_DATAFEEDS="https://webapi.example/datafeeds",
            WEBAPI_METRIC="https://webapi.example/metric",
        ):
            result = fetch_member_metric_profiles("TENANT")

        self.assertEqual(
            result,
            {
                "TENANT_X": [{"name": "px"}],
                "TENANT_Y": [{"name": "py"}],
            },
        )

    @patch("Poem.services.webapi_client.requests.request")
    def test_discovery_failure_raises(self, mock_request):
        from Poem.services.combined_tenants import (
            fetch_member_metric_profiles,
            CombinedTenantError,
        )

        mock_request.return_value = MockResponse(
            {"status": {"message": "Unauthorized", "code": "401"}}, 401
        )
        with self.settings(
            WEBAPI_DATAFEEDS="https://webapi.example/datafeeds",
        ):
            with self.assertRaises(CombinedTenantError):
                fetch_member_metric_profiles("TENANT")


class ProfileOperationTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        WebAPIKey.objects.create_key(name="WEB-API-TENANT", token="rw-token")

    @patch("Poem.services.webapi_client.requests.request")
    def test_create_profile_returns_upstream_id(self, mock_request):
        from Poem.services.profile_operations import create_profile

        mock_request.return_value = MockResponse(
            {"data": {"id": "upstream-123"}}, 200
        )
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            upstream_id = create_profile(
                "metricprofiles", "TENANT", {"name": "p1"}
            )

        self.assertEqual(upstream_id, "upstream-123")
        args, kwargs = mock_request.call_args
        self.assertEqual(args[0], "POST")
        self.assertEqual(kwargs["headers"]["x-api-key"], "rw-token")

    @patch("Poem.services.webapi_client.requests.request")
    def test_create_profile_missing_id_raises(self, mock_request):
        from Poem.services.profile_operations import (
            create_profile,
            ProfileOperationError,
        )

        mock_request.return_value = MockResponse({"data": {}}, 200)
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            with self.assertRaises(ProfileOperationError):
                create_profile("metricprofiles", "TENANT", {"name": "p1"})

    @patch("Poem.services.webapi_client.requests.request")
    def test_update_profile(self, mock_request):
        from Poem.services.profile_operations import update_profile

        mock_request.return_value = MockResponse({"data": {}}, 200)
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            update_profile("metricprofiles", "TENANT", "abc", {"name": "p1"})

        args, kwargs = mock_request.call_args
        self.assertEqual(args[0], "PUT")
        self.assertEqual(args[1], "https://webapi.example/metric/abc")

    @patch("Poem.services.webapi_client.requests.request")
    def test_delete_profile(self, mock_request):
        from Poem.services.profile_operations import delete_profile

        mock_request.return_value = MockResponse(None, 200)
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            delete_profile("metricprofiles", "TENANT", "abc")

        args, kwargs = mock_request.call_args
        self.assertEqual(args[0], "DELETE")
        self.assertEqual(args[1], "https://webapi.example/metric/abc")
