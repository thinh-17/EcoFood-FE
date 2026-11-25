import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getSaleOrchestratorDirectory } from "../api/planSale.api.js";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";

// Mirrors useDataAccessRuleDirectory/useTenantDirectory exactly — fetched
// only once the "Sale Orchestrator" tab is opened (enabled), and only for a
// caller who passes canViewSaleOrchestratorDirectory (an Enterprise viewer
// would get a 403, same as the single-Plan endpoint today).
export function useSaleOrchestratorDirectory({
  propositionId,
  page,
  size,
  sort,
  search,
  hasSearched,
  enabled = true,
}) {
  const debouncedSearch = useDebouncedValue(search, 400);

  return useQuery({
    queryKey: [
      "propositions",
      propositionId,
      "sale-orchestrators",
      "directory",
      page,
      size,
      sort,
      hasSearched ? debouncedSearch : null,
    ],
    queryFn: ({ signal }) =>
      getSaleOrchestratorDirectory(
        propositionId,
        { page, size, sort, search: hasSearched ? debouncedSearch : undefined },
        signal,
      ),
    enabled: enabled && !!propositionId,
    placeholderData: keepPreviousData,
  });
}
