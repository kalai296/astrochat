import axios from 'axios';

// Hardcoded for reliability — NEXT_PUBLIC_ vars are baked at build time
// and can silently fail if env is not set correctly on Vercel
const BASE_URL = 'https://astrochat-api.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
