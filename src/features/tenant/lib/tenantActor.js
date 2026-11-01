// Derives a tenant's Role Actor (ECO/ENTERPRISE/MASTER/TENANT) from its
// partnerTypeCode + tenantType — see app/docs/ACL_ROLE_MODEL.md §1.1. Used
// by the Access & Permissions role picker: once a tenant is chosen for an
// assignment row, its derived actor decides which role codes are even
// eligible (e.g. an ENTERPRISE tenant only ever gets ENTERPRISE_* roles).
export function deriveTenantActor(partnerTypeCode, tenantType) {
  if (partnerTypeCode === "ECO") return "ECO";
  if (partnerTypeCode === "ENTERPRISE" || partnerTypeCode === "REGIONAL_ENTERPRISE") return "ENTERPRISE";
  if (partnerTypeCode === "ECOSYSTEM_PARTNER" || partnerTypeCode === "BRAND") {
    return tenantType === "SUB_TENANT" ? "TENANT" : "MASTER";
  }
  return null;
}
