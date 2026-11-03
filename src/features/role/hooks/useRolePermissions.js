import { useQuery } from "@tanstack/react-query";

import { getRolePermissions } from "../api/role.api.js";

// Backs the Manage Permissions modal's prefill — only runs once a role is
// selected (row-click), same enabled-gating pattern as useUserDetail.
export function useRolePermissions(roleId) {
  return useQuery({
    queryKey: ["roles", "permissions", roleId],
    queryFn: () => getRolePermissions(roleId),
    enabled: !!roleId,
  });
}
