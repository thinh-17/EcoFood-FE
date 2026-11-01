import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "../../../constants/routes.js";
import { canSeeRolesAndPermissionsSubTabs } from "../lib/accessControl.js";
import { useCurrentRoles } from "../hooks/useCurrentRoles.js";

// Route-level counterpart to navAccess.js's "roles"/"permissions" child
// gating — only the ECO actor (ECO_ADMIN/ECO_PARTNERSHIP_MANAGER), not any
// _ADMIN. Falls back to the Users list route, not Home, since the caller
// already has Users-tab access — just not these two routes.
export function RequireRolesAndPermissionsAccess() {
  const roles = useCurrentRoles();

  if (!canSeeRolesAndPermissionsSubTabs(roles)) {
    return <Navigate to={ROUTES.USERS} replace />;
  }

  return <Outlet />;
}
