import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { lazy, Suspense } from "react";
import { LoadingPage } from "../../../pages/LoadingPage/LoadingPage.jsx";
import { Navigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../../../constants/routes.js";
import { CoreTabs } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { managerTabs, resolveManagerTab } from "../lib/manager.lib.js";
import "./manager.css";

const BusinessDashboardPage = lazy(() => import("../../dashboard/pages/BusinessDashboardPage.jsx")
  .then((module) => ({ default: module.BusinessDashboardPage })));
const InvoiceListPage = lazy(() => import("../../transaction/pages/InvoiceListPage.jsx")
  .then((module) => ({ default: module.InvoiceListPage })));

export function ManagerPage() {
  const token = useAuthStore((state) => state.internalAccessToken);
  const [params, setParams] = useSearchParams();
  let claims = {};
  try { claims = decodeJwt(token) || {}; } catch { /* The auth route handles invalid sessions. */ }
  const tabs = managerTabs(claims);
  if (!tabs.length) return <section className="manager-denied"><CorePageHeader title="Manager" />
    <FeedbackMessage tone="warning">You do not have permission to view Dashboard or Invoice in this tenant.</FeedbackMessage></section>;
  const active = resolveManagerTab(tabs, params.get("tab"));
  // An unknown ?tab= (e.g. the removed "customers") is handled like any
  // unknown URL — the app's catch-all route (AppRouter "*") goes Home.
  if (!active) return <Navigate to={ROUTES.HOME} replace />;
  function selectTab(id) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (id === "dashboard") next.delete("tab"); else next.set("tab", id);
      return next;
    });
  }
  return <div className="manager-page">
    <div className="manager-tabs"><CoreTabs tabs={tabs} activeId={active} onChange={selectTab} /></div>
    <Suspense fallback={<LoadingPage title="Loading Manager" />}>
      {active === "invoices" ? <InvoiceListPage key={token} /> : <BusinessDashboardPage key={token} />}
    </Suspense>
  </div>;
}
