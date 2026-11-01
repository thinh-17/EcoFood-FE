import { useQuery } from "@tanstack/react-query";

import { getUserById } from "../api/user.api.js";

// Backs the directory table's row-click popup. `id` is null while the modal
// is closed — enabled: false then, so no request fires until a row is
// actually clicked. Mirrors useTenantDetail exactly.
export function useUserDetail(id) {
  return useQuery({
    queryKey: ["users", "detail", id],
    queryFn: () => getUserById(id),
    enabled: Boolean(id),
  });
}
