from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    semester = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    tasks = relationship("Task", back_populates="subject")
    schedules = relationship("Schedule", back_populates="subject")
    materials = relationship("StudyMaterial", back_populates="subject")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    activity_type = Column(String(100), nullable=False)
    assigned_date = Column(Date, default=datetime.utcnow().date, nullable=False)
    due_date = Column(Date, nullable=True)
    priority = Column(String(50), default="Medium", nullable=False)
    status = Column(String(50), default="Pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    subject = relationship("Subject", back_populates="tasks")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    activity_type = Column(String(100), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    start_time = Column(String(20), nullable=False)
    end_time = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    subject = relationship("Subject", back_populates="schedules")


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    unit = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, default=0, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    subject = relationship("Subject", back_populates="materials")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    reminder_at = Column(DateTime, nullable=False)
    related_type = Column(String(100), nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    size_bytes = Column(Integer, default=0, nullable=False)
    row_count = Column(Integer, default=0, nullable=False)
    column_count = Column(Integer, default=0, nullable=False)
    column_names = Column(JSON, nullable=False, default=list)
    missing_values = Column(JSON, nullable=False, default=dict)
    duplicate_rows = Column(Integer, default=0, nullable=False)
    stats = Column(JSON, nullable=False, default=dict)
    preview = Column(JSON, nullable=False, default=list)
    chart_summary = Column(JSON, nullable=False, default=list)
    cleaned_csv_path = Column(String(500), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
