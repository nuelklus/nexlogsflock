"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

import {
  clearActiveTenantId,
  clearAuthTokens,
  readActiveTenantId,
  readAuthTokens,
  writeAuthTokens,
} from "@/lib/storage";

// const API_BASE_URL = "http://127.0.0.1:8000";
const API_BASE_URL = "https://flocks.nexlogssolutions.com";

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const tokens = readAuthTokens();
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }

    const tenantId = readActiveTenantId();
    if (tenantId) {
      config.headers["X-Tenant-ID"] = tenantId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      requestUrl.includes("/api/auth/token/") || requestUrl.includes("/api/auth/token/refresh/");

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    const existingTokens = readAuthTokens();
    if (!existingTokens?.refresh) {
      clearAuthTokens();
      clearActiveTenantId();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshResponse = await axios.post<{ access: string }>(
        `${API_BASE_URL}/api/auth/token/refresh/`,
        { refresh: existingTokens.refresh },
      );

      const nextTokens = {
        ...existingTokens,
        access: refreshResponse.data.access,
      };
      writeAuthTokens(nextTokens);

      originalRequest.headers.Authorization = `Bearer ${nextTokens.access}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      clearAuthTokens();
      clearActiveTenantId();
      return Promise.reject(refreshError);
    }
  },
);
