import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createMaterial, deleteMaterial, downloadMaterial, getApiErrorMessage, getMaterials, getSubjects } from '../api';

const emptyForm = {
  title: '',
  subject_id: '',
  unit: '',
  description: '',
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const titleInput = useRef(null);
  const fileInput = useRef(null);

  const refresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [materialData, subjectData] = await Promise.all([getMaterials(), getSubjects()]);
      setMaterials(materialData);
      setSubjects(subjectData);
      setHasLoaded(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Study materials could not be loaded.'));
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
    if (!file || !form.title.trim() || !form.subject_id || !form.unit.trim()) {
      setError('Enter a title, subject, and unit, then choose a PDF or DOCX file.');
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title.trim());
    formData.append('subject_id', String(form.subject_id));
    formData.append('unit', form.unit.trim());
    formData.append('description', form.description || '');
    formData.append('file', file);

    setError('');
    setSuccess('');
    setBusyAction(true);
    try {
      await createMaterial(formData);
      setForm(emptyForm);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setSuccess('Study material uploaded.');
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The study material could not be uploaded.'));
    } finally {
      setBusyAction(false);
    }
  };

  const handleDelete = async (id) => {
    if (busyAction || !window.confirm('Delete this study material and its uploaded file?')) return;
    setError('');
    setSuccess('');
    setBusyAction(true);
    try {
      await deleteMaterial(id);
      setSuccess('Study material deleted.');
      await refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The study material could not be deleted.'));
    } finally {
      setBusyAction(false);
    }
  };

  const handleDownload = async (material) => {
    if (busyAction) return;
    setError('');
    setSuccess('');
    setBusyAction(true);
    try {
      await downloadMaterial(material.file_path, material.file_name);
      setSuccess(`Download started for ${material.file_name}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : getApiErrorMessage(requestError));
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Resources</p>
          <h1>Notes and materials</h1>
        </div>
      </div>

      <div className="content-grid two-col">
        {error && <p className="error-panel full-width" role="alert">{error}</p>}
        {success && <p className="muted-pill full-width" role="status">{success}</p>}
        <section className="panel">
          <div className="section-heading">
            <h2>Upload a new file</h2>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Title
              <input ref={titleInput} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
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
              Unit or topic
              <input required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
            </label>
            <label className="full-width">
              Description
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <label className="full-width">
              File
              <input ref={fileInput} required type="file" accept=".pdf,.docx" disabled={busyAction} onChange={(event) => setFile(event.target.files[0])} />
            </label>
            <div className="button-row full-width">
              <button type="submit" className="primary-button" disabled={busyAction}>{busyAction ? 'Working…' : 'Upload material'}</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Uploaded library</h2>
          </div>
          <div className="resource-list">
            {isLoading && <div className="loading-panel" role="status">Loading study materials…</div>}
            {!isLoading && error && !hasLoaded && <button type="button" className="secondary-button" onClick={refresh}>Retry loading materials</button>}
            {!isLoading && hasLoaded && materials.length === 0 && <div className="empty-state"><p>No study materials yet. Upload a PDF or DOCX file to build your library.</p>{subjects.length === 0 ? <Link className="secondary-button" to="/subjects">Add a subject first</Link> : <button type="button" className="primary-button" onClick={() => titleInput.current?.focus()}>Upload your first material</button>}</div>}
            {!isLoading && materials.map((material) => (
              <div className="resource-card" key={material.id}>
                <div className="resource-icon"><FileText size={18} /></div>
                <div className="resource-body">
                  <h3>{material.title}</h3>
                  <p>{material.subject_name || material.subject_id} • {material.unit}</p>
                  <small>{material.file_name}</small>
                </div>
                <div className="resource-actions">
                  <button type="button" aria-label={`Download ${material.file_name}`} title="Download material" disabled={busyAction} onClick={() => handleDownload(material)}><Download size={16} /></button>
                  <button type="button" className="danger" aria-label={`Delete ${material.title}`} title="Delete material" disabled={busyAction} onClick={() => handleDelete(material.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
