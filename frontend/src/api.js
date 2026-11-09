import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 15000,
});

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
export const createMaterial = (formData) => api.post('/materials', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
}).then((response) => response.data);
export const deleteMaterial = (id) => api.delete(`/materials/${id}`).then((response) => response.data);

export const getReminders = () => api.get('/reminders').then((response) => response.data);
export const createReminder = (payload) => api.post('/reminders', payload).then((response) => response.data);
export const deleteReminder = (id) => api.delete(`/reminders/${id}`).then((response) => response.data);
export const completeReminder = (id) => api.patch(`/reminders/${id}/complete`).then((response) => response.data);

export const getDatasets = () => api.get('/datasets').then((response) => response.data);
export const uploadDataset = (formData) => api.post('/analytics/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
}).then((response) => response.data);

export default api;
