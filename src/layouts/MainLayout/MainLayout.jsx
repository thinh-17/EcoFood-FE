import "./MainLayout.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { FiX, FiUser, FiLogOut, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import { EcoFoodBrand } from "../../components/EcoFoodBrand.jsx";
import { navItems } from "../../app/navigation/navItems.js";
import { filterNavItems } from "../../app/navigation/navAccess.js";
import { navigationSections, activeNavigationPath } from "../../app/navigation/navSections.js";
import { useAuthStore } from "../../features/auth/store/authStore.js";
import { useCurrentRoles } from "../../features/auth/hooks/useCurrentRoles.js";
import { decodeJwt } from "../../features/auth/lib/jwt.js";
import { TenantSwitcher } from "../../features/tenant/components/TenantSwitcher.jsx";
import { NotificationBell } from "../../features/notification/components/NotificationBell.jsx";
import { SidebarContext } from "./SidebarContext.js";

export function MainLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileRoute, setMobileRoute] = useState(null);
  const sidebarRef = useRef(null);
  const openerRef = useRef(null);
  const logout = useAuthStore((s) => s.logout);
  const token = useAuthStore((s) => s.internalAccessToken);
  const tenantId = useAuthStore((s) => s.tenantId);
  const roles = useCurrentRoles();
  const routeScope = location.key + tenantId + token;
  const mobileOpen = mobileRoute === routeScope;
  const permissions = useMemo(() => {
    try { return decodeJwt(token).permissions || []; } catch { return []; }
  }, [token]);
  const sections = navigationSections(filterNavItems(navItems, roles, permissions));
  const activePath = activeNavigationPath(location.pathname, [...sections.flatMap((section) => section.items), { to: "/account" }]);
  function closeMobile() { setMobileRoute(null); openerRef.current?.focus(); }
  function openMobile() { openerRef.current = document.activeElement; setMobileRoute(routeScope); }

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector("a, button")?.focus();
    function keydown(event) {
      if (event.key === "Escape") { event.preventDefault(); closeMobile(); }
      if (event.key !== "Tab") return;
      const focusable = [...sidebarRef.current.querySelectorAll('a[href], button:not(:disabled), [tabindex="0"]')]
        .filter((element) => element.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keydown); };
  }, [mobileOpen]);
  return <SidebarContext.Provider value={{ mobileOpen, openMobile }}>
    <div className={`eco-shell eco-admin-shell${collapsed ? " eco-shell--collapsed" : ""}${mobileOpen ? " eco-shell--mobile-open" : ""}`}>
      <a className="eco-skip-link" href="#admin-content">Skip to content</a>
      {mobileOpen && <button type="button" className="eco-overlay" aria-label="Close navigation" onClick={closeMobile} />}
      <aside id="admin-sidebar" ref={sidebarRef} className="eco-sidebar" aria-label="Administrative workspace">
        <div className="eco-sidebar__brand">
          <Link to="/" className="eco-brand" title="EcoFood Home" aria-label="EcoFood Home" onClick={() => setMobileRoute(null)}>
            <EcoFoodBrand />
          </Link>
          <NotificationBell key={`${location.key}:${tenantId}:${token}`} />
          <button type="button" className="eco-drawer-close" aria-label="Close navigation" onClick={closeMobile}><FiX size={18} /></button>
        </div>
        <button type="button" className="eco-sidebar__collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-controls="admin-sidebar" aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? <FiChevronsRight size={16} /> : <FiChevronsLeft size={16} />}<span className="eco-nav-label">Collapse sidebar</span>
        </button>
        <nav className="eco-sidebar__nav" aria-label="Main navigation">
          {sections.map((section) => <section className="eco-sidebar-section" key={section.id} aria-label={section.label}>
            <h2 className="eco-sidebar__caption">{section.label}</h2>
            {section.items.map((item) => {
              const Icon = item.icon;
              return <Link key={item.id} to={item.to} title={item.label} aria-label={item.label}
                aria-current={activePath === item.to ? "page" : undefined}
                onClick={() => setMobileRoute(null)} className={`eco-nav-link${activePath === item.to ? " eco-nav-link--active" : ""}`}>
                <Icon size={18} aria-hidden="true" /><span className="eco-nav-label">{item.label}</span>
              </Link>;
            })}
          </section>)}
        </nav>
        <footer className="eco-sidebar__footer">
          <Link to="/account" title="Account" aria-label="Account" aria-current={activePath === "/account" ? "page" : undefined} onClick={() => setMobileRoute(null)}
            className={`eco-nav-link${activePath === "/account" ? " eco-nav-link--active" : ""}`}>
            <FiUser size={18} aria-hidden="true" /><span className="eco-nav-label">Account</span>
          </Link>
          <TenantSwitcher />
          <button type="button" title="Log out" aria-label="Log out" className="eco-nav-link" onClick={() => { setMobileRoute(null); logout(); }}>
            <FiLogOut size={18} aria-hidden="true" /><span className="eco-nav-label">Log out</span>
          </button>
        </footer>
      </aside>
      <div className="eco-body"><main id="admin-content" className="eco-content" tabIndex={-1}><Outlet /></main></div>
    </div>
  </SidebarContext.Provider>;
}
