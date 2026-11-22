import { apiClient, unwrapData } from "../../../services/apiClient.js";

// Business Dashboard always uses the backend, regardless of the legacy demo's mock flag.
const get = (path, params) => apiClient.get(`/api/v1/dashboard/${path}`, { params }).then(unwrapData);
export const businessDashboardApi = {
  filters: () => get("filters"), summary: (params) => get("summary", params),
  trends: (params) => get("trends", params), comparison: (params) => get("comparison", params),
};
