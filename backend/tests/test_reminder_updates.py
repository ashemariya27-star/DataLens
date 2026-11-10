import ast
import unittest
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas import ReminderUpdate
from app.services.reminder_updates import update_reminder_record


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class FakeColumn:
    def __eq__(self, value):
        return ("id", value)


class FakeReminderModel:
    id = FakeColumn()


class FakeQuery:
    def __init__(self, record):
        self.record = record
        self.filter_expression = None

    def filter(self, expression):
        self.filter_expression = expression
        return self

    def first(self):
        return self.record


class FakeSession:
    def __init__(self, record):
        self.query_result = FakeQuery(record)
        self.commits = 0
        self.refreshed = None

    def query(self, model):
        if model is not FakeReminderModel:
            raise AssertionError("Unexpected reminder model")
        return self.query_result

    def commit(self):
        self.commits += 1

    def refresh(self, record):
        self.refreshed = record


class ReminderUpdateSchemaTests(unittest.TestCase):
    def test_accepts_valid_edit_fields_without_completion_status(self):
        payload = ReminderUpdate(
            title="Review notes",
            description="Chapter 2",
            reminder_at="2026-11-12T10:30:00",
            related_type="Homework",
        )
        self.assertEqual(payload.title, "Review notes")
        self.assertNotIn("is_completed", payload.model_dump())

    def test_rejects_blank_title_invalid_date_and_overlong_category(self):
        base = {
            "title": "Reminder",
            "description": None,
            "reminder_at": "2026-11-12T10:30:00",
            "related_type": "General",
        }
        for changes in (
            {"title": "   "},
            {"reminder_at": "not-a-date"},
            {"related_type": "x" * 101},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValidationError):
                ReminderUpdate(**(base | changes))


class ReminderUpdateServiceTests(unittest.TestCase):
    def test_updates_editable_fields_and_preserves_completion(self):
        existing = SimpleNamespace(
            id=8,
            title="Old title",
            description="Old description",
            reminder_at=datetime(2026, 11, 11, 9, 0),
            related_type="Test",
            is_completed=True,
        )
        session = FakeSession(existing)
        payload = ReminderUpdate(
            title="New title",
            description="Updated notes",
            reminder_at=datetime(2026, 11, 12, 10, 30),
            related_type="Homework",
        )

        result = update_reminder_record(session, 8, payload, FakeReminderModel)

        self.assertIs(result, existing)
        self.assertEqual(result.title, "New title")
        self.assertEqual(result.description, "Updated notes")
        self.assertEqual(result.reminder_at, datetime(2026, 11, 12, 10, 30))
        self.assertEqual(result.related_type, "Homework")
        self.assertTrue(result.is_completed)
        self.assertEqual(session.commits, 1)
        self.assertIs(session.refreshed, existing)

    def test_missing_reminder_returns_404_without_committing(self):
        session = FakeSession(None)
        payload = ReminderUpdate(title="Reminder", reminder_at="2026-11-12T10:30:00")

        with self.assertRaises(HTTPException) as raised:
            update_reminder_record(session, 404, payload, FakeReminderModel)

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(session.commits, 0)

    def test_put_route_is_wired_to_update_service(self):
        source = (PROJECT_ROOT / "backend" / "app" / "main.py").read_text(encoding="utf-8")
        module = ast.parse(source)
        route = next(
            node for node in module.body
            if isinstance(node, ast.FunctionDef) and node.name == "update_reminder"
        )
        decorator = route.decorator_list[0]
        self.assertEqual(decorator.func.attr, "put")
        self.assertEqual(decorator.args[0].value, "/api/reminders/{reminder_id}")
        self.assertTrue(any(
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "update_reminder_record"
            for node in ast.walk(route)
        ))

    def _load_completion_endpoint(self):
        source = (PROJECT_ROOT / "backend" / "app" / "main.py").read_text(encoding="utf-8")
        module = ast.parse(source)
        route = next(
            node for node in module.body
            if isinstance(node, ast.FunctionDef) and node.name == "complete_reminder"
        )
        route.decorator_list = []
        namespace = {
            "Depends": lambda dependency: None,
            "get_db": lambda: None,
            "Session": object,
            "Reminder": FakeReminderModel,
            "HTTPException": HTTPException,
        }
        exec(compile(ast.Module(body=[route], type_ignores=[]), "main.py", "exec"), namespace)
        return namespace["complete_reminder"]

    def test_completion_route_persists_existing_is_completed_field(self):
        reminder = SimpleNamespace(id=12, is_completed=False)
        session = FakeSession(reminder)

        result = self._load_completion_endpoint()(12, session)

        self.assertTrue(reminder.is_completed)
        self.assertEqual(session.commits, 1)
        self.assertEqual(result, {"message": "Reminder completed"})

    def test_completion_route_returns_404_for_missing_reminder(self):
        session = FakeSession(None)

        with self.assertRaises(HTTPException) as raised:
            self._load_completion_endpoint()(404, session)

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(session.commits, 0)


if __name__ == "__main__":
    unittest.main()
