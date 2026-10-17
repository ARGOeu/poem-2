"""Tests for the WEB-API read views (api/internal_views/webapi.py)."""

from unittest.mock import patch

from Poem.api import views_internal as views
from Poem.poem_super_admin.models import WebAPIKey
from Poem.users.models import CustUser
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantRequestFactory
from rest_framework.test import force_authenticate

from .utils_test import MockResponse


class WebApiReadViewTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        self.factory = TenantRequestFactory(self.tenant)
        self.user = CustUser.objects.create_user(username="testuser")
        WebAPIKey.objects.create(name="WEB-API-TENANT-RO", token="ro-token")
        WebAPIKey.objects.create(name="WEB-API-TENANT", token="rw-token")

    def _get(self, view, url, authenticated=True):
        request = self.factory.get(url)
        if authenticated:
            force_authenticate(request, user=self.user)
        return view(request)

    @patch("Poem.services.webapi_client.requests.request")
    def test_list_metric_profiles_authenticated(self, mock_request):
        mock_request.return_value = MockResponse(
            {"data": [{"id": "1", "name": "p1"}]}, 200
        )
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            response = self._get(
                views.ListWebApiMetricProfiles.as_view(),
                "/api/v2/internal/webapi/metricprofiles/",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"data": [{"id": "1", "name": "p1"}]})

    @patch("Poem.services.webapi_client.requests.request")
    def test_detail_metric_profile_unwraps_list(self, mock_request):
        mock_request.return_value = MockResponse(
            {"data": [{"id": "1", "name": "p1"}]}, 200
        )
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            response = self._get(
                views.DetailWebApiMetricProfile.as_view(),
                "/api/v2/internal/webapi/metricprofiles/1",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"data": {"id": "1", "name": "p1"}})

    @patch("Poem.services.webapi_client.requests.request")
    def test_public_list_requires_no_auth(self, mock_request):
        mock_request.return_value = MockResponse(
            {"data": [{"id": "1", "name": "p1"}]}, 200
        )
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            response = self._get(
                views.ListPublicWebApiMetricProfiles.as_view(),
                "/api/v2/internal/public_webapi/metricprofiles/",
                authenticated=False,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"data": [{"id": "1", "name": "p1"}]})

    @patch("Poem.services.webapi_client.requests.request")
    def test_upstream_error_returns_safe_response(self, mock_request):
        mock_request.return_value = MockResponse(
            {"status": {"message": "Bad", "code": "400", "details": "nope"}},
            400,
        )
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            response = self._get(
                views.ListWebApiMetricProfiles.as_view(),
                "/api/v2/internal/webapi/metricprofiles/",
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {"detail": "nope"})

    @patch("Poem.services.webapi_client.requests.request")
    def test_missing_credential_returns_503(self, mock_request):
        WebAPIKey.objects.filter(name="WEB-API-TENANT-RO").delete()
        with self.settings(WEBAPI_METRIC="https://webapi.example/metric"):
            response = self._get(
                views.ListWebApiMetricProfiles.as_view(),
                "/api/v2/internal/webapi/metricprofiles/",
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("credential", response.data["detail"].lower())

    @patch("Poem.services.webapi_client.requests.request")
    def test_service_types_404_returns_empty(self, mock_request):
        mock_request.return_value = MockResponse("404 page not found", 404)
        with self.settings(
            WEBAPI_SERVICETYPES="https://webapi.example/service-types"
        ):
            response = self._get(
                views.ListWebApiServiceTypes.as_view(),
                "/api/v2/internal/webapi/topology/service-types/",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"data": []})

    @patch("Poem.services.webapi_client.requests.request")
    def test_service_types_default_tags(self, mock_request):
        mock_request.return_value = MockResponse(
            {"data": [{"name": "s1"}, {"name": "s2", "tags": ["x"]}]}, 200
        )
        with self.settings(
            WEBAPI_SERVICETYPES="https://webapi.example/service-types"
        ):
            response = self._get(
                views.ListWebApiServiceTypes.as_view(),
                "/api/v2/internal/webapi/topology/service-types/",
            )

        self.assertEqual(
            response.data,
            {
                "data": [
                    {"name": "s1", "tags": ["topology"]},
                    {"name": "s2", "tags": ["x"]},
                ]
            },
        )

    @patch("Poem.services.webapi_client.requests.request")
    def test_operations_profile_name_lookup(self, mock_request):
        mock_request.return_value = MockResponse(
            {
                "data": [
                    {"name": "op1", "id": "1"},
                    {"name": "op2", "id": "2"},
                ]
            },
            200,
        )
        with self.settings(
            WEBAPI_OPERATIONS="https://webapi.example/operations"
        ):
            response = self._get(
                views.DetailWebApiOperationsProfile.as_view(),
                "/api/v2/internal/webapi/operationsprofiles/op2",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"data": {"name": "op2", "id": "2"}})

    @patch("Poem.services.webapi_client.requests.request")
    def test_report_name_lookup(self, mock_request):
        mock_request.return_value = MockResponse(
            {
                "data": [
                    {"info": {"name": "r1"}, "id": "1"},
                    {"info": {"name": "r2"}, "id": "2"},
                ]
            },
            200,
        )
        with self.settings(WEBAPI_REPORTS="https://webapi.example/reports"):
            response = self._get(
                views.DetailWebApiReport.as_view(),
                "/api/v2/internal/webapi/reports/r2",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data, {"data": {"info": {"name": "r2"}, "id": "2"}}
        )


class ReplaceServiceTypesViewTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.save()
        self.factory = TenantRequestFactory(self.tenant)
        self.user = CustUser.objects.create_user(username="testuser")
        self.superuser = CustUser.objects.create_user(
            username="superuser", is_superuser=True
        )
        WebAPIKey.objects.create(name="WEB-API-TENANT", token="rw-token")

    def _put(self, data, user):
        request = self.factory.put(
            "/api/v2/internal/webapi/topology/service-types/",
            data,
            format="json",
        )
        force_authenticate(request, user=user)
        return views.ReplaceServiceTypes.as_view()(request)

    @patch("Poem.services.webapi_client.requests.request")
    def test_non_superuser_forbidden(self, mock_request):
        response = self._put([{"name": "s1"}], self.user)
        self.assertEqual(response.status_code, 403)
        mock_request.assert_not_called()

    @patch("Poem.services.webapi_client.requests.request")
    def test_superuser_replaces(self, mock_request):
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
            response = self._put([{"name": "s1"}], self.superuser)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"data": [{"name": "s1"}]})

    @patch("Poem.services.webapi_client.requests.request")
    def test_partial_failure_returns_502(self, mock_request):
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
            response = self._put([{"name": "s1"}], self.superuser)

        self.assertEqual(response.status_code, 502)


class CombinedTenantViewTests(TenantTestCase):
    def setUp(self):
        self.tenant.name = "TENANT"
        self.tenant.combined = True
        self.tenant.save()
        self.factory = TenantRequestFactory(self.tenant)
        self.user = CustUser.objects.create_user(username="testuser")
        WebAPIKey.objects.create(name="WEB-API-TENANT", token="rw-token")
        WebAPIKey.objects.create(
            name="WEB-API-TENANT_X-RO", token="x-ro-token"
        )

    def _get(self, user=None):
        request = self.factory.get(
            "/api/v2/internal/webapi/combined/metricprofiles/"
        )
        if user:
            force_authenticate(request, user=user)
        return views.ListWebApiCombinedMetricProfiles.as_view()(request)

    @patch("Poem.services.webapi_client.requests.request")
    def test_user_without_metric_profile_group_forbidden(self, mock_request):
        response = self._get(user=self.user)
        self.assertEqual(response.status_code, 403)
        mock_request.assert_not_called()

    @patch("Poem.services.webapi_client.requests.request")
    def test_superuser_reads_member_profiles(self, mock_request):
        superuser = CustUser.objects.create_user(
            username="superuser", is_superuser=True
        )

        def side_effect(method, url, **kwargs):
            if "datafeeds" in url:
                return MockResponse(
                    {"data": [{"tenants": ["TENANT_X"]}]}, 200
                )
            return MockResponse({"data": [{"name": "px"}]}, 200)

        mock_request.side_effect = side_effect
        with self.settings(
            WEBAPI_DATAFEEDS="https://webapi.example/datafeeds",
            WEBAPI_METRIC="https://webapi.example/metric",
        ):
            response = self._get(user=superuser)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"TENANT_X": [{"name": "px"}]})
