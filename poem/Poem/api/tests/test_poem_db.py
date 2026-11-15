"""Exercise poem-db through Django's real tenant_command option parsing."""

import importlib.machinery
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase


class PoemDbDumpTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        script_path = Path(__file__).resolve().parents[4] / "bin" / "poem-db"
        if not script_path.is_file():
            script_path = Path(sys.prefix) / "bin" / "poem-db"
        loader = importlib.machinery.SourceFileLoader("poem_db", str(script_path))
        spec = importlib.util.spec_from_loader(loader.name, loader)
        cls.poem_db = importlib.util.module_from_spec(spec)
        loader.exec_module(cls.poem_db)

    def _check_dump(self, schema, excluded_models):
        tenant = SimpleNamespace(schema_name=schema)
        forwarded_options = {}

        def dumpdata_handle(command, *args, **options):
            forwarded_options.update(options)
            command.stdout.write("[]")

        with tempfile.TemporaryDirectory() as directory:
            output_path = Path(directory) / "backup.json"
            with (
                patch.object(self.poem_db, "setup_django"),
                patch(
                    "django_tenants.management.commands.tenant_command.Command."
                    "get_tenant_from_options_or_interactive",
                    return_value=tenant,
                ) as get_tenant,
                patch(
                    "django_tenants.management.commands.tenant_command."
                    "connection.set_tenant"
                ) as set_tenant,
                patch(
                    "django.core.management.commands.dumpdata.Command.handle",
                    autospec=True,
                    side_effect=dumpdata_handle,
                ) as dumpdata,
            ):
                result = self.poem_db.main([
                    "-p", "-n", schema, "-f", str(output_path),
                ])

            self.assertEqual(result, 0)
            self.assertEqual(json.loads(output_path.read_text()), [])

        get_tenant.assert_called_once()
        self.assertEqual(get_tenant.call_args.kwargs["schema_name"], schema)
        set_tenant.assert_called_once_with(tenant)
        dumpdata.assert_called_once()
        self.assertEqual(forwarded_options["indent"], 2)
        self.assertTrue(forwarded_options["use_natural_foreign_keys"])
        self.assertTrue(forwarded_options["use_natural_primary_keys"])
        self.assertEqual(forwarded_options["exclude"], excluded_models)

    def test_dump_tenant_forwards_dumpdata_options(self):
        self._check_dump("test_tenant", [])

    def test_dump_public_excludes_tenant_and_domain(self):
        self._check_dump("public", ["tenants.tenant", "tenants.domain"])
