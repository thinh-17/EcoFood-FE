import { apiClient, unwrapData } from "../../../services/apiClient.js";

// POST /api/v1/data-access-rules — NOT implemented on the backend yet (this
// call 404s until it exists). Frontend-first per explicit instruction: the
// Rule Configuration + Users tabs are built and wired to this call shape
// now, the real endpoint comes later.
export async function createDataAccessRule(payload) {
  const response = await apiClient.post("/api/v1/data-access-rules", payload);
  return unwrapData(response);
}
