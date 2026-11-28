import { apiClient, unwrapData } from "../../../services/apiClient.js";
export const getDashboardAccess = (type) => apiClient.get("/api/v1/dashboard/access", { params: { type } }).then(unwrapData);
