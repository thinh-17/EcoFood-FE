import { apiClient, unwrapData } from "../../../services/apiClient.js";

// GET /api/v1/roles?actor=ENTERPRISE — backs the Access & Permissions role
// picker, scoped to whichever Role Actor the selected tenant derives to
// (see features/tenant/lib/tenantActor.js).
export async function getRolesByActor(actor) {
  const response = await apiClient.get("/api/v1/roles", { params: { actor } });
  return unwrapData(response);
}
