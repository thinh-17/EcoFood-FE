// "Belongs to" column of the Tenant directory. The backend
// (GET /api/v1/tenants/directory → TenantDirectoryScope) adds each row's
// parent: a sub-tenant's master tenant, or a Regional Enterprise's owning
// Enterprise. Top-level tenants have no parent.
const RELATION_LABELS = {
  SUB_TENANT: "Sub-tenant",
  REGIONAL_ENTERPRISE: "Regional enterprise",
};

/** { name, relation } for a directory row's parent, or null for a top-level tenant. */
export function tenantBelongsTo(row) {
  if (!row?.parentTenantId) return null;
  return {
    name: row.parentTenantName || row.parentTenantId,
    relation: RELATION_LABELS[row.parentRelation] ?? null,
  };
}
