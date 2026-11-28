import { useAuthStore } from "../../auth/store/authStore.js";
import { useDashboardAccess } from "../hooks/useDashboardAccess.js";
import { DashboardAccessDenied } from "../components/DashboardAccessDenied.jsx";
export function CustomerDashboardPage() {
  const scope = useAuthStore((s) => s.internalAccessToken);
  const access = useDashboardAccess(scope, "CUSTOMER_DASHBOARD");
  if (access.isPending) return <p role="status">Checking dashboard access…</p>;
  if (access.error?.response?.status === 403 || access.data?.allowed === false)
    return <DashboardAccessDenied title="Customer Dashboard" />;
  if (access.isError) return <p role="alert">Unable to check dashboard access.</p>;
  return null;
}
