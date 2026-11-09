import { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Trash2 } from 'lucide-react';
import { completeReminder, createReminder, deleteReminder, getReminders } from '../api';

const emptyForm = {
  title: '',
  description: '',
  reminder_at: '',
  related_type: 'General',
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const refresh = async () => {
    const data = await getReminders();
    setReminders(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title || !form.reminder_at) {
      return;
    }
    await createReminder({
      ...form,
      reminder_at: new Date(form.reminder_at).toISOString(),
    });
    setForm(emptyForm);
    refresh();
  };

  const handleComplete = async (id) => {
    await completeReminder(id);
    refresh();
  };

  const handleDelete = async (id) => {
    await deleteReminder(id);
    refresh();
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
        <section className="panel">
          <div className="section-heading">
            <h2>Add a reminder</h2>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              Reminder time
              <input type="datetime-local" value={form.reminder_at} onChange={(event) => setForm({ ...form, reminder_at: event.target.value })} />
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
              <button type="submit" className="primary-button">Add reminder</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Upcoming reminders</h2>
          </div>
          <div className="resource-list">
            {reminders.map((reminder) => (
              <div className="resource-card" key={reminder.id}>
                <div className="resource-icon"><BellRing size={18} /></div>
                <div className="resource-body">
                  <h3>{reminder.title}</h3>
                  <p>{reminder.related_type || 'General'}</p>
                  <small>{reminder.description || 'No notes'} • {new Date(reminder.reminder_at).toLocaleString()}</small>
                </div>
                <div className="resource-actions">
                  <button type="button" onClick={() => handleComplete(reminder.id)}><CheckCircle2 size={16} /></button>
                  <button type="button" className="danger" onClick={() => handleDelete(reminder.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
