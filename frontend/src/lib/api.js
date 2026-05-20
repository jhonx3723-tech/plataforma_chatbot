import axios from 'axios';

// En producción VITE_API_URL apunta al backend desplegado, ej:
// https://chatbot-backend.railway.app/api
// En local el proxy de Vite reenvía /api → localhost:3001
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export const companiesAPI = {
  getAll:          ()          => api.get('/companies').then(r => r.data),
  get:             id          => api.get(`/companies/${id}`).then(r => r.data),
  create:          data        => api.post('/companies', data).then(r => r.data),
  update:          (id, data)  => api.put(`/companies/${id}`, data).then(r => r.data),
  remove:          id          => api.delete(`/companies/${id}`).then(r => r.data),
  getWAProfile:    id          => api.get(`/companies/${id}/wa-profile`).then(r => r.data),
  updateWAProfile: (id, data)  => api.put(`/companies/${id}/wa-profile`, data).then(r => r.data),
};

export const flowsAPI = {
  getByCompany: companyId => api.get(`/flows/company/${companyId}`).then(r => r.data),
  get:          id        => api.get(`/flows/${id}`).then(r => r.data),
  create:       data      => api.post('/flows', data).then(r => r.data),
  update:       (id, data)=> api.put(`/flows/${id}`, data).then(r => r.data),
  remove:       id        => api.delete(`/flows/${id}`).then(r => r.data),
};

export const conversationsAPI = {
  getAll:     (params)      => api.get('/conversations', { params }).then(r => r.data), // { data, total, hasMore }
  get:        id            => api.get(`/conversations/${id}`).then(r => r.data),
  reply:      (id, message) => api.post(`/conversations/${id}/reply`, { message }).then(r => r.data),
  addNote:    (id, content) => api.post(`/conversations/${id}/note`, { content }).then(r => r.data),
  setStatus:  (id, status)  => api.put(`/conversations/${id}/status`, { status }).then(r => r.data),
  assign:     (id, user_id) => api.put(`/conversations/${id}/assign`, { user_id }).then(r => r.data),
  restartBot: id            => api.post(`/conversations/${id}/restart-bot`).then(r => r.data),
  getAgents:           (company_id)  => api.get('/conversations/agents', { params: { company_id } }).then(r => r.data),
  setReminder:         (id, data)    => api.post(`/conversations/${id}/reminder`, data).then(r => r.data),
  clearReminder:       (id)          => api.delete(`/conversations/${id}/reminder`).then(r => r.data),
  getPendingReminders: ()            => api.get('/conversations/reminders/pending').then(r => r.data),
  sendImage:  (id, file, caption = '') => {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);
    return api.post(`/conversations/${id}/send-image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats').then(r => r.data),
};

export const contactsAPI = {
  getAll:     (params)     => api.get('/contacts', { params }).then(r => r.data),
  getByPhone: (phone, cid) => api.get(`/contacts/phone/${phone}`, { params: { company_id: cid } }).then(r => r.data),
  save:       (data)       => api.post('/contacts', data).then(r => r.data),
  update:     (id, data)   => api.put(`/contacts/${id}`, data).then(r => r.data),
  remove:     (id)         => api.delete(`/contacts/${id}`).then(r => r.data),
};

export const templatesAPI = {
  getAll:  (company_id) => api.get('/templates', { params: { company_id } }).then(r => r.data),
  create:  (data)       => api.post('/templates', data).then(r => r.data),
  update:  (id, data)   => api.put(`/templates/${id}`, data).then(r => r.data),
  remove:  (id)         => api.delete(`/templates/${id}`).then(r => r.data),
};

export const labelsAPI = {
  getAll:         (company_id)        => api.get('/labels', { params: { company_id } }).then(r => r.data),
  create:         (data)              => api.post('/labels', data).then(r => r.data),
  remove:         (id)                => api.delete(`/labels/${id}`).then(r => r.data),
  addToConv:      (convId, label_id)  => api.post(`/labels/conversation/${convId}`, { label_id }).then(r => r.data),
  removeFromConv: (convId, labelId)   => api.delete(`/labels/conversation/${convId}/${labelId}`).then(r => r.data),
};

export const reportsAPI = {
  count: (params) => api.get('/reports/count', { params }).then(r => r.data),
  downloadConvs: (params) => {
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams({ ...params, token }).toString();
    window.open(`${API_BASE}/reports/conversations?${qs}`, '_blank');
  },
  downloadMessages: (params) => {
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams({ ...params, token }).toString();
    window.open(`${API_BASE}/reports/messages?${qs}`, '_blank');
  },
};

export const usersAPI = {
  getAll:        ()             => api.get('/users').then(r => r.data),
  create:        data           => api.post('/users', data).then(r => r.data),
  resetPassword: (id, password) => api.put(`/users/${id}/password`, { password }).then(r => r.data),
  toggleActive:  id             => api.put(`/users/${id}/toggle`).then(r => r.data),
  remove:        id             => api.delete(`/users/${id}`).then(r => r.data),
};

export const authAPI = {
  login:          (username, password)   => api.post('/auth/login', { username, password }).then(r => r.data),
  changePassword: (current, newPassword) => api.put('/auth/password', { current, newPassword }).then(r => r.data),
};

export const labelsAdminAPI = {
  getAll:    (company_id)        => api.get('/labels', { params: { company_id } }).then(r => r.data),
  create:    (data)              => api.post('/labels', data).then(r => r.data),
  update:    (id, data)          => api.put(`/labels/${id}`, data).then(r => r.data),
  remove:    (id)                => api.delete(`/labels/${id}`).then(r => r.data),
};

export const followUpAPI = {
  getConfig: ()       => api.get('/companies/my/follow-up').then(r => r.data),
  saveConfig: (data)  => api.put('/companies/my/follow-up', data).then(r => r.data),
};

export const adminAPI = {
  getStats:      (params)          => api.get('/reports/admin/stats', { params }).then(r => r.data),
  getCsatStats:  (params)          => api.get('/reports/admin/csat',  { params }).then(r => r.data),
  getMyAgents:   (company_id)      => api.get('/users/my-agents', { params: { company_id } }).then(r => r.data),
  createAgent:   (data)            => api.post('/users', data).then(r => r.data),
  toggleAgent:   (id)              => api.put(`/users/${id}/toggle`).then(r => r.data),
  resetAgentPwd: (id, password)    => api.put(`/users/${id}/password`, { password }).then(r => r.data),
  deleteAgent:   (id)              => api.delete(`/users/${id}`).then(r => r.data),
};
