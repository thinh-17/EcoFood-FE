import "./DashboardPage.css";
import { useEffect, useState } from "react";
import { CoreButton, CoreCard, CoreEmptyState, CorePageHeader, CoreSelect } from "@thinh-17/fe-core";
import {
  FiBell, FiCoffee,
  FiMessageSquare, FiPlus, FiCheckCircle, FiPackage,
  FiLayers, FiClock, FiAlertCircle,
} from "react-icons/fi";
import { useMyTenants } from "../../../tenant/hooks/useMyTenants.js";
import { useDashboard } from "../../hooks/useDashboard.js";
import { getDashboardArticles } from "../../api/dashboard.api.js";
import { DashboardBuilder } from "./components/DashboardBuilder/DashboardBuilder.jsx";
import { InsightsCarousel } from "./components/InsightsCarousel/InsightsCarousel.jsx";

function formatTime(value) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value));
}
const activityIcon = {
  transaction: FiCheckCircle,
  product: FiPackage,
  tenant: FiLayers,
  complaint: FiMessageSquare,
};

export function DashboardPage() {
  const tenantsQuery = useMyTenants();
  const [tenantId, setTenantId] = useState("");
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const { summary, activities } = useDashboard(tenantId);

  useEffect(() => {
    const available = tenantsQuery.data ?? [];
    if (!available.length) return;
    setTenantId((current) => {
      if (available.some((tenant) => tenant.id === current)) return current;
      const saved = sessionStorage.getItem("fnb_active_tenant_id");
      return available.some((tenant) => tenant.id === saved) ? saved : available[0].id;
    });
  }, [tenantsQuery.data]);

  const selectedTenant = (tenantsQuery.data ?? []).find((t) => t.id === tenantId);
  const stats = summary.data;
  const allActivities = activities.data ?? [];
  const error = tenantsQuery.error || summary.error || activities.error;

  const changeTenant = (nextId) => {
    if (!(tenantsQuery.data ?? []).some((tenant) => tenant.id === nextId)) return;
    sessionStorage.setItem("fnb_active_tenant_id", nextId);
    setTenantId(nextId);
  };

  return (
    <div className="dashboard-page">
      <header className="topbar">
        <div className="topbar-breadcrumb">WORKSPACE <span>/</span> <strong>Overview</strong></div>
        <div className="topbar-right">
          <div className="tenant-select-wrap">
            <FiLayers size={16} />
            <CoreSelect aria-label="Select current tenant" value={tenantId} onChange={changeTenant} disabled={tenantsQuery.isLoading}
              placeholder={tenantsQuery.isLoading ? "Loading tenants..." : "No tenants available"}
              options={(tenantsQuery.data ?? []).map((tenant) => ({ value: tenant.id, label: tenant.name }))} />
          </div>
          <span className="header-separator" />
          <span className="header-bell" title="Notifications are coming soon"><FiBell size={20} /></span>
          <span className="topbar-avatar" title="Current account">HY</span>
        </div>
      </header>

      <div className="dashboard-content">
        <CorePageHeader title="Overview" description="Track your tenant's activity and business performance." />
        <div className="page-meta"><span>F&B MANAGEMENT SYSTEM</span><span>{selectedTenant?.name ?? "Selecting tenant"}</span></div>

        {error && <div className="error-banner" role="alert"><FiAlertCircle /> Unable to load data. Please try again later.</div>}

        <div className="intro-grid">
          <CoreCard className="welcome-panel">
            <div className="welcome-decoration" aria-hidden="true"><FiCoffee size={55} /></div>
            <span className="eyebrow">DASHBOARD</span>
            <h2>Welcome back, {stats?.displayName || "there"}!</h2>
            <p>Run your operations efficiently and grow your F&B ecosystem.</p>
            <span className="welcome-foot"><span className="status-dot" /> {selectedTenant?.name ?? "Loading tenant details"}</span>
          </CoreCard>

          <CoreCard className="activity-panel">
            <div className="panel-title-row"><h2>Recent activity</h2><FiClock color="#64748b" /></div>
            {activities.isLoading && <p className="muted">Loading activity...</p>}
            {!activities.isLoading && allActivities.length === 0 && <CoreEmptyState title="No recent activity." />}
            <ul className="activity-list">
              {allActivities.slice(0, 3).map((item) => {
                const Icon = activityIcon[item.type] || FiBell;
                return <li key={item.id}><span className="activity-icon"><Icon size={17} /></span><div><strong>{item.title}</strong><small>{item.detail} · {formatTime(item.occurredAt)}</small></div></li>;
              })}
            </ul>
          </CoreCard>
        </div>

        <DashboardBuilder
          key={tenantId}
          tenantId={tenantId}
          canEdit={selectedTenant?.role === "TENANT_ADMIN" || selectedTenant?.role === "ENTERPRISE_ADMIN" || selectedTenant?.role === "PLATFORM_ADMIN"}
          summary={stats}
          activities={allActivities}
        />

        <InsightsCarousel articles={getDashboardArticles()} />
        <footer className="dashboard-footer"><span>F&B Platform · Multi-tenant Console</span></footer>
      </div>

      <div className="quick-action">
        {quickMenuOpen && <div className="quick-menu"><strong>Quick actions</strong><span>Transaction creation and product management shortcuts are coming soon.</span></div>}
        <CoreButton className="fab" aria-label="Open quick actions" aria-expanded={quickMenuOpen} onClick={() => setQuickMenuOpen((value) => !value)}><FiPlus size={23} /></CoreButton>
      </div>
    </div>
  );
}
