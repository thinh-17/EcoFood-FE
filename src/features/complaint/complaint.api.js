import { apiClient, unwrapData } from "../../services/apiClient.js";
const own = "/api/v1/customers/me/complaints", admin = "/api/v1/complaints";
const idPath = (base, id) => `${base}/${encodeURIComponent(id)}`;
export const complaintApi = {
  list: (customer, params) => apiClient.get(customer ? own : admin, { params }).then(unwrapData),
  detail: (customer, id) => apiClient.get(idPath(customer ? own : admin, id)).then(unwrapData),
  create: (data) => apiClient.post(own, data).then(unwrapData),
  reply: (id, data) => apiClient.post(`${idPath(own, id)}/replies`, data).then(unwrapData),
  action: (id, action, data) => apiClient.post(`${idPath(admin, id)}/${action}`, data).then(unwrapData),
  capabilities: () => apiClient.get(`${admin}/capabilities`).then(unwrapData),
  assignees: (type) => apiClient.get(`${admin}/assignees`, { params: { type } }).then(unwrapData),
};
