import { canAccessManager } from "../../dashboard/lib/dashboardAccess.js";

export function managerTabs(claims = {}) {
  if (!canAccessManager(claims.roles)) return [];
  return [
    { id: "dashboard", label: "Dashboard" },
    { id: "invoices", label: "Invoice" },
    { id: "customers", label: "Customer" },
  ];
}
