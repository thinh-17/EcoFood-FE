import { useQuery } from "@tanstack/react-query";

import { getTenantById } from "../api/tenant.api.js";

// Backs the directory table's row-click popup. `id` is null while the modal
// is closed — enabled: false then, so no request fires until a row is
// actually clicked.
export function useTenantDetail(id) {
  return useQuery({
    queryKey: ["tenants", "detail", id],
    queryFn: () => getTenantById(id),
    enabled: Boolean(id),
  });
}
