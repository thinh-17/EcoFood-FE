export function managerTabs(claims = {}) {
  const permissions = Array.isArray(claims.permissions) ? claims.permissions : [];
  return [
    { id: "dashboard", label: "Dashboard", permission: "DASHBOARD_READ" },
    { id: "invoices", label: "Invoice", permission: "TRANSACTION_READ" },
  ].filter((tab) => permissions.includes(tab.permission));
}
