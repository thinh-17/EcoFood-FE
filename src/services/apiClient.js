import axios from "axios";

// Đây là cấu hình gắn với FE-main. FE-core không được hard-code URL/tenant của ứng dụng.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  // Chỉ là ví dụ: tích hợp với cơ chế auth thực tế của FE-main ở giai đoạn sau.
  // Tránh hard-code token trong source hoặc biến VITE_ (public tại build-time).
  const token = sessionStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function unwrapData(response) {
  return response.data?.data ?? response.data;
}
