import { apiClient, unwrapData } from "../../services/apiClient.js";
const base = "/api/v1/catalog-publications", path = (id) => `${base}/${encodeURIComponent(id)}`;
export const catalogApi = {
  capabilities: () => apiClient.get(`${base}/capabilities`).then(unwrapData),
  options: (type) => apiClient.get(`${base}/options`, { params: { type } }).then(unwrapData),
  plans: (type, search, page) => apiClient.get(`${base}/plans`, { params: { type, search, page, size: 20 } }).then(unwrapData),
  list: (params) => apiClient.get(base, { params }).then(unwrapData),
  detail: (id) => apiClient.get(path(id)).then(unwrapData),
  versions: (id, page = 0) => apiClient.get(`${path(id)}/versions`, { params: { page, size: 20 } }).then(unwrapData),
  save: (draft) => {
    const body = { apiKey: draft.apiKey, name: draft.name, catalogType: draft.catalogType, version: draft.version, selections: draft.selections,
      partnerIds: draft.partnerIds, policy: draft.policy, customField: draft.customField || [], revision: draft.revision };
    return (draft.id ? apiClient.put(path(draft.id), body) : apiClient.post(base, body)).then(unwrapData);
  },
  action: (id, action, revision) => apiClient.post(`${path(id)}/${action}`, { revision }).then(unwrapData),
  partners: (id) => apiClient.get(`${path(id)}/partner-options`).then(unwrapData),
  grant: (id, data) => apiClient.post(`${path(id)}/partners`, data).then(unwrapData),
  revoke: (id, partnerId, revision) => apiClient.post(`${path(id)}/partners/${encodeURIComponent(partnerId)}/revoke`, { revision }).then(unwrapData),
};
