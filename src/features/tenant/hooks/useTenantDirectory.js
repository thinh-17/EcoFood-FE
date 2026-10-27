import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getTenantDirectory } from "../api/tenant.api.js";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";

// `hasSearched` distinguishes "no search param at all" (initial directory
// view) from "search=''" (user cleared the box after having typed) — see
// TenantController.getTenantDirectory's documented first-call-omits-search
// convention. Debounced so it doesn't refetch on every keystroke.
export function useTenantDirectory({ page, size, sort, search, hasSearched }) {
  const debouncedSearch = useDebouncedValue(search, 400);

  return useQuery({
    queryKey: ["tenants", "directory", page, size, sort, hasSearched ? debouncedSearch : null],
    queryFn: () =>
      getTenantDirectory({
        page,
        size,
        sort,
        search: hasSearched ? debouncedSearch : undefined,
      }),
    placeholderData: keepPreviousData,
  });
}
