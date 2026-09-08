import axios from 'axios';
import { config } from '../constants/config';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: config.apiUrl,
});

api.interceptors.request.use(async (req) => {
  const token = useAuthStore.getState().token;
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
