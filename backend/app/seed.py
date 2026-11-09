from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Reminder, Schedule, StudyMaterial, Subject, Task


def seed_demo_data(db: Session):
    if db.query(Subject).count() > 0:
        return

    sub1 = Subject(
        name="Data Structures",
        code="CS201",
        description="Core programming and algorithmic thinking course.",
        semester="Semester 5",
    )
    sub2 = Subject(
        name="Database Systems",
        code="CS210",
        description="Relational design and SQL optimization concepts.",
        semester="Semester 5",
    )
    sub3 = Subject(
        name="Machine Learning",
        code="AI310",
        description="Supervised learning, evaluation and experimentation.",
        semester="Semester 6",
    )

    db.add_all([sub1, sub2, sub3])
    db.flush()

    tasks = [
        Task(
            title="Assignment 2: Trees",
            description="Prepare and submit algorithm analysis.",
            subject_id=sub1.id,
            activity_type="Assignment",
            assigned_date=date.today(),
            due_date=date.today() + timedelta(days=2),
            priority="High",
            status="Pending",
        ),
        Task(
            title="Quiz revision",
            description="Review SQL joins and queries.",
            subject_id=sub2.id,
            activity_type="Revision",
            assigned_date=date.today(),
            due_date=date.today() + timedelta(days=1),
            priority="Medium",
            status="In Progress",
        ),
        Task(
            title="Model evaluation report",
            description="Summarize metrics and compare classifiers.",
            subject_id=sub3.id,
            activity_type="Homework",
            assigned_date=date.today() - timedelta(days=2),
            due_date=date.today() - timedelta(days=1),
            priority="High",
            status="Completed",
            completed_at=datetime.utcnow(),
        ),
    ]

    db.add_all(tasks)

    schedules = [
        Schedule(
            title="Lecture: Graph Algorithms",
            subject_id=sub1.id,
            activity_type="Lecture",
            scheduled_date=date.today() + timedelta(days=1),
            start_time="09:00",
            end_time="10:30",
            description="Discuss shortest path and spanning tree strategies.",
        ),
        Schedule(
            title="Practical: SQL joins",
            subject_id=sub2.id,
            activity_type="Practical/Lab",
            scheduled_date=date.today() + timedelta(days=2),
            start_time="11:00",
            end_time="12:30",
            description="Hands-on SQL problem solving in the lab.",
        ),
        Schedule(
            title="Internal exam review",
            subject_id=sub3.id,
            activity_type="Internal examination",
            scheduled_date=date.today() + timedelta(days=4),
            start_time="14:00",
            end_time="15:30",
            description="Walkthrough of key ML concepts.",
        ),
    ]

    db.add_all(schedules)

    materials = [
        StudyMaterial(
            title="Trees Notes",
            subject_id=sub1.id,
            unit="Binary Search Trees",
            description="Notes covering traversal and balancing.",
            file_name="trees-notes.pdf",
            file_path="/tmp/trees-notes.pdf",
            mime_type="application/pdf",
            file_size=120000,
        ),
        StudyMaterial(
            title="SQL Cheat Sheet",
            subject_id=sub2.id,
            unit="Joins and Aggregations",
            description="Quick reference for query writing.",
            file_name="sql-cheatsheet.docx",
            file_path="/tmp/sql-cheatsheet.docx",
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            file_size=75000,
        ),
    ]

    db.add_all(materials)

    reminders = [
        Reminder(
            title="Assignment due",
            description="Data Structures assignment needs submission.",
            reminder_at=datetime.utcnow() + timedelta(days=1),
            related_type="Assignment",
            is_completed=False,
        ),
        Reminder(
            title="Exam briefing",
            description="Review the exam schedule and required topics.",
            reminder_at=datetime.utcnow() - timedelta(hours=3),
            related_type="Internal examination",
            is_completed=False,
        ),
    ]

    db.add_all(reminders)
    db.commit()
