import { useEffect, useState } from 'react';
import { BookOpen, Pencil, Trash2 } from 'lucide-react';
import { createSubject, deleteSubject, getSubjects, updateSubject } from '../api';

const emptyForm = {
  name: '',
  code: '',
  description: '',
  semester: '',
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const refresh = async () => {
    const data = await getSubjects();
    setSubjects(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.code || !form.semester) {
      return;
    }

    if (editingId) {
      await updateSubject(editingId, form);
    } else {
      await createSubject(form);
    }
    setForm(emptyForm);
    setEditingId(null);
    refresh();
  };

  const handleEdit = (subject) => {
    setEditingId(subject.id);
    setForm({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      semester: subject.semester,
    });
  };

  const handleDelete = async (id) => {
    await deleteSubject(id);
    refresh();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Academic catalog</p>
          <h1>Subjects</h1>
        </div>
      </div>

      <div className="content-grid two-col">
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId ? 'Edit subject' : 'Add new subject'}</h2>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Subject name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Subject code
              <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </label>
            <label className="full-width">
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} />
            </label>
            <label>
              Semester
              <input value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} />
            </label>
            <div className="button-row full-width">
              <button type="submit" className="primary-button">{editingId ? 'Save changes' : 'Add subject'}</button>
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
            <h2>Current subjects</h2>
          </div>
          <div className="resource-list">
            {subjects.map((subject) => (
              <div className="resource-card" key={subject.id}>
                <div className="resource-icon"><BookOpen size={18} /></div>
                <div className="resource-body">
                  <h3>{subject.name}</h3>
                  <p>{subject.code} • {subject.semester}</p>
                  <small>{subject.description || 'No description yet.'}</small>
                </div>
                <div className="resource-actions">
                  <button type="button" onClick={() => handleEdit(subject)}><Pencil size={16} /></button>
                  <button type="button" className="danger" onClick={() => handleDelete(subject.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
