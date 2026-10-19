import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useMyTenants } from "../hooks/useMyTenants.js";

const TenantContext = createContext(null);

const STORAGE_KEY = "fnb_active_tenant_id";

export function TenantProvider({ children }) {
  const tenantsQuery = useMyTenants();

  const [tenantId, setTenantId] = useState("");

  const tenants = tenantsQuery.data ?? [];

  // Validate tenant đã lưu với danh sách tenant được phép.
  useEffect(() => {
    if (!tenantsQuery.isSuccess) {
      return;
    }

    if (tenants.length === 0) {
      setTenantId("");
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    setTenantId((currentId) => {
      if (tenants.some((tenant) => tenant.id === currentId)) {
        return currentId;
      }

      const savedId = sessionStorage.getItem(STORAGE_KEY);

      const nextId = tenants.some(
        (tenant) => tenant.id === savedId
      )
        ? savedId
        : tenants[0].id;

      sessionStorage.setItem(STORAGE_KEY, nextId);

      return nextId;
    });
  }, [tenantsQuery.isSuccess, tenantsQuery.data]);

  const selectedTenant = useMemo(() => {
    return (
      tenants.find((tenant) => tenant.id === tenantId) ?? null
    );
  }, [tenants, tenantId]);

  const switchTenant = useCallback(
    (nextTenantId) => {
      const exists = tenants.some(
        (tenant) => tenant.id === nextTenantId
      );

      if (!exists) {
        return false;
      }

      sessionStorage.setItem(STORAGE_KEY, nextTenantId);
      setTenantId(nextTenantId);

      return true;
    },
    [tenants]
  );

  const value = useMemo(
    () => ({
      tenantId,
      selectedTenant,
      tenants,
      tenantsQuery,
      switchTenant,
    }),
    [tenantId, selectedTenant, tenantsQuery, switchTenant]
  );

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useActiveTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error(
      "useActiveTenant must be used inside TenantProvider"
    );
  }

  return context;
}