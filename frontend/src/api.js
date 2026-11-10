import axios from 'axios';
import { serializeCsv } from './csvExport';
import { formatExportDateValue } from './utils/dateFormatting';

const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || 'http://localhost:8000').replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 15000,
});

export function getApiErrorMessage(error, fallback = 'The request could not be completed.') {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((issue) => {
      const field = Array.isArray(issue.loc) ? issue.loc.filter((part) => part !== 'body').join(' → ') : '';
      return field ? `${field}: ${issue.msg}` : issue.msg;
    }).join(' ');
  }
  if (error?.response?.status === 404) return 'The requested record or file was not found.';
  if (error?.code === 'ECONNABORTED' || !error?.response) {
    return 'Cannot reach the DataLens API. Check the backend address and try again.';
  }
  return fallback;
}

export async function downloadMaterial(filePath, fileName) {
  const normalizedPath = String(filePath || '').replaceAll('\\', '/');
  if (!normalizedPath.startsWith('/uploads/')) {
    throw new Error('This material has no downloadable file in DataLens storage.');
  }

  try {
    const response = await axios.get(`${API_ORIGIN}${normalizedPath}`, {
      responseType: 'blob',
      timeout: 15000,
    });
    const objectUrl = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName || 'study-material';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    if (error?.response?.status === 404) {
      throw new Error('This file is missing from the DataLens backend. It may have been removed.');
    }
    throw new Error(getApiErrorMessage(error, 'The study material could not be downloaded.'));
  }
}

function saveBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function safeDatasetDownloadName(datasetName, suffix) {
  const lastPathPart = String(datasetName || 'dataset').split(/[\\/]/).pop() || 'dataset';
  const nameWithoutExtension = lastPathPart.replace(/\.[^.]*$/, '') || 'dataset';
  const safeStem = nameWithoutExtension
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}<>:"/\\|?*]/gu, '_')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 120) || 'dataset';
  return `${safeStem}_${suffix}`;
}

async function downloadDatasetFile(datasetId, kind, datasetName) {
  const isReport = kind === 'report';
  try {
    const response = await api.get(`/datasets/${datasetId}/${isReport ? 'report.pdf' : 'cleaned.csv'}`, {
      responseType: 'blob',
      timeout: 60000,
    });
    saveBlob(response.data, safeDatasetDownloadName(datasetName, isReport ? 'report.pdf' : 'cleaned.csv'));
  } catch (error) {
    if (error?.response?.status === 404) {
      throw new Error(isReport ? 'The dataset report is unavailable because the dataset was not found.' : 'The cleaned CSV is missing or unavailable for this dataset.');
    }
    const body = error?.response?.data;
    if (body instanceof Blob) {
      let parsed;
      try {
        parsed = JSON.parse(await body.text());
      } catch {}
      if (typeof parsed?.detail === 'string') throw new Error(parsed.detail);
    }
    throw new Error(getApiErrorMessage(error, isReport ? 'The dataset report could not be generated.' : 'The cleaned dataset could not be downloaded.'));
  }
}

export const downloadCleanedDataset = (datasetId, datasetName) => downloadDatasetFile(datasetId, 'cleaned', datasetName);
export const downloadDatasetReport = (datasetId, datasetName) => downloadDatasetFile(datasetId, 'report', datasetName);

export function downloadCsv(fileName, rows, columns) {
  if (!Array.isArray(rows) || !Array.isArray(columns)) {
    throw new Error('Export data is not available. Refresh the page and try again.');
  }
  const formattedRows = rows.map((row) => {
    const formattedRow = { ...row };
    columns.forEach(({ key }) => {
      formattedRow[key] = formatExportDateValue(key, row?.[key]);
    });
    return formattedRow;
  });
  saveBlob(new Blob([serializeCsv(formattedRows, columns)], { type: 'text/csv;charset=utf-8' }), fileName);
}

export const getDashboard = () => api.get('/dashboard').then((response) => response.data);
export const getSubjects = () => api.get('/subjects').then((response) => response.data);
export const createSubject = (payload) => api.post('/subjects', payload).then((response) => response.data);
export const updateSubject = (id, payload) => api.put(`/subjects/${id}`, payload).then((response) => response.data);
export const deleteSubject = (id) => api.delete(`/subjects/${id}`).then((response) => response.data);

export const getTasks = () => api.get('/tasks').then((response) => response.data);
export const createTask = (payload) => api.post('/tasks', payload).then((response) => response.data);
export const updateTask = (id, payload) => api.put(`/tasks/${id}`, payload).then((response) => response.data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`).then((response) => response.data);
export const completeTask = (id) => api.patch(`/tasks/${id}/complete`).then((response) => response.data);

export const getSchedules = () => api.get('/schedules').then((response) => response.data);
export const createSchedule = (payload) => api.post('/schedules', payload).then((response) => response.data);
export const updateSchedule = (id, payload) => api.put(`/schedules/${id}`, payload).then((response) => response.data);
export const deleteSchedule = (id) => api.delete(`/schedules/${id}`).then((response) => response.data);

export const getMaterials = () => api.get('/materials').then((response) => response.data);
export const createMaterial = (formData) => api.post('/materials', formData).then((response) => response.data);
export const deleteMaterial = (id) => api.delete(`/materials/${id}`).then((response) => response.data);

export const getReminders = () => api.get('/reminders').then((response) => response.data);
export const createReminder = (payload) => api.post('/reminders', payload).then((response) => response.data);
export const updateReminder = (id, payload) => api.put(`/reminders/${id}`, payload).then((response) => response.data);
export const deleteReminder = (id) => api.delete(`/reminders/${id}`).then((response) => response.data);
export const completeReminder = (id) => api.patch(`/reminders/${id}/complete`).then((response) => response.data);

export const getDatasets = () => api.get('/datasets').then((response) => response.data);
export const uploadDataset = (formData, onProgress) => api.post('/analytics/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (event) => {
    if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
  },
}).then((response) => response.data);
export const deleteDataset = (id) => api.delete(`/datasets/${id}`).then((response) => response.data);

export default api;
