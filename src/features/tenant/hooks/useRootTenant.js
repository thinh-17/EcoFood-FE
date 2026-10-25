import { useQuery } from "@tanstack/react-query";

import { getRootTenant } from "../api/tenant.api.js";

// The platform's one ECO tenant — its domainUrl is the base every other
// tenant's domain is composed against. Stable for the whole session, so a
// long staleTime avoids re-fetching it on every onboarding-page visit.
export function useRootTenant() {
  return useQuery({
    queryKey: ["tenants", "root"],
    queryFn: getRootTenant,
    staleTime: 5 * 60 * 1000,
  });
}
