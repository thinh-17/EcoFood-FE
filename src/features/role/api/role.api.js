import { apiClient, unwrapData } from "../../../services/apiClient.js";

// GET /api/v1/roles?actor=ENTERPRISE — backs the Access & Permissions role
// picker, scoped to whichever Role Actor the selected tenant derives to
// (see features/tenant/lib/tenantActor.js).
export async function getRolesByActor(actor) {
  const response = await apiClient.get("/api/v1/roles", { params: { actor } });
  return unwrapData(response);
}

// GET /api/v1/roles/directory — full Role catalog (id/code/name), alphabetical.
// Backs the Roles tab under Users: a flat reference list, not paginated/searched.
export async function getRoleDirectory() {
  const response = await apiClient.get("/api/v1/roles/directory");
  return unwrapData(response);
}

// POST /api/v1/roles — the "+ New Role" modal's Save action. groupId is
// optional: when set, the backend also links the new role into that
// existing Group's GroupRole doc in the same call.
export async function createRole(payload) {
  const response = await apiClient.post("/api/v1/roles", payload);
  return unwrapData(response);
}

// GET /api/v1/roles/{roleId}/permissions — current permissions assigned to
// a role, backs the Manage Permissions modal's prefill.
export async function getRolePermissions(roleId) {
  const response = await apiClient.get(`/api/v1/roles/${roleId}/permissions`);
  return unwrapData(response);
}

// POST /api/v1/roles/{roleId}/permissions — the Manage Permissions modal's
// Save action. Adds (never replaces) permissions on the role.
export async function addPermissionsToRole(roleId, permissionIds) {
  const response = await apiClient.post(`/api/v1/roles/${roleId}/permissions`, { permissionIds });
  return unwrapData(response);
}

// GET /api/v1/roles/{roleId} — role detail plus its current group (if
// any), backs the Edit Role modal's prefill.
export async function getRoleById(roleId) {
  const response = await apiClient.get(`/api/v1/roles/${roleId}`);
  return unwrapData(response);
}

// PUT /api/v1/roles/{roleId} — the Edit Role modal's Save action. groupId
// reassigns group membership: omitted/blank unassigns, set moves the role
// into that group.
export async function updateRole(roleId, payload) {
  const response = await apiClient.put(`/api/v1/roles/${roleId}`, payload);
  return unwrapData(response);
}
