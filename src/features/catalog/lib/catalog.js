export function catalogAccess(claims = {}) {
  const roles = Array.isArray(claims.roles) ? claims.roles : [], permissions = Array.isArray(claims.permissions) ? claims.permissions : [];
  const employee = roles.some((r) => /^(TENANT|MASTER|ENTERPRISE)_(ADMIN|PRODUCT_MANAGER|EMPLOYEE)$/.test(r));
  const admin = roles.some((r) => /^(TENANT|MASTER|ENTERPRISE)_ADMIN$/.test(r));
  const read = employee;
  return { read, manage: read && (admin || permissions.includes("CATALOG_API_MANAGE")), publish: read && (admin || permissions.includes("CATALOG_API_PUBLISH")), grant: read && (admin || permissions.includes("CATALOG_API_GRANT")) };
}
export function catalogActions(status, rights = {}) {
  return { edit: rights.manage && ["DRAFT", "VALIDATED"].includes(status), validate: rights.publish && ["DRAFT", "VALIDATED"].includes(status), publish: rights.publish && status === "VALIDATED", retire: rights.publish && status === "PUBLISHED", grant: rights.grant && status === "PUBLISHED" };
}
export function localTime(value) {
  if (!value) return "";
  const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function newCatalogDraft(previous) {
  return { apiKey: previous?.apiKey || "", name: previous?.name || "", catalogType: previous?.catalogType || "PRODUCT", version: previous ? previous.version + 1 : 1,
    selections: previous?.selections || [], partnerIds: previous?.partnerIds || [], customField: previous?.catalogOrchestrator?.customField || [],
    policy: { startsAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), maxPageSize: previous?.policy?.maxPageSize || 20 } };
}
export function catalogError(error) {
  const status = error?.response?.status;
  if (status === 401) return "Your session has expired or the credential is invalid.";
  if (status === 403) return "You do not have access in the current scope.";
  return error?.response?.data?.message || "Unable to process the catalog publication. Please try again.";
}
