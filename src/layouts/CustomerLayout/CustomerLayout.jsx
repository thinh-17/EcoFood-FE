import { useState } from "react";
import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useDisclosure } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { FiMenu, FiX, FiChevronsLeft, FiChevronsRight, FiFileText, FiUser, FiMessageSquare, FiLogOut } from "react-icons/fi";
import { EcoFoodBrand } from "../../components/EcoFoodBrand.jsx";
import { useAuthStore } from "../../features/auth/store/authStore.js";
import { useCustomerProfile } from "../../features/customer/hooks/useCustomerProfile.js";
import { CustomerComplaintUpdates } from "../../features/complaint/components/CustomerComplaintUpdates.jsx";
import { customerNavigation, customerSection } from "../../features/customer/lib/customer.lib.js";
import "../MainLayout/MainLayout.css";
import "./CustomerLayout.css";

const icons = { history: FiFileText, profile: FiUser, care: FiMessageSquare };

export function CustomerLayout() {
  const location = useLocation();
  const [params] = useSearchParams();
  const token = useAuthStore((state) => state.internalAccessToken);
  const currentTenant = useAuthStore((state) => state.tenantId);
  const profile = useCustomerProfile();
  const client = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const mobile = useDisclosure(false);
  const active = customerSection(location.pathname);
  const tenant = profile.data?.tenantId || params.get("tenant") || currentTenant;
  const path = (value) => `${value}${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ""}`;
  const name = [profile.data?.firstName, profile.data?.lastName].filter(Boolean).join(" ") || "Customer";
  const initials = [profile.data?.firstName?.[0], profile.data?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "C";
  function logout() {
    client.removeQueries({ queryKey: ["customer"] });
    client.removeQueries({ queryKey: ["complaints", token] });
    useAuthStore.getState().logout();
  }
  return <div className={["eco-shell", "customer-shell", collapsed ? "eco-shell--collapsed" : "",
    mobile.isOpen ? "eco-shell--mobile-open" : ""].filter(Boolean).join(" ")}>
    {mobile.isOpen && <CoreButton className="eco-overlay" aria-label="Close menu" onClick={mobile.close} />}
    <aside className="eco-sidebar">
      <div className="eco-sidebar__brand">
        <Link to={path("/customer")} className="eco-brand" onClick={mobile.close}>
          <EcoFoodBrand subtitle="CUSTOMER PORTAL" />
        </Link>
        <CoreButton className="eco-sidebar__collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}>{collapsed ? <FiChevronsRight size={18} /> : <FiChevronsLeft size={18} />}</CoreButton>
      </div>
      <nav className="eco-sidebar__nav" aria-label="Customer navigation">
        <span className="eco-sidebar__caption eco-nav-label">MY WORKSPACE</span>
        {customerNavigation.map((item) => {
          const Icon = icons[item.id];
          return <Link key={item.id} to={path(item.path)} title={item.label} onClick={mobile.close}
            aria-current={active === item.id ? "page" : undefined}
            className={`eco-nav-link${active === item.id ? " eco-nav-link--active" : ""}`}>
            <Icon size={19} aria-hidden="true" /><span className="eco-nav-label">{item.label}</span>
          </Link>;
        })}
      </nav>
      <div className="eco-sidebar__footer">
        <div className="eco-sidebar__workspace"><FiUser size={19} aria-hidden="true" />
          <span className="eco-nav-label"><strong>{name}</strong><small>{profile.data?.email || "Customer account"}</small></span>
        </div>
        {token && <CoreButton variant="secondary" className="customer-shell-logout" title="Log out" onClick={logout}>
          <FiLogOut size={18} aria-hidden="true" /><span className="eco-nav-label">Log out</span>
        </CoreButton>}
      </div>
    </aside>
    <div className="eco-body">
      <header className="eco-topbar">
        <div className="eco-topbar__left">
          <CoreButton className="eco-mobile-toggle" aria-label={mobile.isOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={mobile.isOpen} onClick={mobile.toggle}>{mobile.isOpen ? <FiX /> : <FiMenu />}</CoreButton>
          <div className="eco-breadcrumb"><span>Customer Portal</span><span aria-hidden="true">/</span>
            <strong>{customerNavigation.find((item) => item.id === active)?.label}</strong></div>
        </div>
        {token && profile.isSuccess && <CustomerComplaintUpdates key={`${token}/${tenant}`} token={token} tenantId={tenant} />}
        <Link className="eco-user-avatar" to={path("/customer/profile")} title={name} aria-label="Open my profile">{initials}</Link>
      </header>
      <main className="eco-content"><Outlet key={token} /></main>
    </div>
  </div>;
}
