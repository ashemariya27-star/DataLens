from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SubjectCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    semester: str


class SubjectRead(SubjectCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class TaskCreate(BaseModel):
    title: str
    subject_id: int
    description: Optional[str] = None
    activity_type: str
    assigned_date: Optional[date] = None
    due_date: Optional[date] = None
    priority: str = "Medium"
    status: str = "Pending"


class TaskRead(TaskCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    subject_name: Optional[str] = None


class ScheduleCreate(BaseModel):
    title: str
    subject_id: int
    activity_type: str
    scheduled_date: date
    start_time: str
    end_time: str
    description: Optional[str] = None


class ScheduleRead(ScheduleCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    subject_name: Optional[str] = None


class MaterialCreate(BaseModel):
    title: str
    subject_id: int
    unit: str
    description: Optional[str] = None


class MaterialRead(MaterialCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    file_name: str
    file_path: str
    mime_type: str
    file_size: int
    uploaded_at: datetime
    subject_name: Optional[str] = None


class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    reminder_at: datetime
    related_type: Optional[str] = None
    is_completed: bool = False


class ReminderUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    reminder_at: datetime
    related_type: Optional[str] = Field(default=None, max_length=100)

    @field_validator("title", mode="before")
    @classmethod
    def title_must_not_be_blank(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
        if value == "":
            raise ValueError("Title must not be blank.")
        return value


class ReminderRead(ReminderCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class DatasetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    file_type: str
    size_bytes: int
    row_count: int
    column_count: int
    column_names: list[str]
    missing_values: dict[str, Any]
    duplicate_rows: int
    stats: dict[str, Any]
    preview: list[dict[str, Any]]
    chart_summary: list[dict[str, Any]]
    uploaded_at: datetime


class DashboardSummary(BaseModel):
    total_subjects: int
    total_tasks: int
    pending_tasks: int
    completed_tasks: int
    upcoming_tests: int
    upcoming_reminders: int
    overdue_assignments: int
    weekly_activity: list[dict[str, Any]]
    recent_activities: list[dict[str, Any]]
