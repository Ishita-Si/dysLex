import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export const mvpAPI = {
  health: () => api.get('/health'),
  root: () => api.get('/'),
  predictReading: (payload) => api.post('/predict-reading', payload),
  predictWriting: (payload) => api.post('/predict-writing', payload),
  predictTyping: (payload) => api.post('/predict-typing', payload),
  predictFusion: (payload) => api.post('/predict-fusion', payload),
  predictFull: (payload) => api.post('/predict-full', payload),
  learningProfile: (payload) => api.post('/learning-profile', payload),
  regenerateBaseline: () => api.post('/baseline-reference/regenerate'),
};

export function apiErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || item.type).join(', ');
  if (error?.code === 'ECONNABORTED') return 'The API request timed out.';
  if (error?.message === 'Network Error') {
    return `Cannot reach the FastAPI server at ${API_BASE_URL}. Start it with: uvicorn src.mvp.api:app --reload`;
  }
  return error?.message || 'Something went wrong while calling the API.';
}

export default api;
