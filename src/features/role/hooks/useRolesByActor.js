import { useQuery } from "@tanstack/react-query";

import { getRolesByActor } from "../api/role.api.js";

// `actor` is null until the row's tenant is chosen — enabled: false then,
// so no request fires (and the roles picker stays empty) until it is.
export function useRolesByActor(actor) {
  return useQuery({
    queryKey: ["roles", "by-actor", actor],
    queryFn: () => getRolesByActor(actor),
    enabled: Boolean(actor),
  });
}
