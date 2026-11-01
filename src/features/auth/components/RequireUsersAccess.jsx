import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "../../../constants/routes.js";
import { canSeeUsersTab } from "../lib/accessControl.js";
import { useCurrentRoles } from "../hooks/useCurrentRoles.js";

// Route-level counterpart to navAccess.js's "users-group" gating — same
// rule as RequirePartnerAccess (canSeeUsersTab mirrors canSeePartnerTab).
export function RequireUsersAccess() {
  const roles = useCurrentRoles();

  if (!canSeeUsersTab(roles)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
}
