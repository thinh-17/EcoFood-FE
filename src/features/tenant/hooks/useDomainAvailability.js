import { useQuery } from "@tanstack/react-query";

import { checkDomainAvailability } from "../api/tenant.api.js";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";

// Live "is this domain already taken" check, debounced so it doesn't fire
// on every keystroke — same behavior as DCMP's own domain-availability
// validation. `domainUrl` must already be the FULL computed domain (e.g.
// "gamma.ecofood.com" or "master.ecofood.com/sub"), not the raw subdomain
// box the user types.
export function useDomainAvailability(domainUrl) {
  const debouncedDomainUrl = useDebouncedValue(domainUrl, 400);

  return useQuery({
    queryKey: ["tenants", "domain-availability", debouncedDomainUrl],
    queryFn: () => checkDomainAvailability(debouncedDomainUrl),
    enabled: Boolean(debouncedDomainUrl),
    staleTime: 0,
  });
}
