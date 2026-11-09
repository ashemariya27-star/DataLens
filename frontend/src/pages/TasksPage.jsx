import { useEffect, useState } from 'react';
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { completeTask, createTask, deleteTask, getSubjects, getTasks, updateTask } from '../api';

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
    const payload = { ...form, subject_id: Number(form.subject_id) };
    if (editingId) {
      await updateTask(editingId, payload);
    } else {
      await createTask(payload);
    }
    setForm(emptyForm);
    setEditingId(null);
    refresh();
  };

  const handleEdit = (task) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      subject_id: task.subject_id,
      description: task.description || '',
      activity_type: task.activity_type,
      assigned_date: task.assigned_date || '',
      due_date: task.due_date || '',
      priority: task.priority,
      status: task.status,
    });
  };

  const handleDelete = async (id) => {
    await deleteTask(id);
    refresh();
  };

  const handleComplete = async (id) => {
    await completeTask(id);
    refresh();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Academic delivery</p>
          <h1>Tasks and assignments</h1>
        </div>
      </div>

      <div className="content-grid two-col">
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId ? 'Edit activity' : 'Create activity'}</h2>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              Subject
              <select value={form.subject_id} onChange={(event) => setForm({ ...form, subject_id: event.target.value })}>
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
              <input type="date" value={form.assigned_date} onChange={(event) => setForm({ ...form, assigned_date: event.target.value })} />
            </label>
            <label>
              Due date
              <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
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
              <button type="submit" className="primary-button">{editingId ? 'Save changes' : 'Add task'}</button>
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
                  <small>{task.status} • Due {task.due_date || 'No date'} • {task.priority}</small>
                </div>
                <div className="resource-actions">
                  <button type="button" onClick={() => handleComplete(task.id)}><CheckCircle2 size={16} /></button>
                  <button type="button" onClick={() => handleEdit(task)}><Pencil size={16} /></button>
                  <button type="button" className="danger" onClick={() => handleDelete(task.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
