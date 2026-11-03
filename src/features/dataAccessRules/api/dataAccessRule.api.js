import { apiClient, unwrapData } from "../../../services/apiClient.js";

// POST /api/v1/data-access-rules — DataAccessRuleController.create. accessLevel
// must be "FULL_ACCESS" or "LIMITED_ACCESS" (AccessLevelEnum); accessEntityType
// is a SINGLE value matching AccessEntityTypeEnum's constant names exactly
// (Dashboard_bills/Dashboard_Customer/Product) — a rule governs exactly one
// entity type, not several.
export async function createDataAccessRule(payload) {
  const response = await apiClient.post("/api/v1/data-access-rules", payload);
  return unwrapData(response);
}

// GET /api/v1/data-access-rules/directory — DataAccessRuleController.getDirectory.
// Mirrors TenantController.getTenantDirectory exactly: page/size/sort/search
// query params, same first-call-omits-search convention, role-scoped and
// regex-searched the same way on the backend.
export async function getDataAccessRuleDirectory({ page = 0, size = 20, sort, search } = {}) {
  const response = await apiClient.get("/api/v1/data-access-rules/directory", {
    params: { page, size, sort, search },
  });
  return unwrapData(response);
}

// GET /api/v1/data-access-rules/{id} — backs the directory table's row-click
// popup. Response includes an `editable` flag, server-computed from
// AuthenticationContext.getUserId() vs the rule's own createdBy — only the
// rule's creator may edit it.
export async function getDataAccessRuleById(id) {
  const response = await apiClient.get(`/api/v1/data-access-rules/${id}`);
  return unwrapData(response);
}

// PUT /api/v1/data-access-rules/{id} — only succeeds for the rule's own
// creator (403 otherwise); businessEntityId is NOT editable, not sent here.
export async function updateDataAccessRule(id, payload) {
  const response = await apiClient.put(`/api/v1/data-access-rules/${id}`, payload);
  return unwrapData(response);
}
