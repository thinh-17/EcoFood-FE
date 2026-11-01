import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "../../../constants/routes.js";
import { canSeePartnerTab } from "../lib/accessControl.js";
import { useCurrentRoles } from "../hooks/useCurrentRoles.js";

// Route-level counterpart to navAccess.js's Partner-tab gating — hiding the
// tab isn't enough on its own (a user could still open the URL directly),
// so the /partner/* routes themselves are gated the same way here.
export function RequirePartnerAccess() {
  const roles = useCurrentRoles();

  if (!canSeePartnerTab(roles)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
}
