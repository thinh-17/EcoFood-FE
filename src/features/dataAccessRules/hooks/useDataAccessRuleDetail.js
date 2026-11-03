import { useQuery } from "@tanstack/react-query";

import { getDataAccessRuleById } from "../api/dataAccessRule.api.js";

// Mirrors useTenantDetail exactly. `id` is null while the modal is closed —
// enabled: false then, so no request fires until a row is actually clicked.
export function useDataAccessRuleDetail(id) {
  return useQuery({
    queryKey: ["data-access-rules", "detail", id],
    queryFn: () => getDataAccessRuleById(id),
    enabled: Boolean(id),
  });
}
