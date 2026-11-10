from fastapi import HTTPException


def update_reminder_record(db, reminder_id, payload, reminder_model):
    reminder = db.query(reminder_model).filter(reminder_model.id == reminder_id).first()
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")

    for field, value in payload.model_dump().items():
        setattr(reminder, field, value)
    db.commit()
    db.refresh(reminder)
    return reminder
