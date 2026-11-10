import { useEffect, useRef, useState } from 'react';
import { BellRing, CheckCircle2, Pencil, Trash2, X } from 'lucide-react';
import { completeReminder, createReminder, deleteReminder, getApiErrorMessage, getReminders, updateReminder } from '../api';
import DateInput from '../components/DateInput';
import { combineDateTimeForApi, formatDateTime, splitDateTimeForInput } from '../utils/dateFormatting';
import { applyReminderCompletion } from '../reminderCompletion';
import './RemindersPage.css';

const emptyForm = {
  title: '',
  description: '',
  reminder_date: '',
  reminder_time: '',
  related_type: 'General',
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const titleInput = useRef(null);

  const refresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      setReminders(await getReminders());
      setHasLoaded(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Reminders could not be loaded.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busyAction) return;
    setSuccess('');
    if (!form.title.trim() || !form.reminder_date || !form.reminder_time) {
      setError('Enter a reminder title and time.');
      return;
    }
    const reminderAt = combineDateTimeForApi(form.reminder_date, form.reminder_time);
    if (!reminderAt) {
      setError('Enter a valid reminder date as DD/MM/YYYY and a valid time.');
      return;
    }
    setError('');
    setSuccess('');
    setBusyAction(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        related_type: form.related_type,
        reminder_at: reminderAt,
      };
      if (editingId === null) {
        await createReminder(payload);
      } else {
        await updateReminder(editingId, payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      setSuccess(editingId === null ? 'Reminder created.' : 'Reminder updated.');
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, editingId === null ? 'The reminder could not be created.' : 'The reminder could not be updated.'));
    } finally {
      setBusyAction(false);
    }
  };

  const handleEdit = (reminder) => {
    const { date, time } = splitDateTimeForInput(reminder.reminder_at);
    setForm({
      title: reminder.title || '',
      description: reminder.description || '',
      reminder_date: date,
      reminder_time: time,
      related_type: reminder.related_type || 'General',
    });
    setEditingId(reminder.id);
    setError('');
    setSuccess('');
    titleInput.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
  };

  const handleComplete = async (id) => {
    if (busyAction) return;
    setError('');
    setSuccess('');
    setBusyAction(true);
    try {
      await completeReminder(id);
      setReminders((current) => applyReminderCompletion(current, id, true));
      setSuccess('Reminder marked complete.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The reminder could not be completed.'));
    } finally {
      setBusyAction(false);
    }
  };

  const handleDelete = async (id) => {
    if (busyAction || !window.confirm('Delete this reminder?')) return;
    setError('');
    setSuccess('');
    setBusyAction(true);
    try {
      await deleteReminder(id);
      setSuccess('Reminder deleted.');
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The reminder could not be deleted.'));
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>Reminders</h1>
        </div>
      </div>

      <div className="content-grid two-col">
        {error && <p className="error-panel full-width" role="alert">{error}</p>}
        {success && <p className="muted-pill full-width" role="status">{success}</p>}
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId === null ? 'Add a reminder' : 'Edit reminder'}</h2>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Title
              <input ref={titleInput} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              Reminder time
              <DateInput id="reminder-date" required value={form.reminder_date} onChange={(reminder_date) => setForm({ ...form, reminder_date })} />
              <input aria-label="Reminder time" type="time" required value={form.reminder_time} onChange={(event) => setForm({ ...form, reminder_time: event.target.value })} />
            </label>
            <label>
              Category
              <select value={form.related_type} onChange={(event) => setForm({ ...form, related_type: event.target.value })}>
                <option>General</option>
                <option>Test</option>
                <option>Exam</option>
                <option>Homework</option>
                <option>Class</option>
              </select>
            </label>
            <label className="full-width">
              Description
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <div className="button-row full-width">
              <button type="submit" className="primary-button" disabled={busyAction}>{busyAction ? 'Saving…' : editingId === null ? 'Add reminder' : 'Save changes'}</button>
              {editingId !== null && <button type="button" className="secondary-button" disabled={busyAction} onClick={handleCancelEdit}><X size={16} />Cancel</button>}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Upcoming reminders</h2>
          </div>
          <div className="resource-list">
            {isLoading && <div className="loading-panel" role="status">Loading reminders…</div>}
            {!isLoading && error && !hasLoaded && <button type="button" className="secondary-button" onClick={refresh}>Retry loading reminders</button>}
            {!isLoading && hasLoaded && reminders.length === 0 && <div className="empty-state"><p>No reminders yet. Add one to keep an upcoming activity on your radar.</p><button type="button" className="primary-button" onClick={() => titleInput.current?.focus()}>Add your first reminder</button></div>}
            {!isLoading && reminders.map((reminder) => (
              <div className="resource-card" key={reminder.id}>
                <div className="resource-icon"><BellRing size={18} /></div>
                <div className="resource-body">
                  <h3>{reminder.title}</h3>
                  <p>{reminder.related_type || 'General'}</p>
                  <small>{reminder.description || 'No notes'} • {formatDateTime(reminder.reminder_at)}</small>
                  <span className={`reminder-status-badge reminder-status-${reminder.is_completed ? 'completed' : 'pending'}`}>
                    {reminder.is_completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <div className="resource-actions">
                  <button type="button" aria-label={`Edit ${reminder.title}`} title="Edit reminder" disabled={busyAction} onClick={() => handleEdit(reminder)}><Pencil size={16} /></button>
                  <button type="button" aria-label={reminder.is_completed ? `${reminder.title} is complete` : `Complete ${reminder.title}`} title={reminder.is_completed ? 'Already completed' : 'Mark complete'} disabled={busyAction || reminder.is_completed} onClick={() => handleComplete(reminder.id)}><CheckCircle2 size={16} /></button>
                  <button type="button" className="danger" aria-label={`Delete ${reminder.title}`} title="Delete reminder" disabled={busyAction} onClick={() => handleDelete(reminder.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
