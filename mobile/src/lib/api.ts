import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://astrochat-api.onrender.com';
export { BASE_URL };

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

export default api;
