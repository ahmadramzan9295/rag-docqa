import axios from 'axios';

// In dev:    set VITE_API_BASE_URL=http://localhost:8000 in frontend/.env.local
// In Docker: Nginx proxies /api/* → backend:8000, so no env needed (defaults to /api)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.dispatchEvent(new Event('auth-change'));
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    const { data } = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },
  register: async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    return data;
  },
};

export const documentService = {
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  processText: async (text, filename = 'pasted_text.txt') => {
    const { data } = await api.post('/process-text', { text, filename });
    return data;
  },
  list: async () => {
    const { data } = await api.get('/documents');
    return data;
  },
  delete: async (filename) => {
    const { data } = await api.delete(`/documents/${encodeURIComponent(filename)}`);
    return data;
  },
  summarize: async () => {
    const { data } = await api.post('/documents/summarize');
    return data;
  },
};

export const chatService = {
  ask: async (question, sessionId = '') => {
    const { data } = await api.post('/ask', { question, session_id: sessionId });
    return data;
  },
  clearSession: async (sessionId) => {
    const { data } = await api.delete(`/session/${sessionId}`);
    return data;
  },
};

export default api;
