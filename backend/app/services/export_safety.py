import csv
import io
import os
import re
import unicodedata
from pathlib import Path
from typing import TextIO


_NUMERIC_CELL = re.compile(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\Z")
_CLEANED_FILENAME = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}_cleaned\.csv\Z"
)


def protect_spreadsheet_cell(value: str) -> str:
    """Prefix formula-like text while leaving ordinary numeric strings unchanged."""
    text = str(value)
    index = 0
    while index < len(text) and (text[index].isspace() or unicodedata.category(text[index]).startswith("C")):
        index += 1

    candidate = text[index:]
    if not candidate or candidate[0] not in "=+-@":
        return text
    numeric_end = len(candidate)
    while numeric_end > 0 and (candidate[numeric_end - 1].isspace() or unicodedata.category(candidate[numeric_end - 1]).startswith("C")):
        numeric_end -= 1
    if _NUMERIC_CELL.fullmatch(candidate[:numeric_end]):
        return text
    return f"'{text}"


def resolve_cleaned_file(cleaned_csv_path: str | None, upload_dir: str | Path) -> Path | None:
    """Return an existing UUID-named cleaned CSV rooted inside upload_dir."""
    if not cleaned_csv_path:
        return None

    candidate = Path(cleaned_csv_path)
    if not _CLEANED_FILENAME.fullmatch(candidate.name):
        return None

    try:
        upload_root = Path(upload_dir).resolve()
        lexical_candidate = Path(os.path.abspath(candidate))
        relative_candidate = lexical_candidate.relative_to(upload_root)
        current = upload_root
        for component in relative_candidate.parts:
            current = current / component
            if current.is_symlink():
                return None
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(upload_root)
    except (OSError, RuntimeError, ValueError):
        return None

    if not resolved.is_file() or not _CLEANED_FILENAME.fullmatch(resolved.name):
        return None
    return resolved


def has_duplicate_file_reference(dataset_id: int, cleaned_csv_path: str, references) -> bool:
    """Reject a stored cleaned-file path that is also assigned to another dataset."""
    return any(
        reference_id != dataset_id and reference_path == cleaned_csv_path
        for reference_id, reference_path in references
    )


def stream_spreadsheet_safe_csv(file_handle: TextIO):
    """Yield a UTF-8 BOM and safely re-serialized CSV rows without buffering the file."""
    try:
        yield b"\xef\xbb\xbf"
        reader = csv.reader(file_handle)
        for row in reader:
            output = io.StringIO(newline="")
            writer = csv.writer(output, lineterminator="\r\n")
            writer.writerow([protect_spreadsheet_cell(value) for value in row])
            yield output.getvalue().encode("utf-8")
    finally:
        file_handle.close()
