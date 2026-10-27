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

// POST /api/v1/tenants — TenantController.onboardTenant. Creates the
// tenant's Keycloak realm + client AND its first (admin/owner) user in one
// call; returns 201 with TenantOnboardResponse.
export async function onboardTenant(payload) {
  const response = await apiClient.post("/api/v1/tenants", payload);
  return unwrapData(response);
}

// GET /api/v1/tenants?tenantType=... — TenantController.listTenants.
// Omit tenantType to list every tenant; pass "MASTER_TENANT" to back the
// onboarding form's master-tenant picker.
export async function listTenants(tenantType) {
  const response = await apiClient.get("/api/v1/tenants", {
    params: tenantType ? { tenantType } : undefined,
  });
  return unwrapData(response);
}

// GET /api/v1/tenants/domain-availability?domainUrl=... — live "is this
// domain already taken" check for the onboarding form, same as DCMP's own
// domain-availability validation. Always called with the FULL computed
// domain (e.g. "gamma.ecofood.com" or "master.ecofood.com/sub"), never the
// raw subdomain box the user types.
export async function checkDomainAvailability(domainUrl) {
  const response = await apiClient.get("/api/v1/tenants/domain-availability", {
    params: { domainUrl },
  });
  return unwrapData(response);
}

// GET /api/v1/tenants/root — the platform's one ECO tenant. Its domainUrl
// is the base every other tenant's domain is composed against
// ("gamma.<rootTenant.domainUrl>"), replacing any window-location guess.
export async function getRootTenant() {
  const response = await apiClient.get("/api/v1/tenants/root");
  return unwrapData(response);
}

// GET /api/v1/tenants/directory — TenantController.getTenantDirectory.
// Role-scoped (SYSTEM sees every tenant; ENTERPRISE/MASTER_TENANT see their
// own tenant + its sub-tenants), paginated, sorted, and searched server-side
// — this call never slices/sorts/filters the response itself. `search`
// omitted entirely means "no search yet" (the first call, before the user
// has typed anything); once they've typed, pass whatever string they typed,
// including "" if they clear the box, per TenantService.listTenantDirectory.
export async function getTenantDirectory({ page = 0, size = 20, sort, search } = {}) {
  const response = await apiClient.get("/api/v1/tenants/directory", {
    params: { page, size, sort, search },
  });
  return unwrapData(response);
}

// GET /api/v1/tenants/{id} — TenantController.getById. Backs the directory
// table's row-click detail popup; returns the full TenantResponse (not the
// leaner shape the directory list row carries).
export async function getTenantById(id) {
  const response = await apiClient.get(`/api/v1/tenants/${id}`);
  return unwrapData(response);
}

// PUT /api/v1/tenants/{id} — TenantController.updateTenant. Deliberately
// narrow: only tenantName + contact are ever accepted (see
// TenantUpdateRequest's javadoc); domainUrl/realm/clientId/partnerTypeCode/
// tenantType can't be changed through this call.
export async function updateTenant(id, payload) {
  const response = await apiClient.put(`/api/v1/tenants/${id}`, payload);
  return unwrapData(response);
}
