import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { assignTenantRoles } from "../api/user.api.js";

export function useAssignTenantRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, tenantAssignments }) => assignTenantRoles(id, tenantAssignments),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["users", "directory"] });
      queryClient.invalidateQueries({ queryKey: ["users", "detail", id] });

      // If the caller just edited THEIR OWN roles, their already-issued
      // access token still carries the old roles/permissions/roleGroups —
      // nav/route guards would keep reading stale claims until the next
      // scheduled silent refresh (~80% of the token's 30-min lifetime).
      // Re-mint immediately instead: /api/v1/auth/refresh-token always
      // resolves fresh access off the DB (see InternalTokenService.
      // mintTokenPair), it's just normally only called on a timer/401.
      const { internalAccessToken, refreshInternal } = useAuthStore.getState();
      if (!internalAccessToken) {
        return;
      }
      try {
        const { sub } = decodeJwt(internalAccessToken);
        if (sub === id) {
          refreshInternal();
        }
      } catch {
        // malformed/expired token — nothing to refresh
      }
    },
  });
}
