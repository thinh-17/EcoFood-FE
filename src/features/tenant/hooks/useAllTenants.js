import { useQuery } from "@tanstack/react-query";

import { getTenantDirectory } from "../api/tenant.api.js";

// Backs the Access & Permissions "Entities" picker — reuses the ACL-scoped
// directory endpoint (SYSTEM sees every tenant; ENTERPRISE/MASTER_TENANT see
// their own tenant + sub-tenants; TENANT sees only its own) rather than the
// unscoped GET /api/v1/tenants, so an admin can only assign a user to a
// tenant they're actually allowed to see. size: 100 is the backend's own
// MAX_DIRECTORY_PAGE_SIZE clamp — this is a picker, not a paginated table,
// so it fetches the largest single page rather than paginating; a caller
// scoped to more than 100 tenants would only see the first 100 here (a
// known trade-off, same ceiling the backend itself enforces).
export function useAllTenants(enabled = true) {
  return useQuery({
    queryKey: ["tenants", "directory", "picker"],
    queryFn: () => getTenantDirectory({ page: 0, size: 100, sort: "tenantName,asc" }),
    enabled,
    select: (data) => data.content,
  });
}
