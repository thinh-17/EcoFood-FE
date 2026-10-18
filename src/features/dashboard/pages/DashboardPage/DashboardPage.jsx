import "./DashboardPage.css";
import { useEffect, useState } from "react";
import {
  FiBell, FiCoffee,
  FiMessageSquare, FiChevronDown, FiPlus, FiCheckCircle, FiPackage,
  FiLayers, FiClock, FiAlertCircle,
} from "react-icons/fi";
import { useMyTenants } from "../../../tenant/hooks/useMyTenants.js";
import { useDashboard } from "../../hooks/useDashboard.js";
import { getDashboardArticles } from "../../api/dashboard.api.js";
import { DashboardBuilder } from "./components/DashboardBuilder/DashboardBuilder.jsx";
import { InsightsCarousel } from "./components/InsightsCarousel/InsightsCarousel.jsx";

function formatMoney(value = 0) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value) + " ₫";
}
function formatTime(value) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value));
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
        <div className="topbar-breadcrumb">WORKSPACE <span>/</span> <strong>Tổng quan</strong></div>
        <div className="topbar-right">
          <label className="tenant-select-wrap">
            <FiLayers size={16} />
            <select aria-label="Chọn tenant hiện tại" value={tenantId} onChange={(e) => changeTenant(e.target.value)} disabled={tenantsQuery.isLoading}>
              {!tenantId && <option value="">Đang tải tenant...</option>}
              {(tenantsQuery.data ?? []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
            <FiChevronDown size={14} />
          </label>
          <span className="header-separator" />
          <span className="header-bell" title="Thông báo sẽ được triển khai ở giai đoạn tiếp theo"><FiBell size={20} /></span>
          <span className="topbar-avatar" title="Tài khoản hiện tại">HY</span>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="page-meta"><span>HỆ THỐNG QUẢN LÝ F&B</span><span>{selectedTenant?.name ?? "Đang chọn tenant"}</span></div>

        {error && <div className="error-banner" role="alert"><FiAlertCircle /> Không tải được dữ liệu. Kiểm tra API hoặc bật VITE_USE_MOCK_API=true để test local.</div>}

        <div className="intro-grid">
          <section className="welcome-panel">
            <div className="welcome-decoration" aria-hidden="true"><FiCoffee size={55} /></div>
            <span className="eyebrow">DASHBOARD</span>
            <h1>Chào mừng trở lại, {stats?.displayName || "bạn"}!</h1>
            <p>Cùng vận hành hiệu quả và phát triển hệ sinh thái F&B của bạn.</p>
            <span className="welcome-foot"><span className="status-dot" /> {selectedTenant?.name ?? "Đang tải thông tin tenant"}</span>
          </section>

          <section className="activity-panel">
            <div className="panel-title-row"><h2>Hoạt động gần đây</h2><FiClock color="#64748b" /></div>
            {activities.isLoading && <p className="muted">Đang tải hoạt động...</p>}
            {!activities.isLoading && allActivities.length === 0 && <div className="empty-activity"><FiCheckCircle size={25} /> Chưa có hoạt động gần đây.</div>}
            <ul className="activity-list">
              {allActivities.slice(0, 3).map((item) => {
                const Icon = activityIcon[item.type] || FiBell;
                return <li key={item.id}><span className="activity-icon"><Icon size={17} /></span><div><strong>{item.title}</strong><small>{item.detail} · {formatTime(item.occurredAt)}</small></div></li>;
              })}
            </ul>
          </section>
        </div>

        <DashboardBuilder
          key={tenantId}
          tenantId={tenantId}
          canEdit={selectedTenant?.role === "TENANT_ADMIN" || selectedTenant?.role === "ENTERPRISE_ADMIN" || selectedTenant?.role === "PLATFORM_ADMIN"}
          summary={stats}
          activities={allActivities}
        />

        <InsightsCarousel articles={getDashboardArticles()} />
        <footer className="dashboard-footer"><span>F&B Platform · Multi-tenant Console</span><span>Giao diện demo · Dữ liệu mẫu khi bật mock API</span></footer>
      </div>

      <div className="quick-action">
        {quickMenuOpen && <div className="quick-menu"><strong>Thao tác nhanh</strong><span>Tạo giao dịch và thêm sản phẩm sẽ triển khai ở sprint tiếp theo.</span></div>}
        <button type="button" className="fab" aria-label="Mở thao tác nhanh" aria-expanded={quickMenuOpen} onClick={() => setQuickMenuOpen((value) => !value)}><FiPlus size={23} /></button>
      </div>
    </div>
  );
}
