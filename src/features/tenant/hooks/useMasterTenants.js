import { useQuery } from "@tanstack/react-query";

import { listTenants } from "../api/tenant.api.js";

export function useMasterTenants(enabled) {
  return useQuery({
    queryKey: ["tenants", "list", "MASTER_TENANT"],
    queryFn: () => listTenants("MASTER_TENANT"),
    enabled,
  });
}
