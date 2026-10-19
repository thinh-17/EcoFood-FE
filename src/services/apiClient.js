import axios from "axios";

import { useAuthStore } from "../features/auth/store/authStore.js";

// Đây là cấu hình gắn với FE-main. FE-core không được hard-code URL/tenant của ứng dụng.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  // Internal access token (our own backend's, not Keycloak's) — see
  // features/auth/store/authStore.js. Not present yet for the login-info
  // call itself (made before any token exists), which is fine since that
  // endpoint is intentionally unauthenticated.
  const token = useAuthStore.getState().internalAccessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function unwrapData(response) {
  return response.data?.data ?? response.data;
}
