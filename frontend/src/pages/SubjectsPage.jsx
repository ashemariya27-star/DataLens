import { useEffect, useRef, useState } from 'react';
import { BookOpen, Download, Pencil, Trash2 } from 'lucide-react';
import { createSubject, deleteSubject, downloadCsv, getApiErrorMessage, getSubjects, updateSubject } from '../api';
import './AcademicExports.css';

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
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const nameInput = useRef(null);

  const refresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      setSubjects(await getSubjects());
      setHasLoaded(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Subjects could not be loaded.'));
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
    if (!form.name.trim() || !form.code.trim() || !form.semester.trim()) {
      setError('Enter a subject name, code, and semester.');
      return;
    }

    setError('');
    setSuccess('');
    setBusyAction(true);
    try {
      const payload = { ...form, name: form.name.trim(), code: form.code.trim(), semester: form.semester.trim() };
      if (editingId) {
        await updateSubject(editingId, payload);
        setSuccess('Subject updated.');
      } else {
        await createSubject(payload);
        setSuccess('Subject created.');
      }
      setForm(emptyForm);
      setEditingId(null);
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The subject could not be saved.'));
    } finally {
      setBusyAction(false);
    }
  };

  const handleEdit = (subject) => {
    setError('');
    setSuccess('');
    setEditingId(subject.id);
    setForm({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      semester: subject.semester,
    });
  };

  const handleDelete = async (id) => {
    if (busyAction || !window.confirm('Delete this subject? Related tasks, planner entries, or materials may prevent deletion.')) return;
    setError('');
    setSuccess('');
    setBusyAction(true);
    try {
      await deleteSubject(id);
      setSuccess('Subject deleted.');
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The subject could not be deleted.'));
    } finally {
      setBusyAction(false);
    }
  };

  const handleExport = async () => {
    if (isExporting || subjects.length === 0) return;
    setError('');
    setSuccess('');
    setIsExporting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    try {
      downloadCsv('datalens-subjects.csv', subjects, [
        { key: 'id', label: 'Subject ID' }, { key: 'name', label: 'Subject name' },
        { key: 'code', label: 'Subject code' }, { key: 'semester', label: 'Semester' },
        { key: 'description', label: 'Description' }, { key: 'created_at', label: 'Created at' },
        { key: 'updated_at', label: 'Updated at' },
      ]);
      setSuccess('Subjects exported as CSV.');
    } catch (exportError) {
      setError(exportError.message || 'Subjects could not be exported.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="page-header academic-export-header">
        <div>
          <p className="eyebrow">Academic catalog</p>
          <h1>Subjects</h1>
        </div>
        <button type="button" className="secondary-button" onClick={handleExport} disabled={isExporting || subjects.length === 0} title={subjects.length === 0 ? 'There are no subjects to export' : 'Download subjects as CSV'}>
          <Download size={16} aria-hidden="true" /> {isExporting ? 'Preparing CSV…' : 'Export CSV'}
        </button>
      </div>

      <div className="content-grid two-col">
        {error && <p className="error-panel full-width" role="alert">{error}</p>}
        {success && <p className="muted-pill full-width" role="status">{success}</p>}
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId ? 'Edit subject' : 'Add new subject'}</h2>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Subject name
              <input ref={nameInput} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Subject code
              <input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </label>
            <label className="full-width">
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} />
            </label>
            <label>
              Semester
              <input required value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} />
            </label>
            <div className="button-row full-width">
              <button type="submit" className="primary-button" disabled={busyAction}>{busyAction ? 'Saving…' : editingId ? 'Save changes' : 'Add subject'}</button>
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
            <h2>Current subjects</h2>
          </div>
          <div className="resource-list">
            {isLoading && <div className="loading-panel" role="status">Loading subjects…</div>}
            {!isLoading && error && !hasLoaded && <button type="button" className="secondary-button" onClick={refresh}>Retry loading subjects</button>}
            {!isLoading && hasLoaded && subjects.length === 0 && <div className="empty-state"><p>No subjects yet. Add one to start organizing academic work.</p><button type="button" className="primary-button" onClick={() => nameInput.current?.focus()}>Add your first subject</button></div>}
            {!isLoading && subjects.map((subject) => (
              <div className="resource-card" key={subject.id}>
                <div className="resource-icon"><BookOpen size={18} /></div>
                <div className="resource-body">
                  <h3>{subject.name}</h3>
                  <p>{subject.code} • {subject.semester}</p>
                  <small>{subject.description || 'No description yet.'}</small>
                </div>
                <div className="resource-actions">
                  <button type="button" aria-label={`Edit ${subject.name}`} title="Edit subject" disabled={busyAction} onClick={() => handleEdit(subject)}><Pencil size={16} /></button>
                  <button type="button" className="danger" aria-label={`Delete ${subject.name}`} title="Delete subject" disabled={busyAction} onClick={() => handleDelete(subject.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
