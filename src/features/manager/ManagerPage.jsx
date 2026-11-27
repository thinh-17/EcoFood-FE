import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { CorePageHeader, CoreTabs } from "@thinh-17/fe-core";
import { useAuthStore } from "../auth/store/authStore.js";
import { decodeJwt } from "../auth/lib/jwt.js";
import { managerTabs } from "./manager.lib.js";
import "./manager.css";

const BusinessDashboardPage = lazy(() => import("../dashboard/pages/BusinessDashboardPage.jsx")
  .then((module) => ({ default: module.BusinessDashboardPage })));
const InvoiceListPage = lazy(() => import("../transaction/InvoiceListPage.jsx")
  .then((module) => ({ default: module.InvoiceListPage })));

export function ManagerPage() {
  const token = useAuthStore((state) => state.internalAccessToken);
  const [params, setParams] = useSearchParams();
  let claims = {};
  try { claims = decodeJwt(token) || {}; } catch { /* The auth route handles invalid sessions. */ }
  const tabs = managerTabs(claims);
  const active = tabs.find((tab) => tab.id === params.get("tab"))?.id ?? tabs[0]?.id;
  if (!active) return <section className="manager-denied"><CorePageHeader title="Manager" />
    <p role="alert">Bạn chưa có quyền xem Dashboard hoặc Invoice trong tenant hiện tại.</p></section>;
  function selectTab(id) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (id === "dashboard") next.delete("tab"); else next.set("tab", id);
      return next;
    });
  }
  return <div className="manager-page">
    <div className="manager-tabs"><CoreTabs tabs={tabs} activeId={active} onChange={selectTab} /></div>
    <Suspense fallback={<p className="manager-loading" role="status">Đang tải…</p>}>
      {active === "dashboard" ? <BusinessDashboardPage key={token} /> : <InvoiceListPage key={token} />}
    </Suspense>
  </div>;
}
