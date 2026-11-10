import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Pencil, Trash2 } from 'lucide-react';
import { completeTask, createTask, deleteTask, downloadCsv, getApiErrorMessage, getSubjects, getTasks, updateTask } from '../api';
import DateInput from '../components/DateInput';
import { formatDate, formatDateInput, parseDateInput } from '../utils/dateFormatting';
import './AcademicExports.css';

const emptyForm = {
  title: '',
  subject_id: '',
  description: '',
  activity_type: 'Assignment',
  assigned_date: '',
  due_date: '',
  priority: 'Medium',
  status: 'Pending',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const refresh = async () => {
    const [taskData, subjectData] = await Promise.all([getTasks(), getSubjects()]);
    setTasks(taskData);
    setSubjects(subjectData);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim() || !form.subject_id || !form.activity_type) {
      setError('Enter a title and choose a subject and activity type.');
      return;
    }
    const assignedDate = form.assigned_date ? parseDateInput(form.assigned_date) : null;
    const dueDate = form.due_date ? parseDateInput(form.due_date) : null;
    if (form.assigned_date && !assignedDate) {
      setError('Enter the assigned date as a valid DD/MM/YYYY date.');
      return;
    }
    if (form.due_date && !dueDate) {
      setError('Enter the due date as a valid DD/MM/YYYY date.');
      return;
    }
    if (assignedDate && dueDate && dueDate < assignedDate) {
      setError('Due date must be the same as or later than the assigned date.');
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      subject_id: Number(form.subject_id),
      assigned_date: assignedDate,
      due_date: dueDate,
    };
    setIsSaving(true);
    try {
      if (editingId) {
        await updateTask(editingId, payload);
      } else {
        await createTask(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The task could not be saved. Check the fields and try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (task) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      subject_id: task.subject_id,
      description: task.description || '',
      activity_type: task.activity_type,
      assigned_date: formatDateInput(task.assigned_date),
      due_date: formatDateInput(task.due_date),
      priority: task.priority,
      status: task.status,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      setError('');
      await deleteTask(id);
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The task could not be deleted.'));
    }
  };

  const handleComplete = async (id) => {
    try {
      setError('');
      await completeTask(id);
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The task could not be marked complete.'));
    }
  };

  const handleExport = async () => {
    if (isExporting || tasks.length === 0) return;
    setError('');
    setSuccess('');
    setIsExporting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    try {
      downloadCsv('datalens-tasks.csv', tasks, [
        { key: 'id', label: 'Task ID' }, { key: 'title', label: 'Title' },
        { key: 'subject_name', label: 'Subject' }, { key: 'activity_type', label: 'Activity type' },
        { key: 'assigned_date', label: 'Assigned date' }, { key: 'due_date', label: 'Due date' },
        { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' },
        { key: 'description', label: 'Description' }, { key: 'completed_at', label: 'Completed at' },
      ]);
      setSuccess('Tasks exported as CSV.');
    } catch (exportError) {
      setError(exportError.message || 'Tasks could not be exported.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="page-header academic-export-header">
        <div>
          <p className="eyebrow">Academic delivery</p>
          <h1>Tasks and assignments</h1>
        </div>
        <button type="button" className="secondary-button" onClick={handleExport} disabled={isExporting || tasks.length === 0} title={tasks.length === 0 ? 'There are no tasks to export' : 'Download tasks as CSV'}>
          <Download size={16} aria-hidden="true" /> {isExporting ? 'Preparing CSV…' : 'Export CSV'}
        </button>
      </div>

      <div className="content-grid two-col">
        {success && <p className="muted-pill full-width" role="status">{success}</p>}
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId ? 'Edit activity' : 'Create activity'}</h2>
          </div>
          {error && <p className="error-panel" role="alert">{error}</p>}
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Title
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              Subject
              <select required value={form.subject_id} onChange={(event) => setForm({ ...form, subject_id: event.target.value })}>
                <option value="">Select</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </label>
            <label>
              Activity type
              <select value={form.activity_type} onChange={(event) => setForm({ ...form, activity_type: event.target.value })}>
                <option>Homework</option>
                <option>Assignment</option>
                <option>Test</option>
                <option>Internal examination</option>
                <option>University examination</option>
                <option>Revision</option>
                <option>Practical/Lab</option>
              </select>
            </label>
            <label>
              Assigned date
              <DateInput id="task-assigned-date" value={form.assigned_date} onChange={(assigned_date) => setForm({ ...form, assigned_date })} />
            </label>
            <label>
              Due date
              <DateInput id="task-due-date" value={form.due_date} onChange={(due_date) => setForm({ ...form, due_date })} />
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </label>
            <label className="full-width">
              Description
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <div className="button-row full-width">
              <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add task'}</button>
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
            <h2>Current workload</h2>
          </div>
          <div className="resource-list">
            {tasks.map((task) => (
              <div className="resource-card" key={task.id}>
                <div className="resource-icon"><CheckCircle2 size={18} /></div>
                <div className="resource-body">
                  <h3>{task.title}</h3>
                  <p>{task.subject_name || task.subject_id} • {task.activity_type}</p>
                  <small>{task.status} • Due {task.due_date ? formatDate(task.due_date) : 'No date'} • {task.priority}</small>
                </div>
                <div className="resource-actions">
                  <button type="button" aria-label={`Mark ${task.title} complete`} title="Mark complete" onClick={() => handleComplete(task.id)}><CheckCircle2 size={16} /></button>
                  <button type="button" aria-label={`Edit ${task.title}`} title="Edit task" onClick={() => handleEdit(task)}><Pencil size={16} /></button>
                  <button type="button" className="danger" aria-label={`Delete ${task.title}`} title="Delete task" onClick={() => handleDelete(task.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
