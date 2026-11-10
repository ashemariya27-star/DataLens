export function applyReminderCompletion(reminders, reminderId, isCompleted) {
  return reminders.map((reminder) => (
    reminder.id === reminderId
      ? { ...reminder, is_completed: isCompleted }
      : reminder
  ));
}
