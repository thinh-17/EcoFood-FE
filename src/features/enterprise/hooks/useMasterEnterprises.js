import { useQuery } from "@tanstack/react-query";

import { listEnterprises } from "../api/enterprise.api.js";

export function useMasterEnterprises(enabled) {
  return useQuery({
    queryKey: ["enterprises", "list", "ENTERPRISE"],
    queryFn: () => listEnterprises("ENTERPRISE"),
    enabled,
  });
}
