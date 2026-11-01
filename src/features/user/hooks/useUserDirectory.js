import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getUserDirectory } from "../api/user.api.js";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";

// Same convention as useTenantDirectory: `hasSearched` distinguishes "no
// search param at all" (initial directory view) from "search=''" (user
// cleared the box after having typed) — see TenantController.
// getTenantDirectory's documented first-call-omits-search convention, which
// this endpoint is expected to mirror once built.
export function useUserDirectory({ page, size, sort, search, hasSearched }) {
  const debouncedSearch = useDebouncedValue(search, 400);

  return useQuery({
    queryKey: ["users", "directory", page, size, sort, hasSearched ? debouncedSearch : null],
    queryFn: () =>
      getUserDirectory({
        page,
        size,
        sort,
        search: hasSearched ? debouncedSearch : undefined,
      }),
    placeholderData: keepPreviousData,
  });
}
