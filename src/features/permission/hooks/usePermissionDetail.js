import { useQuery } from "@tanstack/react-query";

import { getPermissionById } from "../api/permission.api.js";

// Backs the Edit Permission modal's prefill — only runs once a permission
// is selected (row-click), same enabled-gating pattern as useUserDetail.
export function usePermissionDetail(permissionId) {
  return useQuery({
    queryKey: ["permissions", "detail", permissionId],
    queryFn: () => getPermissionById(permissionId),
    enabled: !!permissionId,
  });
}
