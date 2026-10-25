import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "../../../constants/routes.js";
import { canSeeTenantOnboarding } from "../lib/accessControl.js";
import { useCurrentRoles } from "../hooks/useCurrentRoles.js";

// Route-level counterpart to navAccess.js's "tenant-onboarding" child gating
// — hiding the sub-tab isn't enough on its own (a TENANT_PARTNERSHIP_MANAGER
// could still open the URL directly), so the onboarding route itself is
// gated the same way here. Falls back to the Tenant directory, not Home,
// since the caller already has Partner-tab access — just not this route.
export function RequireTenantOnboardingAccess() {
  const roles = useCurrentRoles();

  if (!canSeeTenantOnboarding(roles)) {
    return <Navigate to={ROUTES.TENANT} replace />;
  }

  return <Outlet />;
}
