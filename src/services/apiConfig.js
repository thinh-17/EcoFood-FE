// Shared transport settings only; this module has no authentication/storage side effects.
export const apiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  timeout: 10_000,
};
