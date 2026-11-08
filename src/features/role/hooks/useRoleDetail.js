import { useQuery } from "@tanstack/react-query";

import { getRoleById } from "../api/role.api.js";

// Backs the Edit Role modal's prefill — only runs once a role is selected
// (row-click), same enabled-gating pattern as useUserDetail.
export function useRoleDetail(roleId) {
  return useQuery({
    queryKey: ["roles", "detail", roleId],
    queryFn: () => getRoleById(roleId),
    enabled: !!roleId,
  });
}
