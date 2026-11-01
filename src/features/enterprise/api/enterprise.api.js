import { apiClient, unwrapData } from "../../../services/apiClient.js";

// GET /api/v1/enterprises?enterpriseCategoryCode=... — EnterpriseController.
// Omit enterpriseCategoryCode to list every enterprise; pass "ENTERPRISE" to
// back the onboarding form's "related enterprise" picker for a
// REGIONAL_ENTERPRISE (which attaches to an already-existing master-level
// ENTERPRISE).
export async function listEnterprises(enterpriseCategoryCode) {
  const response = await apiClient.get("/api/v1/enterprises", {
    params: enterpriseCategoryCode ? { enterpriseCategoryCode } : undefined,
  });
  return unwrapData(response);
}
