import { useEffect, useRef, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, Trash2, UploadCloud } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { deleteDataset, downloadCleanedDataset, downloadDatasetReport, getApiErrorMessage, getDatasets, uploadDataset } from '../api';
import { formatDetectedDateText } from '../utils/dateFormatting';
import './AnalyticsPage.css';

const PREVIEW_ROW_LIMIT = 8;
const ACCEPTED_EXTENSIONS = new Set(['csv', 'xlsx', 'xls']);

const formatNumber = (value) => Number.isFinite(Number(value))
  ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(Number(value))
  : '—';

const displayCell = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(formatDetectedDateText(String(value)));
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function DatasetCard({ dataset, isDeleting, isDownloading, downloadKind, onDelete, onDownload }) {
  const columnNames = dataset.column_names || [];
  const preview = dataset.preview || [];
  const visibleRows = preview.slice(0, PREVIEW_ROW_LIMIT);
  const stats = dataset.stats || {};
  const numericColumns = Object.keys(stats);
  const nonNumericColumns = columnNames.filter((column) => !numericColumns.includes(column));
  const missingValues = dataset.missing_values || {};
  const missingCount = Object.values(missingValues).reduce((sum, count) => sum + (Number(count) || 0), 0);
  const categoryChart = (dataset.chart_summary || []).find((chart) => chart.type === 'bar' && chart.values?.length);
  const categoryValues = categoryChart?.values.map((entry) => ({ ...entry, label: formatDetectedDateText(String(entry.label)) }));

  return (
    <article className="panel analytics-dataset-card">
      <header className="analytics-dataset-header">
        <div className="analytics-dataset-title">
          <span className="analytics-file-icon" aria-hidden="true"><FileSpreadsheet size={19} /></span>
          <div>
            <h2 title={dataset.filename}>{dataset.filename}</h2>
            <p>{dataset.file_type} · {formatBytes(dataset.size_bytes)}</p>
          </div>
        </div>
        <button
          type="button"
          className="analytics-delete-button"
          aria-label={`Delete dataset ${dataset.filename}`}
          title="Delete dataset"
          disabled={isDeleting}
          onClick={() => onDelete(dataset)}
        >
          <Trash2 size={17} />
        </button>
      </header>

      <div className="analytics-metrics" aria-label={`${dataset.filename} summary`}>
        <div><strong>{formatNumber(dataset.row_count)}</strong><span>Rows</span></div>
        <div><strong>{formatNumber(dataset.column_count)}</strong><span>Columns</span></div>
        <div><strong>{formatNumber(missingCount)}</strong><span>Missing cells</span></div>
        <div><strong>{formatNumber(dataset.duplicate_rows)}</strong><span>Duplicate rows</span></div>
      </div>

      <div className="analytics-export-actions" aria-label={`Exports for ${dataset.filename}`}>
        <button type="button" className="secondary-button" disabled={isDownloading || isDeleting} onClick={() => onDownload(dataset, 'cleaned')}>
          <Download size={15} aria-hidden="true" /> {downloadKind === 'cleaned' ? 'Preparing CSV…' : isDownloading ? 'Download in progress…' : 'Download cleaned CSV'}
        </button>
        <button type="button" className="secondary-button" disabled={isDownloading || isDeleting} onClick={() => onDownload(dataset, 'report')}>
          <FileSpreadsheet size={15} aria-hidden="true" /> {downloadKind === 'report' ? 'Generating PDF…' : isDownloading ? 'Download in progress…' : 'Download report PDF'}
        </button>
      </div>

      <details className="analytics-analysis" open>
        <summary><BarChart3 size={16} aria-hidden="true" /> Column analysis</summary>
        {numericColumns.length > 0 ? (
          <section className="analytics-analysis-section" aria-label="Numeric column statistics">
            <h3>Numeric columns</h3>
            <div className="analytics-numeric-grid">
              {numericColumns.map((column) => {
                const values = stats[column] || {};
                return (
                  <article className="analytics-numeric-card" key={column}>
                    <h4>{column}</h4>
                    <dl>
                      {['count', 'mean', 'min', 'max', 'median', 'std'].map((key) => (
                        <div key={key}><dt>{key === 'std' ? 'Std. dev.' : key}</dt><dd>{formatNumber(values[key])}</dd></div>
                      ))}
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>
        ) : <p className="analytics-muted">No numeric columns were detected for descriptive statistics.</p>}

        <section className="analytics-analysis-section" aria-label="Categorical and non-numeric columns">
          <h3>Categorical / non-numeric columns</h3>
          {nonNumericColumns.length > 0
            ? <div className="analytics-column-list">{nonNumericColumns.map((column) => <span className="chip" key={column}>{column}</span>)}</div>
            : <p className="analytics-muted">No categorical or non-numeric columns were detected.</p>}
        </section>

        <section className="analytics-analysis-section" aria-label="Missing values by column">
          <h3>Missing values by column</h3>
          {Object.keys(missingValues).length > 0
            ? <ul className="analytics-missing-list">{Object.entries(missingValues).map(([column, count]) => <li key={column}><span>{column}</span><strong>{formatNumber(count)}</strong></li>)}</ul>
            : <p className="analytics-muted">No missing values detected.</p>}
        </section>
      </details>

      <section className="analytics-chart-section" aria-label="Categorical frequency chart">
        <div className="analytics-section-heading"><h3>Category frequencies</h3>{categoryChart && <span>{categoryChart.column}</span>}</div>
        {categoryChart ? (
          <div className="analytics-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryValues} margin={{ top: 12, right: 16, bottom: 52, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(174,183,197,0.16)" />
                <XAxis dataKey="label" interval={0} angle={-25} textAnchor="end" height={70} tick={{ fontSize: 11 }} label={{ value: categoryChart.column, position: 'insideBottom', offset: -48, style: { fontSize: 11 } }} />
                <YAxis allowDecimals={false} width={42} label={{ value: 'Rows', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                <Tooltip formatter={(value) => [formatNumber(value), 'Rows']} />
                <Bar dataKey="value" name="Rows" fill="#d9a75e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="analytics-chart-empty">No categorical frequency chart is available for this dataset. Numeric values are shown as statistics, not as a histogram.</p>
        )}
      </section>

      <section className="analytics-preview-section">
        <div className="analytics-section-heading">
          <h3>Dataset preview</h3>
          <span>{visibleRows.length ? `Showing ${visibleRows.length} of ${preview.length} preview rows` : 'No preview rows'}</span>
        </div>
        {columnNames.length > 0 && visibleRows.length > 0 ? (
          <div className="analytics-preview-scroll" role="region" aria-label={`Preview table for ${dataset.filename}`} tabIndex={0}>
            <table>
              <caption className="analytics-visually-hidden">First {visibleRows.length} rows returned in the dataset preview for {dataset.filename}</caption>
              <thead><tr>{columnNames.map((column, index) => <th scope="col" key={`${column}-${index}`}>{column}</th>)}</tr></thead>
              <tbody>
                {visibleRows.map((row, rowIndex) => (
                  <tr key={`${dataset.id}-preview-${rowIndex}`}>
                    {columnNames.map((column, columnIndex) => <td key={`${dataset.id}-${column}-${columnIndex}`} title={displayCell(row[column])}>{displayCell(row[column])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="analytics-chart-empty">No preview rows are available for this dataset.</p>}
        {preview.length > PREVIEW_ROW_LIMIT && <p className="analytics-preview-note">Preview is limited to the first {PREVIEW_ROW_LIMIT} rows on screen.</p>}
      </section>
    </article>
  );
}

export default function AnalyticsPage() {
  const [datasets, setDatasets] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInput = useRef(null);

  const loadDatasets = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setDatasets(await getDatasets());
      setHasLoaded(true);
    } catch (requestError) {
      setLoadError(getApiErrorMessage(requestError, 'Datasets could not be loaded.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setError('');
    setSuccess('');
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.has(extension)) {
      setSelectedFile(null);
      setError('Choose a CSV, XLSX, or XLS file.');
      event.target.value = '';
      return;
    }
    if (file.size === 0) {
      setSelectedFile(null);
      setError('The selected file is empty. Choose a file with data.');
      event.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile || isUploading) return;

    setError('');
    setSuccess('');
    setIsUploading(true);
    setUploadProgress(null);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await uploadDataset(formData, setUploadProgress);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setSuccess(`Analysis completed for ${selectedFile.name}.`);
      await loadDatasets();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The file could not be analyzed. Check that it is a readable CSV or Excel workbook.'));
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (dataset) => {
    if (deletingId !== null || !window.confirm(`Delete “${dataset.filename}”? This removes its dataset record and attempts to remove its generated cleaned file.`)) return;
    setError('');
    setSuccess('');
    setDeletingId(dataset.id);
    try {
      await deleteDataset(dataset.id);
      setDatasets((current) => current.filter((item) => item.id !== dataset.id));
      setSuccess(`Deleted dataset ${dataset.filename}.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, `Dataset ${dataset.filename} could not be deleted.`));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (dataset, kind) => {
    if (downloading || deletingId !== null) return;
    setError('');
    setSuccess('');
    setDownloading({ id: dataset.id, kind });
    try {
      if (kind === 'report') await downloadDatasetReport(dataset.id, dataset.filename);
      else await downloadCleanedDataset(dataset.id, dataset.filename);
      setSuccess(kind === 'report' ? `Report downloaded for ${dataset.filename}.` : `Cleaned CSV downloaded for ${dataset.filename}.`);
    } catch (downloadError) {
      setError(downloadError.message || (kind === 'report' ? 'The dataset report could not be downloaded.' : 'The cleaned dataset could not be downloaded.'));
    } finally {
      setDownloading(null);
    }
  };

  const noDatasets = hasLoaded && !isLoading && !loadError && datasets.length === 0;

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Analytics studio</p>
          <h1>Excel and CSV analysis</h1>
        </div>
      </div>

      <section className="panel uploader-panel analytics-uploader">
        <div className="section-heading"><h2>Upload dataset</h2></div>
        <p className="analytics-upload-guidance">Accepted file extensions: CSV, XLSX, and XLS. Legacy XLS files may not parse because the backend uses the openpyxl reader; XLSX is recommended. No maximum upload size is configured by the backend, so very large files may require substantial memory.</p>
        <form className="upload-form" onSubmit={handleUpload}>
          <label className="analytics-file-picker" htmlFor="analytics-dataset-file">Dataset file</label>
          <input ref={fileInput} id="analytics-dataset-file" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} disabled={isUploading} />
          <button type="submit" className="primary-button" disabled={!selectedFile || isUploading}>
            <UploadCloud size={16} aria-hidden="true" /> {isUploading ? 'Analyzing…' : 'Analyze file'}
          </button>
        </form>
        {selectedFile && <p className="analytics-selected-file">Selected: {selectedFile.name} · {formatBytes(selectedFile.size)}</p>}
        {isUploading && (
          <div className="analytics-upload-progress" aria-live="polite">
            <p>{uploadProgress === null ? 'Uploading and analyzing…' : uploadProgress >= 100 ? 'Upload sent; analyzing dataset…' : `Uploading ${uploadProgress}%…`}</p>
            <progress max="100" value={uploadProgress ?? undefined} aria-label="Dataset upload progress" />
          </div>
        )}
      </section>

      {loadError && <div className="error-panel analytics-feedback" role="alert">{loadError}<button type="button" className="secondary-button" disabled={isLoading} onClick={loadDatasets}>Retry loading datasets</button></div>}
      {error && <div className="error-panel analytics-feedback" role="alert">{error}</div>}
      {success && <p className="muted-pill analytics-feedback" role="status">{success}</p>}
      {downloading && <p className="muted-pill analytics-feedback" role="status">{downloading.kind === 'report' ? 'Generating PDF report' : 'Preparing cleaned CSV'} for {datasets.find((item) => item.id === downloading.id)?.filename || 'dataset'}…</p>}

      {isLoading ? <div className="loading-panel analytics-loading" role="status">Loading datasets…</div> : null}
      {noDatasets && <div className="panel analytics-empty-state"><FileSpreadsheet size={28} aria-hidden="true" /><h2>No datasets yet</h2><p>Upload a CSV or Excel file to preview its contents and available analysis.</p><button type="button" className="primary-button" onClick={() => fileInput.current?.focus()}>Choose a dataset</button></div>}

      <div className="data-grid analytics-dataset-grid">
        {!isLoading && datasets.map((dataset) => (
          <DatasetCard key={dataset.id} dataset={dataset} isDeleting={deletingId !== null} isDownloading={downloading !== null} downloadKind={downloading?.id === dataset.id ? downloading.kind : null} onDelete={handleDelete} onDownload={handleDownload} />
        ))}
      </div>
    </div>
  );
}
