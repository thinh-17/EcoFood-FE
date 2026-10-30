import { useQuery } from "@tanstack/react-query";

import { getUserDirectory } from "../../user/api/user.api.js";

// Backs the "Users" tab's user picker — reuses the existing ACL-scoped
// Users directory endpoint (same pattern as useAllTenants reusing the
// Tenant directory), fetched as a single largest-page call rather than
// paginated, since this is a picker, not a table. size: 100 is the
// backend's own MAX_DIRECTORY_PAGE_SIZE clamp — a caller scoped to more
// than 100 users would only see the first 100 here, same known trade-off
// as useAllTenants.
export function useAllUsersForPicker(enabled = true) {
  return useQuery({
    queryKey: ["users", "directory", "picker"],
    queryFn: () => getUserDirectory({ page: 0, size: 100, sort: "firstName,asc" }),
    enabled,
    select: (data) => data.content,
  });
}
