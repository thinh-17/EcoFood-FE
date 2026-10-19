import "./MainLayout.css";

import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import {
  FiGrid,
  FiMenu,
  FiX,
  FiChevronDown,
  FiChevronsLeft,
  FiChevronsRight,
  FiLayers,
} from "react-icons/fi";

import { useDisclosure } from "@thinh-17/fe-core";

import { navItems } from "../../app/navigation/navItems.js";
import { ROUTES } from "../../constants/routes.js";

import { useActiveTenant } from
  "../../features/tenant/context/TenantProvider.jsx";
import { useAuthStore } from "../../features/auth/store/authStore.js";
import { TenantSwitcher } from "../../features/tenant/components/TenantSwitcher.jsx";

export function MainLayout() {
  const location = useLocation();

  const mobileMenu = useDisclosure(false);

  const [collapsed, setCollapsed] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState({
    partner: true,
    "users-group": true,
  });

  const {
    tenantId,
    tenants,
    tenantsQuery,
    switchTenant,
  } = useActiveTenant();

  const logout = useAuthStore((s) => s.logout);

  const allLinks = navItems.flatMap((item) =>
    item.children ?? [item]
  );

  const currentPage = allLinks.find(
    (item) => item.to === location.pathname
  );

  const toggleGroup = (id) => {
    setExpandedGroups((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  const closeMobileMenu = () => {
    mobileMenu.close();
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;

    if (item.children) {
      const isExpanded = expandedGroups[item.id] ?? false;

      const isGroupActive = item.children.some(
        (child) => child.to === location.pathname
      );

      return (
        <div
          key={item.id}
          className={`eco-nav-group ${
            isGroupActive ? "eco-nav-group--active" : ""
          }`}
        >
          <button
            type="button"
            className="eco-nav-group__trigger"
            aria-expanded={isExpanded}
            aria-controls={`eco-submenu-${item.id}`}
            onClick={() => toggleGroup(item.id)}
            title={item.label}
          >
            <Icon size={19} aria-hidden="true" />

            <span className="eco-nav-label">
              {item.label}
            </span>

            <FiChevronDown
              size={15}
              aria-hidden="true"
              className={`eco-nav-chevron ${
                isExpanded ? "eco-nav-chevron--open" : ""
              }`}
            />
          </button>

          {isExpanded && (
            <div
              id={`eco-submenu-${item.id}`}
              className="eco-submenu"
            >
              {item.children.map((child) => {
                const ChildIcon = child.icon;

                if (child.action === "logout") {
                  return (
                    <button
                      key={child.id}
                      type="button"
                      className="eco-submenu__link"
                      title={child.label}
                      onClick={() => {
                        closeMobileMenu();
                        logout();
                      }}
                    >
                      <ChildIcon
                        size={16}
                        aria-hidden="true"
                      />

                      <span className="eco-nav-label">
                        {child.label}
                      </span>
                    </button>
                  );
                }

                return (
                  <NavLink
                    key={child.id}
                    to={child.to}
                    end
                    onClick={closeMobileMenu}
                    title={child.label}
                    className={({ isActive }) =>
                      `eco-submenu__link ${
                        isActive ? "eco-nav-link--active" : ""
                      }`
                    }
                  >
                    <ChildIcon
                      size={16}
                      aria-hidden="true"
                    />

                    <span className="eco-nav-label">
                      {child.label}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.id}
        to={item.to}
        end
        title={item.label}
        onClick={closeMobileMenu}
        className={({ isActive }) =>
          `eco-nav-link ${
            isActive ? "eco-nav-link--active" : ""
          }`
        }
      >
        <Icon size={19} aria-hidden="true" />

        <span className="eco-nav-label">
          {item.label}
        </span>
      </NavLink>
    );
  };

  return (
    <div
      className={[
        "eco-shell",
        collapsed ? "eco-shell--collapsed" : "",
        mobileMenu.isOpen ? "eco-shell--mobile-open" : "",
      ].filter(Boolean).join(" ")}
    >
      {mobileMenu.isOpen && (
        <button
          type="button"
          className="eco-overlay"
          aria-label="Đóng menu"
          onClick={mobileMenu.close}
        />
      )}

      <aside className="eco-sidebar">
        <div className="eco-sidebar__brand">
          <Link
            to={ROUTES.HOME}
            className="eco-brand"
            onClick={closeMobileMenu}
          >
            <span className="eco-brand__icon">
              <FiGrid size={22} />
            </span>

            <span className="eco-brand__name eco-nav-label">
              <strong>EcoFood</strong>
              <small>MULTI-TENANT PLATFORM</small>
            </span>
          </Link>

          <button
            type="button"
            className="eco-sidebar__collapse"
            aria-label={
              collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"
            }
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <FiChevronsRight size={18} />
            ) : (
              <FiChevronsLeft size={18} />
            )}
          </button>
        </div>

        <nav
          className="eco-sidebar__nav"
          aria-label="Điều hướng chính"
        >
          <span className="eco-sidebar__caption eco-nav-label">
            WORKSPACE
          </span>

          {navItems.map(renderNavItem)}
        </nav>

        <div className="eco-sidebar__footer">
          <TenantSwitcher />
        </div>
      </aside>

      <div className="eco-body">
        <header className="eco-topbar">
          <div className="eco-topbar__left">
            <button
              type="button"
              className="eco-mobile-toggle"
              aria-label={
                mobileMenu.isOpen ? "Đóng sidebar" : "Mở sidebar"
              }
              aria-expanded={mobileMenu.isOpen}
              onClick={mobileMenu.toggle}
            >
              {mobileMenu.isOpen ? <FiX /> : <FiMenu />}
            </button>

            <div className="eco-breadcrumb">
              <span>Workspace</span>
              <span aria-hidden="true">/</span>
              <strong>{currentPage?.label ?? "Home"}</strong>
            </div>
          </div>

          <div className="eco-topbar__right">
            <label className="eco-tenant-selector">
              <FiLayers size={17} aria-hidden="true" />

              <select
                aria-label="Tenant đang hoạt động"
                value={tenantId}
                disabled={tenantsQuery.isLoading}
                onChange={(event) =>
                  switchTenant(event.target.value)
                }
              >
                {!tenantId && (
                  <option value="">
                    {tenantsQuery.isLoading
                      ? "Đang tải tenant..."
                      : tenantsQuery.isError
                        ? "Lỗi tải tenant"
                        : "Chọn tenant"}
                  </option>
                )}

                {tenants.map((tenant) => (
                  <option
                    key={tenant.id}
                    value={tenant.id}
                  >
                    {tenant.name}
                  </option>
                ))}
              </select>
            </label>

            <div
              className="eco-user-avatar"
              title="Tài khoản demo"
              aria-label="Tài khoản demo"
            >
              DU
            </div>
          </div>
        </header>

        <main className="eco-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}