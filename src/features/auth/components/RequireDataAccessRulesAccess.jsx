import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "../../../constants/routes.js";
import { canSeeDataAccessRulesSubTab } from "../lib/accessControl.js";
import { useCurrentRoles } from "../hooks/useCurrentRoles.js";

// Route-level counterpart to navAccess.js's "data-access" child gating — a
// non-_ADMIN already passed RequireUsersAccess (it sees the Users tab) but
// shouldn't be able to reach this route directly by URL. Falls back to the
// Users list route, not Home, since the caller already has Users-tab
// access — just not this one.
export function RequireDataAccessRulesAccess() {
  const roles = useCurrentRoles();

  if (!canSeeDataAccessRulesSubTab(roles)) {
    return <Navigate to={ROUTES.USERS} replace />;
  }

  return <Outlet />;
}
