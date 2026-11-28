import { apiClient, unwrapData } from "../../../services/apiClient.js";
const root = "/api/v1/dashboard/invoices";
export const invoiceDashboardApi = {
  tenants: () => apiClient.get(root + "/tenants").then(unwrapData),
  list: (params) => apiClient.get(root, { params }).then(unwrapData),
  detail: (id, tenantId) => apiClient.get(root + "/" + encodeURIComponent(id), { params: { tenantId } }).then(unwrapData),
};
