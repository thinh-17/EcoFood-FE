import { canAccessManager } from "../../dashboard/lib/dashboardAccess.js";

export function managerTabs(claims = {}) {
  if (!canAccessManager(claims.roles)) return [];
  return [
    { id: "dashboard", label: "Dashboard" },
    { id: "invoices", label: "Invoice" },
  ];
}

/**
 * The tab to show for a `?tab=` value: no value → the first tab; a known id →
 * that tab; anything else (e.g. the removed "customers") → null, so the page
 * treats it like any unknown URL instead of silently showing another tab.
 */
export function resolveManagerTab(tabs, requested) {
  if (requested == null || requested === "") return tabs[0]?.id ?? null;
  return tabs.find((tab) => tab.id === requested)?.id ?? null;
}
