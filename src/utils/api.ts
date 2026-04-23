import axios from 'axios';

// The API Gateway URL is injected at runtime.
// An empty string means it will default to the current origin (e.g. http://13.222.191.143:8080)
const env = (window as any).__env__ || {};
const apiUrl = env.hasOwnProperty('REACT_APP_API_URL') 
  ? env.REACT_APP_API_URL 
  : (import.meta.env.VITE_API_URL || '');

const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
