import { useEffect, useState } from 'react';
import { Download, FileText, Trash2 } from 'lucide-react';
import { createMaterial, deleteMaterial, getMaterials, getSubjects } from '../api';

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

  const refresh = async () => {
    const [materialData, subjectData] = await Promise.all([getMaterials(), getSubjects()]);
    setMaterials(materialData);
    setSubjects(subjectData);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file || !form.title || !form.subject_id || !form.unit) {
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('subject_id', String(form.subject_id));
    formData.append('unit', form.unit);
    formData.append('description', form.description || '');
    formData.append('file', file);

    await createMaterial(formData);
    setForm(emptyForm);
    setFile(null);
    refresh();
  };

  const handleDelete = async (id) => {
    await deleteMaterial(id);
    refresh();
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
        <section className="panel">
          <div className="section-heading">
            <h2>Upload a new file</h2>
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
              Unit or topic
              <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
            </label>
            <label className="full-width">
              Description
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <label className="full-width">
              File
              <input type="file" accept=".pdf,.docx" onChange={(event) => setFile(event.target.files[0])} />
            </label>
            <div className="button-row full-width">
              <button type="submit" className="primary-button">Upload material</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Uploaded library</h2>
          </div>
          <div className="resource-list">
            {materials.map((material) => (
              <div className="resource-card" key={material.id}>
                <div className="resource-icon"><FileText size={18} /></div>
                <div className="resource-body">
                  <h3>{material.title}</h3>
                  <p>{material.subject_name || material.subject_id} • {material.unit}</p>
                  <small>{material.file_name}</small>
                </div>
                <div className="resource-actions">
                  <a href={material.file_path} target="_blank" rel="noreferrer"><Download size={16} /></a>
                  <button type="button" className="danger" onClick={() => handleDelete(material.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
