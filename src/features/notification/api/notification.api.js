import { apiClient, unwrapData } from "../../../services/apiClient.js";

const base = "/api/v1/notifications";
export const notificationsApi = {
  unreadCount: () => apiClient.get(`${base}/unread-count`).then(unwrapData),
  markRead: (id) => apiClient.post(`${base}/${encodeURIComponent(id)}/read`).then(unwrapData),
  capabilities: () => apiClient.get(`${base}/capabilities`).then(unwrapData),
  options: () => apiClient.get(`${base}/options`).then(unwrapData),
  rules: () => apiClient.get(`${base}/rules`).then(unwrapData),
  rule: (id) => apiClient.get(`${base}/rules/${encodeURIComponent(id)}`).then(unwrapData),
  save: (rule) => (rule.id ? apiClient.put(`${base}/rules/${encodeURIComponent(rule.id)}`, rule) : apiClient.post(`${base}/rules`, rule)).then(unwrapData),
  enable: (rule) => apiClient.put(`${base}/rules/${encodeURIComponent(rule.id)}/enabled`, { enabled: !rule.enabled, revision: rule.revision }).then(unwrapData),
  history: (params) => apiClient.get(base, { params }).then(unwrapData),
  detail: (id) => apiClient.get(`${base}/${encodeURIComponent(id)}`).then(unwrapData),
  retry: (id, acknowledgeDuplicateRisk) => apiClient.post(`${base}/${encodeURIComponent(id)}/retry`, { acknowledgeDuplicateRisk }).then(unwrapData),
};
