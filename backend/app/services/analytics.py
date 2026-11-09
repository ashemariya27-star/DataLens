import io
import uuid
from pathlib import Path

import pandas as pd
from fastapi import HTTPException, UploadFile

from app.core.config import UPLOAD_DIR


def analyze_uploaded_file(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    filename = file.filename
    extension = Path(filename).suffix.lower()
    if extension not in {".csv", ".xlsx", ".xls"}:
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported.")

    contents = file.file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        if extension == ".csv":
            frame = pd.read_csv(io.BytesIO(contents))
        else:
            frame = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to read the uploaded file: {exc}") from exc

    if frame.empty:
        raise HTTPException(status_code=400, detail="The uploaded dataset is empty.")

    missing_values = {
        str(column): int(value) for column, value in frame.isna().sum().items() if int(value) > 0
    }
    duplicate_rows = int(frame.duplicated().sum())
    numeric_columns = list(frame.select_dtypes(include=['number']).columns)

    stats = {}
    for column in numeric_columns:
        series = pd.to_numeric(frame[column], errors='coerce')
        clean = series.dropna()
        if clean.empty:
            continue
        stats[str(column)] = {
            "count": int(clean.count()),
            "mean": float(clean.mean()),
            "min": float(clean.min()),
            "max": float(clean.max()),
            "median": float(clean.median()),
            "std": float(clean.std()) if clean.nunique() > 1 else 0.0,
        }

    preview = frame.head(20).replace({pd.NA: None, pd.NaT: None}).to_dict(orient="records")

    chart_summary = []
    if numeric_columns:
        for column in numeric_columns[:2]:
            chart_summary.append({
                "type": "histogram",
                "title": f"Distribution of {column}",
                "column": column,
                "values": [
                    {"label": str(idx), "value": float(value)}
                    for idx, value in enumerate(pd.to_numeric(frame[column], errors='coerce').dropna().tolist()[:20])
                ],
            })

    categorical_columns = [column for column in frame.columns if column not in numeric_columns]
    if categorical_columns:
        sample_column = categorical_columns[0]
        counts = frame[sample_column].fillna("Missing").astype(str).value_counts().head(6)
        chart_summary.append({
            "type": "bar",
            "title": f"Top values in {sample_column}",
            "column": sample_column,
            "values": [{"label": str(label), "value": int(value)} for label, value in counts.items()],
        })

    cleaned_frame = frame.drop_duplicates()
    cleaned_file_path = UPLOAD_DIR / f"{uuid.uuid4()}_cleaned.csv"
    cleaned_frame.to_csv(cleaned_file_path, index=False)

    return {
        "filename": filename,
        "file_type": extension.lstrip('.').upper(),
        "size_bytes": len(contents),
        "row_count": int(len(frame)),
        "column_count": int(len(frame.columns)),
        "column_names": [str(column) for column in frame.columns],
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "stats": stats,
        "preview": preview,
        "chart_summary": chart_summary,
        "cleaned_csv_path": str(cleaned_file_path),
    }
