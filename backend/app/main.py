import os
import re
import uuid
from datetime import date, datetime
from pathlib import Path
from urllib.parse import quote

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.core.config import UPLOAD_DIR
from app.database import Base, SessionLocal, engine, get_db
from app.models import Dataset, Reminder, Schedule, StudyMaterial, Subject, Task
from app.seed import seed_demo_data
from app.schemas import (
    DashboardSummary,
    DatasetRead,
    MaterialRead,
    ReminderCreate,
    ReminderRead,
    ReminderUpdate,
    ScheduleCreate,
    ScheduleRead,
    SubjectCreate,
    SubjectRead,
    TaskCreate,
    TaskRead,
)
from app.services.analytics import analyze_uploaded_file
from app.services.export_safety import has_duplicate_file_reference, resolve_cleaned_file, stream_spreadsheet_safe_csv
from app.services.reports import build_dataset_report
from app.services.reminder_updates import update_reminder_record

app = FastAPI(title="DataLens API", version="1.0.0")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "DataLens API"}


@app.get("/api/dashboard", response_model=DashboardSummary)
def get_dashboard(db: Session = Depends(get_db)):
    total_subjects = db.query(Subject).count()
    total_tasks = db.query(Task).count()
    pending_tasks = db.query(Task).filter(Task.status == "Pending").count()
    completed_tasks = db.query(Task).filter(Task.status == "Completed").count()
    upcoming_tests = db.query(Task).filter(
        Task.activity_type.in_(["Test", "Internal examination", "University examination"]),
        Task.status != "Completed",
        Task.due_date >= date.today(),
    ).count()
    upcoming_reminders = db.query(Reminder).filter(
        Reminder.reminder_at >= datetime.utcnow(),
        Reminder.is_completed.is_(False),
    ).count()
    overdue_assignments = db.query(Task).filter(
        Task.activity_type.in_(["Assignment", "Homework"]),
        Task.status != "Completed",
        Task.due_date < date.today(),
    ).count()

    weekly_activity = []
    for offset in range(7):
        day = date.today() + __import__("datetime").timedelta(days=offset)
        task_count = db.query(Task).filter(
            Task.assigned_date == day,
        ).count()
        schedule_count = db.query(Schedule).filter(
            Schedule.scheduled_date == day,
        ).count()
        weekly_activity.append({"day": day.strftime("%a"), "date": day.isoformat(), "value": task_count + schedule_count})

    recent_activities = []
    for task in db.query(Task).order_by(Task.created_at.desc()).limit(5):
        recent_activities.append({
            "type": "Task",
            "title": task.title,
            "description": task.activity_type,
            "date": task.created_at.strftime("%Y-%m-%d"),
        })
    for schedule in db.query(Schedule).order_by(Schedule.created_at.desc()).limit(3):
        recent_activities.append({
            "type": "Schedule",
            "title": schedule.title,
            "description": schedule.activity_type,
            "date": schedule.created_at.strftime("%Y-%m-%d"),
        })
    recent_activities = sorted(recent_activities, key=lambda item: item["date"], reverse=True)[:6]

    return DashboardSummary(
        total_subjects=total_subjects,
        total_tasks=total_tasks,
        pending_tasks=pending_tasks,
        completed_tasks=completed_tasks,
        upcoming_tests=upcoming_tests,
        upcoming_reminders=upcoming_reminders,
        overdue_assignments=overdue_assignments,
        weekly_activity=weekly_activity,
        recent_activities=recent_activities,
    )


@app.get("/api/subjects", response_model=list[SubjectRead])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.id).all()


@app.post("/api/subjects", response_model=SubjectRead)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db)):
    subject = Subject(**payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@app.put("/api/subjects/{subject_id}", response_model=SubjectRead)
def update_subject(subject_id: int, payload: SubjectCreate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    for key, value in payload.model_dump().items():
        setattr(subject, key, value)
    db.commit()
    db.refresh(subject)
    return subject


@app.delete("/api/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted"}


@app.get("/api/tasks", response_model=list[TaskRead])
def list_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).order_by(Task.due_date.asc().nullslast()).all()
    results = []
    for task in tasks:
        item = TaskRead.model_validate(task)
        item.subject_name = task.subject.name if task.subject else None
        results.append(item)
    return results


@app.post("/api/tasks", response_model=TaskRead)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    task_data = payload.model_dump()
    # assigned_date is optional in the request schema but required by the table.
    # Use the existing model's intended current-date behavior when it is blank.
    if task_data["assigned_date"] is None:
        task_data["assigned_date"] = date.today()
    task = Task(**task_data)
    if payload.status == "Completed":
        task.completed_at = datetime.utcnow()
    db.add(task)
    db.commit()
    db.refresh(task)
    task.subject_name = task.subject.name if task.subject else None
    return task


@app.put("/api/tasks/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskCreate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in payload.model_dump().items():
        # The stored assigned_date column is non-nullable; a blank optional
        # value means leave the current assigned date unchanged.
        if key == "assigned_date" and value is None:
            continue
        setattr(task, key, value)
    if payload.status == "Completed" and task.completed_at is None:
        task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    task.subject_name = task.subject.name if task.subject else None
    return task


@app.patch("/api/tasks/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = "Completed"
    task.completed_at = datetime.utcnow()
    db.commit()
    return {"message": "Task marked complete"}


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}


@app.get("/api/schedules", response_model=list[ScheduleRead])
def list_schedules(db: Session = Depends(get_db)):
    schedules = db.query(Schedule).order_by(Schedule.scheduled_date.asc()).all()
    results = []
    for item in schedules:
        dto = ScheduleRead.model_validate(item)
        dto.subject_name = item.subject.name if item.subject else None
        results.append(dto)
    return results


@app.post("/api/schedules", response_model=ScheduleRead)
def create_schedule(payload: ScheduleCreate, db: Session = Depends(get_db)):
    schedule = Schedule(**payload.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    schedule.subject_name = schedule.subject.name if schedule.subject else None
    return schedule


@app.put("/api/schedules/{schedule_id}", response_model=ScheduleRead)
def update_schedule(schedule_id: int, payload: ScheduleCreate, db: Session = Depends(get_db)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    for key, value in payload.model_dump().items():
        setattr(schedule, key, value)
    db.commit()
    db.refresh(schedule)
    schedule.subject_name = schedule.subject.name if schedule.subject else None
    return schedule


@app.delete("/api/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    return {"message": "Schedule deleted"}


@app.get("/api/materials", response_model=list[MaterialRead])
def list_materials(db: Session = Depends(get_db)):
    materials = db.query(StudyMaterial).order_by(StudyMaterial.uploaded_at.desc()).all()
    results = []
    for material in materials:
        dto = MaterialRead.model_validate(material)
        dto.subject_name = material.subject.name if material.subject else None
        results.append(dto)
    return results


@app.post("/api/materials", response_model=MaterialRead)
def create_material(
    title: str = Form(...),
    subject_id: int = Form(...),
    unit: str = Form(...),
    description: str | None = Form(default=None),
    file: UploadFile = File(default=None),
    db: Session = Depends(get_db),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="A file upload is required.")

    file_bytes = file.file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Please upload a file smaller than 10MB.")

    allowed_types = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
    if file.content_type not in allowed_types and not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    safe_name = f"{uuid.uuid4()}_{file.filename}"
    storage_path = UPLOAD_DIR / safe_name
    with open(storage_path, "wb") as handle:
        handle.write(file_bytes)

    material = StudyMaterial(
        title=title,
        subject_id=subject_id,
        unit=unit,
        description=description,
        file_name=file.filename,
        file_path=f"/uploads/{safe_name}",
        mime_type=file.content_type or "application/octet-stream",
        file_size=len(file_bytes),
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    material.subject_name = subject.name
    return material


@app.delete("/api/materials/{material_id}")
def delete_material(material_id: int, db: Session = Depends(get_db)):
    material = db.query(StudyMaterial).filter(StudyMaterial.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    if material.file_path and material.file_path.startswith("/uploads/"):
        try:
            file_disk_path = UPLOAD_DIR / os.path.basename(material.file_path)
            if os.path.exists(file_disk_path):
                os.remove(file_disk_path)
        except OSError:
            pass
    db.delete(material)
    db.commit()
    return {"message": "Material deleted"}


@app.get("/api/reminders", response_model=list[ReminderRead])
def list_reminders(db: Session = Depends(get_db)):
    return db.query(Reminder).order_by(Reminder.reminder_at.asc()).all()


@app.post("/api/reminders", response_model=ReminderRead)
def create_reminder(payload: ReminderCreate, db: Session = Depends(get_db)):
    reminder = Reminder(**payload.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@app.put("/api/reminders/{reminder_id}", response_model=ReminderRead)
def update_reminder(reminder_id: int, payload: ReminderUpdate, db: Session = Depends(get_db)):
    return update_reminder_record(db, reminder_id, payload, Reminder)


@app.patch("/api/reminders/{reminder_id}/complete")
def complete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.is_completed = True
    db.commit()
    return {"message": "Reminder completed"}


@app.delete("/api/reminders/{reminder_id}")
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted"}


@app.get("/api/datasets", response_model=list[DatasetRead])
def list_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()


@app.post("/api/analytics/upload", response_model=DatasetRead)
def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    payload = analyze_uploaded_file(file)
    dataset_record = Dataset(
        filename=payload["filename"],
        file_type=payload["file_type"],
        size_bytes=payload["size_bytes"],
        row_count=payload["row_count"],
        column_count=payload["column_count"],
        column_names=payload["column_names"],
        missing_values=payload["missing_values"],
        duplicate_rows=payload["duplicate_rows"],
        stats=payload["stats"],
        preview=payload["preview"],
        chart_summary=payload["chart_summary"],
        cleaned_csv_path=payload["cleaned_csv_path"],
    )
    db.add(dataset_record)
    db.commit()
    db.refresh(dataset_record)
    return dataset_record


def _dataset_download_name(filename: str, suffix: str) -> str:
    stem = Path(Path(filename).name).stem
    safe_stem = re.sub(r"[^\w.-]+", "_", stem, flags=re.UNICODE).strip("._- ") or "dataset"
    return f"{safe_stem}_{suffix}"


@app.get("/api/datasets/{dataset_id}/cleaned.csv")
def download_cleaned_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    if not dataset.cleaned_csv_path:
        raise HTTPException(status_code=404, detail="The cleaned CSV is not available for this dataset.")

    cleaned_path = resolve_cleaned_file(dataset.cleaned_csv_path, UPLOAD_DIR)
    if cleaned_path is None:
        raise HTTPException(status_code=404, detail="The cleaned CSV is missing or unavailable.") from None

    references = db.query(Dataset.id, Dataset.cleaned_csv_path).filter(
        Dataset.cleaned_csv_path == dataset.cleaned_csv_path,
    ).all()
    if has_duplicate_file_reference(dataset_id, dataset.cleaned_csv_path, references):
        raise HTTPException(status_code=404, detail="The cleaned CSV is missing or unavailable.")

    try:
        source = cleaned_path.open("r", encoding="utf-8-sig", newline="")
    except OSError:
        raise HTTPException(status_code=404, detail="The cleaned CSV is missing or unavailable.") from None

    filename = _dataset_download_name(dataset.filename, "cleaned.csv")
    ascii_filename = re.sub(r"[^A-Za-z0-9._-]+", "_", filename).strip("._-") or "dataset_cleaned.csv"
    return StreamingResponse(
        stream_spreadsheet_safe_csv(source),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=\"{ascii_filename}\"; filename*=UTF-8''{quote(filename)}"
        },
    )


@app.get("/api/datasets/{dataset_id}/report.pdf")
def download_dataset_report(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    content = build_dataset_report(dataset)
    filename = _dataset_download_name(dataset.filename, "report.pdf")
    ascii_filename = re.sub(r"[^A-Za-z0-9._-]+", "_", filename).strip("._-") or "dataset_report.pdf"
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{ascii_filename}\"; filename*=UTF-8''{quote(filename)}"
        },
    )


@app.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.cleaned_csv_path:
        import os
        try:
            if os.path.exists(dataset.cleaned_csv_path):
                os.remove(dataset.cleaned_csv_path)
        except OSError:
            pass
    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted"}
