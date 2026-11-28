import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { canAccessManager } from "../lib/dashboardAccess.js";
export function RequireManager() {
  const token = useAuthStore((s) => s.internalAccessToken);
  let claims = {}; try { claims = decodeJwt(token); } catch { /* Auth handles invalid sessions. */ }
  return canAccessManager(claims.roles) ? <Outlet /> : <Navigate to="/" replace />;
}
export { CustomerDashboardPage } from "./CustomerDashboardPage.jsx";
export { InvoiceDashboardPage } from "./InvoiceDashboardPage.jsx";
