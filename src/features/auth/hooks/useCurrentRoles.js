import { useAuthStore } from "../store/authStore.js";
import { decodeJwt } from "../lib/jwt.js";

// The current tenant-scoped role codes, decoded straight off the internal
// access token's "roles" claim (InternalTokenService already resolves and
// embeds these at login — see app/docs/ACL_ROLE_MODEL.md §6).
export function useCurrentRoles() {
  const token = useAuthStore((s) => s.internalAccessToken);
  if (!token) return [];

  try {
    return decodeJwt(token).roles ?? [];
  } catch {
    return [];
  }
}
