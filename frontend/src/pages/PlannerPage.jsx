import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Download, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createSchedule, deleteSchedule, downloadCsv, getApiErrorMessage, getSchedules, getSubjects, updateSchedule } from '../api';
import DateInput from '../components/DateInput';
import { formatDate, formatDateInput, formatTime, parseDateInput } from '../utils/dateFormatting';
import './AcademicExports.css';

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
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const titleInput = useRef(null);

  const refresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [scheduleData, subjectData] = await Promise.all([getSchedules(), getSubjects()]);
      setSchedules(scheduleData);
      setSubjects(subjectData);
      setHasLoaded(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The weekly planner could not be loaded.'));
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
    setError('');
    setSuccess('');
    if (!form.title.trim() || !form.subject_id || !form.scheduled_date || !form.start_time || !form.end_time) {
      setError('Enter a title, subject, date, start time, and end time.');
      return;
    }
    const scheduledDate = parseDateInput(form.scheduled_date);
    if (!scheduledDate) {
      setError('Enter a valid date in DD/MM/YYYY format.');
      return;
    }
    if (form.end_time <= form.start_time) {
      setError('End time must be later than start time.');
      return;
    }

    const payload = { ...form, title: form.title.trim(), subject_id: Number(form.subject_id), scheduled_date: scheduledDate };
    setBusyAction(true);
    try {
      if (editingId) {
        await updateSchedule(editingId, payload);
        setSuccess('Planner entry updated.');
      } else {
        await createSchedule(payload);
        setSuccess('Planner entry created.');
      }
      setForm(emptyForm);
      setEditingId(null);
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The planner entry could not be saved.'));
    } finally {
      setBusyAction(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      subject_id: item.subject_id,
      activity_type: item.activity_type,
      scheduled_date: formatDateInput(item.scheduled_date),
      start_time: item.start_time,
      end_time: item.end_time,
      description: item.description || '',
    });
  };

  const handleDelete = async (id) => {
    if (busyAction || !window.confirm('Delete this planner entry?')) return;
    setError('');
    setSuccess('');
    setBusyAction(true);
    try {
      await deleteSchedule(id);
      setSuccess('Planner entry deleted.');
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The planner entry could not be deleted.'));
    } finally {
      setBusyAction(false);
    }
  };

  const handleExport = async () => {
    if (isExporting || schedules.length === 0) return;
    setError('');
    setSuccess('');
    setIsExporting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    try {
      downloadCsv('datalens-weekly-planner.csv', schedules, [
        { key: 'id', label: 'Planner entry ID' }, { key: 'title', label: 'Title' },
        { key: 'subject_name', label: 'Subject' }, { key: 'activity_type', label: 'Activity type' },
        { key: 'scheduled_date', label: 'Date' }, { key: 'start_time', label: 'Start time' },
        { key: 'end_time', label: 'End time' }, { key: 'description', label: 'Description' },
        { key: 'created_at', label: 'Created at' }, { key: 'updated_at', label: 'Updated at' },
      ]);
      setSuccess('Weekly planner exported as CSV.');
    } catch (exportError) {
      setError(exportError.message || 'Planner entries could not be exported.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="page-header academic-export-header">
        <div>
          <p className="eyebrow">Plan</p>
          <h1>Weekly planner</h1>
        </div>
        <button type="button" className="secondary-button" onClick={handleExport} disabled={isExporting || schedules.length === 0} title={schedules.length === 0 ? 'There are no planner entries to export' : 'Download planner entries as CSV'}>
          <Download size={16} aria-hidden="true" /> {isExporting ? 'Preparing CSV…' : 'Export CSV'}
        </button>
      </div>

      <div className="content-grid two-col">
        {error && <p className="error-panel full-width" role="alert">{error}</p>}
        {success && <p className="muted-pill full-width" role="status">{success}</p>}
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId ? 'Edit entry' : 'Schedule activity'}</h2>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Title
              <input ref={titleInput} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              Subject
              <select required value={form.subject_id} onChange={(event) => setForm({ ...form, subject_id: event.target.value })}>
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
              <DateInput id="planner-scheduled-date" required value={form.scheduled_date} onChange={(scheduled_date) => setForm({ ...form, scheduled_date })} />
            </label>
            <label>
              Start time
              <input type="time" required value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
            </label>
            <label>
              End time
              <input type="time" required value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
            </label>
            <label className="full-width">
              Description
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <div className="button-row full-width">
              <button type="submit" className="primary-button" disabled={busyAction}>{busyAction ? 'Saving…' : editingId ? 'Update entry' : 'Add entry'}</button>
              {editingId && (
                <button type="button" className="secondary-button" disabled={busyAction} onClick={() => { setEditingId(null); setForm(emptyForm); setError(''); }}>
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
            {isLoading && <div className="loading-panel" role="status">Loading planner entries…</div>}
            {!isLoading && error && !hasLoaded && <button type="button" className="secondary-button" onClick={refresh}>Retry loading planner</button>}
            {!isLoading && hasLoaded && schedules.length === 0 && <div className="empty-state"><p>No planner entries yet. Schedule a study session or class.</p>{subjects.length === 0 ? <Link className="secondary-button" to="/subjects">Add a subject first</Link> : <button type="button" className="primary-button" onClick={() => titleInput.current?.focus()}>Schedule your first activity</button>}</div>}
            {!isLoading && schedules.map((item) => (
              <div className="resource-card" key={item.id}>
                <div className="resource-icon"><CalendarDays size={18} /></div>
                <div className="resource-body">
                  <h3>{item.title}</h3>
                  <p>{item.subject_name || item.subject_id} • {item.activity_type}</p>
                  <small>{formatDate(item.scheduled_date)} • {formatTime(item.start_time)} to {formatTime(item.end_time)}</small>
                </div>
                <div className="resource-actions">
                  <button type="button" aria-label={`Edit ${item.title}`} title="Edit planner entry" disabled={busyAction} onClick={() => handleEdit(item)}><Pencil size={16} /></button>
                  <button type="button" className="danger" aria-label={`Delete ${item.title}`} title="Delete planner entry" disabled={busyAction} onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
