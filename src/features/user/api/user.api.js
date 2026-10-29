import { apiClient, unwrapData } from "../../../services/apiClient.js";

// Mirrors TenantController.getTenantDirectory: page/size/sort/search query
// params, same first-call-omits-search convention, role-scoped and
// regex-searched the same way on the backend.
export async function getUserDirectory({ page = 0, size = 20, sort, search } = {}) {
  const response = await apiClient.get("/api/v1/users/directory", {
    params: { page, size, sort, search },
  });
  return unwrapData(response);
}

// Backs the Users directory's row-click popup — basic info plus the Access
// & Permissions section's current tenantAssignments.
export async function getUserById(id) {
  const response = await apiClient.get(`/api/v1/users/${id}`);
  return unwrapData(response);
}

// POST /api/v1/users/{id}/tenant-assignments — the Access & Permissions
// section's Save action. tenantAssignments is the user's WHOLE desired
// (tenantId, roleIds) set, not just new additions (see
// AssignTenantRolesRequest's javadoc on the backend) — the form always
// submits every row, existing and newly added together.
export async function assignTenantRoles(id, tenantAssignments) {
  const response = await apiClient.post(`/api/v1/users/${id}/tenant-assignments`, { tenantAssignments });
  return unwrapData(response);
}

// POST /api/v1/users — the "+ New User" modal's Save action. Backs
// UserController.createUser/UserCreateRequest: tenantAssignments must be
// non-empty (a brand-new user always needs at least one initial tenant
// membership), unlike assignTenantRoles's roleIds-required-per-entry rule —
// here roleIds is optional per assignment (a user can be created with no
// role yet).
export async function createUser(payload) {
  const response = await apiClient.post("/api/v1/users", payload);
  return unwrapData(response);
}
