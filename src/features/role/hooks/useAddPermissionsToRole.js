import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addPermissionsToRole } from "../api/role.api.js";

export function useAddPermissionsToRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionIds }) => addPermissionsToRole(roleId, permissionIds),
    onSuccess: (_data, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ["roles", "permissions", roleId] });
    },
  });
}
