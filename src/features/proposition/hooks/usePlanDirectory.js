import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getPlanDirectory } from "../api/proposition.api.js";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";

// Mirrors useDataAccessRuleDirectory/useTenantDirectory exactly — fetched
// only once the "Plans & Market Configuration" tab is opened (enabled).
// `revision` is the parent Proposition's own optimistic-lock revision, which
// bumps on every Plan add/edit/approve/submit/remove/version action — baking
// it into the query key auto-refreshes this directory whenever the already-
// loaded Proposition payload does, with no manual cache invalidation needed.
export function usePlanDirectory({
  propositionId,
  revision,
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
      "plans",
      "directory",
      revision,
      page,
      size,
      sort,
      hasSearched ? debouncedSearch : null,
    ],
    queryFn: ({ signal }) =>
      getPlanDirectory(
        propositionId,
        { page, size, sort, search: hasSearched ? debouncedSearch : undefined },
        signal,
      ),
    enabled: enabled && !!propositionId,
    placeholderData: keepPreviousData,
  });
}
