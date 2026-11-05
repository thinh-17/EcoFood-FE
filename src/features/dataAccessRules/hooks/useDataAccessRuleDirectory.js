import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getDataAccessRuleDirectory } from "../api/dataAccessRule.api.js";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";

// Mirrors useTenantDirectory exactly — `hasSearched` distinguishes "no
// search param at all" (initial directory view) from "search=''" (user
// cleared the box after having typed), debounced so it doesn't refetch on
// every keystroke.
export function useDataAccessRuleDirectory({ page, size, sort, search, hasSearched }) {
  const debouncedSearch = useDebouncedValue(search, 400);

  return useQuery({
    queryKey: ["data-access-rules", "directory", page, size, sort, hasSearched ? debouncedSearch : null],
    queryFn: () =>
      getDataAccessRuleDirectory({
        page,
        size,
        sort,
        search: hasSearched ? debouncedSearch : undefined,
      }),
    placeholderData: keepPreviousData,
  });
}
