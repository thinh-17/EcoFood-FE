import { apiClient, unwrapData } from "../../../services/apiClient.js";

// GET /api/v1/tenants/me does not exist on the backend yet — calling it
// 404s. Returning an empty list until that endpoint is actually built,
// rather than hitting a route that isn't there.
export async function getMyTenants() {
  return [];
}

// Mirrors DCMP's real GET {securityManagementService}/users/eligible-tenants
// — the list of tenants the current internal-token holder is allowed to
// switch into. Backend endpoint not implemented yet either; this call will
// 404 until it exists.
export async function getEligibleTenants() {
  const response = await apiClient.get("/api/v1/users/eligible-tenants");
  return unwrapData(response);
}
