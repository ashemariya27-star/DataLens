import ast
import re
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class MaterialUploadContractTests(unittest.TestCase):
    def test_backend_accepts_the_multipart_fields_sent_by_frontend(self):
        main_source = (PROJECT_ROOT / "backend" / "app" / "main.py").read_text(encoding="utf-8")
        module = ast.parse(main_source)
        route = next(
            node for node in module.body
            if isinstance(node, ast.FunctionDef) and node.name == "create_material"
        )

        form_fields = {"title", "subject_id", "unit", "description"}
        arguments = route.args.args
        defaults = [None] * (len(arguments) - len(route.args.defaults)) + route.args.defaults
        parameters = {argument.arg: default for argument, default in zip(arguments, defaults)}
        self.assertNotIn("payload", parameters)
        self.assertTrue(form_fields.issubset(parameters))
        for field in form_fields:
            with self.subTest(field=field):
                self.assertIsInstance(parameters[field], ast.Call)
                self.assertEqual(parameters[field].func.id, "Form")

        materials_page = (PROJECT_ROOT / "frontend" / "src" / "pages" / "MaterialsPage.jsx").read_text(encoding="utf-8")
        appended_fields = set(re.findall(r"formData\.append\(['\"]([^'\"]+)['\"]", materials_page))
        self.assertEqual(appended_fields, form_fields | {"file"})
        self.assertIn("file", parameters)
        self.assertIsInstance(parameters["file"], ast.Call)
        self.assertEqual(parameters["file"].func.id, "File")


if __name__ == "__main__":
    unittest.main()
