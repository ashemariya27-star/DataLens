import { useEffect, useState } from 'react';
import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { createSchedule, deleteSchedule, getSchedules, getSubjects, updateSchedule } from '../api';

const emptyForm = {
  title: '',
  subject_id: '',
  activity_type: 'Lecture',
  scheduled_date: '',
  start_time: '09:00',
  end_time: '10:00',
  description: '',
};

export default function PlannerPage() {
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const refresh = async () => {
    const [scheduleData, subjectData] = await Promise.all([getSchedules(), getSubjects()]);
    setSchedules(scheduleData);
    setSubjects(subjectData);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { ...form, subject_id: Number(form.subject_id) };
    if (editingId) {
      await updateSchedule(editingId, payload);
    } else {
      await createSchedule(payload);
    }
    setForm(emptyForm);
    setEditingId(null);
    refresh();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      subject_id: item.subject_id,
      activity_type: item.activity_type,
      scheduled_date: item.scheduled_date,
      start_time: item.start_time,
      end_time: item.end_time,
      description: item.description || '',
    });
  };

  const handleDelete = async (id) => {
    await deleteSchedule(id);
    refresh();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Plan</p>
          <h1>Weekly planner</h1>
        </div>
      </div>

      <div className="content-grid two-col">
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId ? 'Edit entry' : 'Schedule activity'}</h2>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              Subject
              <select value={form.subject_id} onChange={(event) => setForm({ ...form, subject_id: event.target.value })}>
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select value={form.activity_type} onChange={(event) => setForm({ ...form, activity_type: event.target.value })}>
                <option>Lecture</option>
                <option>Revision</option>
                <option>Test</option>
                <option>Internal examination</option>
                <option>Practical/Lab</option>
                <option>Homework</option>
              </select>
            </label>
            <label>
              Date
              <input type="date" value={form.scheduled_date} onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })} />
            </label>
            <label>
              Start time
              <input type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
            </label>
            <label>
              End time
              <input type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
            </label>
            <label className="full-width">
              Description
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <div className="button-row full-width">
              <button type="submit" className="primary-button">{editingId ? 'Update entry' : 'Add entry'}</button>
              {editingId && (
                <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Upcoming schedule</h2>
          </div>
          <div className="resource-list">
            {schedules.map((item) => (
              <div className="resource-card" key={item.id}>
                <div className="resource-icon"><CalendarDays size={18} /></div>
                <div className="resource-body">
                  <h3>{item.title}</h3>
                  <p>{item.subject_name || item.subject_id} • {item.activity_type}</p>
                  <small>{item.scheduled_date} • {item.start_time} to {item.end_time}</small>
                </div>
                <div className="resource-actions">
                  <button type="button" onClick={() => handleEdit(item)}><Pencil size={16} /></button>
                  <button type="button" className="danger" onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
