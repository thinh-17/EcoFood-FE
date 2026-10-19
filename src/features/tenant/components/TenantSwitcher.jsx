import "./TenantSwitcher.css";

import { useRef, useState } from "react";
import { FiLayers } from "react-icons/fi";

import { useAuthStore } from "../../auth/store/authStore.js";
import { useEligibleTenants } from "../hooks/useEligibleTenants.js";

// Mirrors DCMP's real settings-section flyout (hover-open, anchored to the
// right of the trigger, active tenant highlighted) — but shows the current
// TENANT's name on the trigger itself (per explicit requirement), not the
// user's name as DCMP's does.
const CLOSE_DELAY_MS = 200;

export function TenantSwitcher() {
  const currentTenantId = useAuthStore((s) => s.tenantId);
  const { data: tenants = [], isLoading, isError } = useEligibleTenants();
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef(null);

  const currentTenant = tenants.find((tenant) => tenant.tenantId === currentTenantId);
  const currentTenantLabel = isLoading
    ? "Đang tải..."
    : isError
      ? "Không tải được tenant"
      : (currentTenant?.tenantName ?? "Tenant hiện tại");

  const openFlyout = () => {
    clearTimeout(closeTimerRef.current);
    setIsOpen(true);
  };

  const scheduleClose = () => {
    closeTimerRef.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  };

  const handleSelect = (tenant) => {
    if (tenant.tenantId === currentTenantId) {
      return;
    }
    // TODO: wire up the actual switch-tenant flow (re-authenticating
    // against the target tenant's realm, matching DCMP's
    // handleSwitchTenant()) once the backend supports it — this is the
    // frontend display/selection piece only for now.
    setIsOpen(false);
  };

  return (
    <div
      className="eco-tenant-switcher"
      onMouseEnter={openFlyout}
      onMouseLeave={scheduleClose}
    >
      <button type="button" className="eco-sidebar__workspace eco-tenant-switcher__trigger">
        <FiLayers size={19} aria-hidden="true" />

        <div className="eco-nav-label eco-tenant-switcher__label">
          <strong>{currentTenantLabel}</strong>
          <small>Tenant hiện tại</small>
        </div>
      </button>

      {isOpen && (
        <div
          className="eco-tenant-switcher__flyout"
          onMouseEnter={openFlyout}
          onMouseLeave={scheduleClose}
        >
          <div className="eco-tenant-switcher__flyout-title">Tenant khả dụng</div>
          <div className="eco-tenant-switcher__divider" />

          <ul className="eco-tenant-switcher__list">
            {!isLoading && tenants.length === 0 && (
              <li className="eco-tenant-switcher__empty">Không có tenant nào</li>
            )}

            {tenants.map((tenant) => {
              const isActive = tenant.tenantId === currentTenantId;
              return (
                <li key={tenant.tenantId}>
                  <button
                    type="button"
                    className={`eco-tenant-switcher__item ${isActive ? "eco-tenant-switcher__item--active" : ""}`}
                    title={`${tenant.tenantName}\n${tenant.tenantCode}`}
                    onClick={() => handleSelect(tenant)}
                  >
                    <span className="eco-tenant-switcher__item-name">{tenant.tenantName}</span>
                    <span className="eco-tenant-switcher__item-code">{tenant.tenantCode}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
