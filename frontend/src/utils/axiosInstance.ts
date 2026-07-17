
import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api/';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authTokens = localStorage.getItem('authTokens');
    if (authTokens) {
      const parsedTokens = JSON.parse(authTokens);
      config.headers.Authorization = `Bearer ${parsedTokens.access}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const authTokens = localStorage.getItem('authTokens');
        if (authTokens) {
          const parsedTokens = JSON.parse(authTokens);
          const newTokens = await axiosInstance.post('/auth/token/refresh/', { refresh: parsedTokens.refresh });
          localStorage.setItem('authTokens', JSON.stringify(newTokens.data));
          originalRequest.headers.Authorization = `Bearer ${newTokens.data.access}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        console.error('Failed to refresh token', refreshError);
        // Handle logout or redirect to login
      }
    }
    return Promise.reject(error);
  }
);
