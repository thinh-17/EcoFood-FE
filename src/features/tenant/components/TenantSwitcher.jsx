import "./TenantSwitcher.css";
import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";

import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiLayers } from "react-icons/fi";

import { useAuthStore } from "../../auth/store/authStore.js";
import { useEligibleTenants } from "../hooks/useEligibleTenants.js";

// Presentation only; tenant discovery and switching retain the existing auth flow.


export function TenantSwitcher() {
  const currentTenantId = useAuthStore((s) => s.tenantId);
  const switchTenant = useAuthStore((s) => s.switchTenant);
  const { data: tenants = [], isLoading, isError } = useEligibleTenants();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingTenantId, setSwitchingTenantId] = useState(null);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    function outside(event) { if (!event.target.closest?.("[data-core-feedback]") && !containerRef.current?.contains(event.target)) setIsOpen(false); }
    function escape(event) { if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); setIsOpen(false); triggerRef.current?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape, true); };
  }, [isOpen]);

  const currentTenant = tenants.find((tenant) => tenant.tenantId === currentTenantId);
  const currentTenantLabel = isLoading
    ? "Loading..."
    : isError
      ? "Failed to load tenant"
      : (currentTenant?.tenantName ?? "Current tenant");

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
      ref={containerRef}


    >
      <button ref={triggerRef} type="button" className="eco-sidebar__workspace eco-tenant-switcher__trigger"
        title={`Current Tenant: ${currentTenantLabel}`} aria-label={`Current Tenant: ${currentTenantLabel}`}
        aria-expanded={isOpen} aria-controls={isOpen ? "tenant-switcher-options" : undefined}
        onClick={() => setIsOpen((value) => !value)}>
        <FiLayers size={19} aria-hidden="true" />

        <div className="eco-nav-label eco-tenant-switcher__label">
          <small>Current Tenant</small>
          <strong>{isLoading ? <CoreLoadingState variant="inline" title="Loading tenant" /> : currentTenantLabel}</strong>
        </div>
        <FiChevronDown className="eco-tenant-switcher__chevron" size={15} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="eco-tenant-switcher__flyout"
          id="tenant-switcher-options"


        >
          <div className="eco-tenant-switcher__flyout-title">Available tenants</div>
          <div className="eco-tenant-switcher__divider" />

          <ul className="eco-tenant-switcher__list">
            {isLoading && <li className="eco-tenant-switcher__empty"><CoreLoadingState variant="inline" title="Loading tenants" /></li>}
            {isError && <li className="eco-tenant-switcher__empty"><FeedbackMessage>Failed to load tenants.</FeedbackMessage></li>}
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
import { CoreLoadingState } from "@thinh-17/fe-core";
