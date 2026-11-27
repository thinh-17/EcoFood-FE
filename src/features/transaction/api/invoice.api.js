import { apiClient, unwrapData } from "../../../services/apiClient.js";

// Tenant scope is derived by the backend from the verified token, never from a form parameter.
export const invoiceApi = {
  list: (page, size, signal) => apiClient.get("/api/v1/transactions", { params: { page, size }, signal }).then(unwrapData),
  detail: (id, signal) => apiClient.get(`/api/v1/transactions/${encodeURIComponent(id)}`, { signal }).then(unwrapData),
};
