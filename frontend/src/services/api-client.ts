import axios from 'axios';
import type { ApiResponse } from '../types/api.types';

export const TOKEN_KEY = 'gsdts_access_token';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap ApiResponse<T>.data
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    if (body && typeof body === 'object' && 'data' in body) {
      return { ...response, data: body.data };
    }
    return response;
  },
  (error) => Promise.reject(error)
);
