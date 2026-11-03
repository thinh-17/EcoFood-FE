import { apiClient, unwrapData } from "../../../services/apiClient.js";

// GET /api/v1/permissions/directory — full Permission catalog (id/code/name),
// alphabetical. Backs the Permissions tab under Users: a flat reference list,
// not paginated/searched.
export async function getPermissionDirectory() {
  const response = await apiClient.get("/api/v1/permissions/directory");
  return unwrapData(response);
}

// POST /api/v1/permissions/standalone — backs the "+ New Permission" form.
export async function createPermission(payload) {
  const response = await apiClient.post("/api/v1/permissions/standalone", payload);
  return unwrapData(response);
}

// GET /api/v1/permissions/{permissionId} — backs the Edit Permission modal's prefill.
export async function getPermissionById(permissionId) {
  const response = await apiClient.get(`/api/v1/permissions/${permissionId}`);
  return unwrapData(response);
}

// PUT /api/v1/permissions/{permissionId} — the Edit Permission modal's Save action.
export async function updatePermission(permissionId, payload) {
  const response = await apiClient.put(`/api/v1/permissions/${permissionId}`, payload);
  return unwrapData(response);
}
