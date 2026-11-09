import { useEffect, useState } from 'react';
import { FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getDatasets, uploadDataset } from '../api';

export default function AnalyticsPage() {
  const [datasets, setDatasets] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const refresh = async () => {
    const data = await getDatasets();
    setDatasets(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await uploadDataset(formData);
      setSelectedFile(null);
      await refresh();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Analytics studio</p>
          <h1>Excel and CSV analysis</h1>
        </div>
      </div>

      <section className="panel uploader-panel">
        <div className="section-heading">
          <h2>Upload dataset</h2>
        </div>
        <form className="upload-form" onSubmit={handleUpload}>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => setSelectedFile(event.target.files[0])} />
          <button type="submit" className="primary-button" disabled={!selectedFile || isUploading}>
            <UploadCloud size={16} /> {isUploading ? 'Processing...' : 'Analyse file'}
          </button>
        </form>
      </section>

      <div className="data-grid">
        {datasets.map((dataset) => (
          <section className="panel dataset-panel" key={dataset.id}>
            <div className="section-heading">
              <h2>{dataset.filename}</h2>
              <span className="muted-pill"><FileSpreadsheet size={14} /> {dataset.file_type}</span>
            </div>

            <div className="dataset-summary">
              <div><strong>{dataset.row_count}</strong><span>Rows</span></div>
              <div><strong>{dataset.column_count}</strong><span>Columns</span></div>
              <div><strong>{dataset.duplicate_rows}</strong><span>Duplicate rows</span></div>
            </div>

            <div className="chip-row">
              {dataset.column_names.slice(0, 6).map((column) => (
                <span key={column} className="chip">{column}</span>
              ))}
            </div>

            <div className="chart-wrap small-chart">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dataset.chart_summary[0]?.values || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(174,183,197,0.16)" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#AA91E8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="preview-table-wrap">
              <table>
                <thead>
                  <tr>
                    {dataset.column_names.slice(0, 4).map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(dataset.preview || []).slice(0, 5).map((row, rowIndex) => (
                    <tr key={`${dataset.id}-${rowIndex}`}>
                      {Object.values(row).slice(0, 4).map((value, valueIndex) => (
                        <td key={`${rowIndex}-${valueIndex}`}>{value ?? 'â€”'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}


