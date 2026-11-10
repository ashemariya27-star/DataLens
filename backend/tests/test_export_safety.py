import csv
import io
import tempfile
import unittest
from pathlib import Path

from app.services.export_safety import (
    has_duplicate_file_reference,
    protect_spreadsheet_cell,
    resolve_cleaned_file,
    stream_spreadsheet_safe_csv,
)


class SpreadsheetCellSafetyTests(unittest.TestCase):
    def test_formula_prefixes_are_escaped_after_leading_controls(self):
        for value in ("=SUM(A1:A2)", "+1+2", "-cmd|' /C calc'!A0", "@SUM(A1)", " \t\r\n=1+1", "\x00@SUM(A1)", "\u200b=1+1"):
            with self.subTest(value=value):
                self.assertEqual(protect_spreadsheet_cell(value), f"'{value}")

    def test_numeric_values_keep_their_sign_and_whitespace(self):
        for value in ("-42", " -42.75 ", "+4.2e3", "0", "\t-1.5"):
            with self.subTest(value=value):
                self.assertEqual(protect_spreadsheet_cell(value), value)

    def test_csv_round_trip_keeps_quoting_and_escapes_formula_text(self):
        source = io.StringIO('title,description\r\n"comma, value","line one\nline two"\r\n=1+1,"say ""hello"""\r\n')
        sanitized = b"".join(stream_spreadsheet_safe_csv(source)).decode("utf-8-sig")
        rows = list(csv.reader(io.StringIO(sanitized, newline="")))
        self.assertEqual(rows[1], ["comma, value", "line one\nline two"])
        self.assertEqual(rows[2], ["'=1+1", 'say "hello"'])


class CleanedFilePathTests(unittest.TestCase):
    def test_accepts_only_existing_generated_file_inside_upload_root(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir) / "uploads"
            root.mkdir()
            cleaned = root / "93ae168f-ae99-46c6-8490-de0a906d6c0c_cleaned.csv"
            cleaned.write_text("value\n1\n", encoding="utf-8")
            self.assertEqual(resolve_cleaned_file(str(cleaned), root), cleaned.resolve())

            outside = Path(temporary_dir) / "93ae168f-ae99-46c6-8490-de0a906d6c0c_cleaned.csv"
            outside.write_text("secret\n", encoding="utf-8")
            self.assertIsNone(resolve_cleaned_file(str(outside), root))
            self.assertIsNone(resolve_cleaned_file(str(root / "source.csv"), root))
            self.assertIsNone(resolve_cleaned_file(str(root / "11111111-1111-1111-1111-111111111111_cleaned.csv"), root))
            symlink = root / "11111111-1111-1111-1111-111111111111_cleaned.csv"
            try:
                symlink.symlink_to(outside)
            except (OSError, NotImplementedError):
                pass
            else:
                self.assertIsNone(resolve_cleaned_file(str(symlink), root))

    def test_detects_paths_shared_with_another_dataset(self):
        path = "93ae168f-ae99-46c6-8490-de0a906d6c0c_cleaned.csv"
        self.assertFalse(has_duplicate_file_reference(7, path, [(7, path)]))
        self.assertTrue(has_duplicate_file_reference(7, path, [(7, path), (8, path)]))


if __name__ == "__main__":
    unittest.main()
