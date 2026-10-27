import "./TenantSwitcher.css";

import { useRef, useState } from "react";
import { FiLayers } from "react-icons/fi";

import { useAuthStore } from "../../auth/store/authStore.js";
import { useEligibleTenants } from "../hooks/useEligibleTenants.js";

// hover-open flyout, anchored right, active tenant highlighted
const CLOSE_DELAY_MS = 200;

export function TenantSwitcher() {
  const currentTenantId = useAuthStore((s) => s.tenantId);
  const switchTenant = useAuthStore((s) => s.switchTenant);
  const { data: tenants = [], isLoading, isError } = useEligibleTenants();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingTenantId, setSwitchingTenantId] = useState(null);
  const closeTimerRef = useRef(null);

  const currentTenant = tenants.find((tenant) => tenant.tenantId === currentTenantId);
  const currentTenantLabel = isLoading
    ? "Loading..."
    : isError
      ? "Failed to load tenant"
      : (currentTenant?.tenantName ?? "Current tenant");

  const openFlyout = () => {
    clearTimeout(closeTimerRef.current);
    setIsOpen(true);
  };

  const scheduleClose = () => {
    closeTimerRef.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  };

  const handleSelect = async (tenant) => {
    if (tenant.tenantId === currentTenantId || switchingTenantId) {
      return;
    }
    setSwitchingTenantId(tenant.tenantId);
    try {
      // navigates/reloads on success, so no reset here for the happy path
      await switchTenant(tenant.tenantId, tenant.domainUrl);
    } catch {
      setSwitchingTenantId(null);
    }
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
          <small>Current tenant</small>
        </div>
      </button>

      {isOpen && (
        <div
          className="eco-tenant-switcher__flyout"
          onMouseEnter={openFlyout}
          onMouseLeave={scheduleClose}
        >
          <div className="eco-tenant-switcher__flyout-title">Available tenants</div>
          <div className="eco-tenant-switcher__divider" />

          <ul className="eco-tenant-switcher__list">
            {!isLoading && tenants.length === 0 && (
              <li className="eco-tenant-switcher__empty">No tenants available</li>
            )}

            {tenants.map((tenant) => {
              const isActive = tenant.tenantId === currentTenantId;
              return (
                <li key={tenant.tenantId}>
                  <button
                    type="button"
                    className={`eco-tenant-switcher__item ${isActive ? "eco-tenant-switcher__item--active" : ""}`}
                    title={`${tenant.tenantName}\n${tenant.tenantCode}`}
                    disabled={!!switchingTenantId}
                    onClick={() => handleSelect(tenant)}
                  >
                    <span className="eco-tenant-switcher__item-name">{tenant.tenantName}</span>
                    <span className="eco-tenant-switcher__item-code">
                      {switchingTenantId === tenant.tenantId ? "Switching..." : tenant.tenantCode}
                    </span>
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
