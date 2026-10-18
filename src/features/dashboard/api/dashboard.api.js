import { apiClient, unwrapData } from "../../../services/apiClient.js";
import {
  dashboardSummaryByTenant,
  dashboardActivitiesByTenant,
  dashboardArticles,
} from "../mocks/dashboard.mock.js";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

function tenantHeaders(tenantId) {
  return { "X-Tenant-Id": tenantId };
}

export async function getDashboardSummary(tenantId) {
  if (USE_MOCK) return dashboardSummaryByTenant[tenantId] ?? dashboardSummaryByTenant["tenant-001"];
  const response = await apiClient.get("/api/v1/dashboard/summary", {
    headers: tenantHeaders(tenantId),
  });
  return unwrapData(response);
}

export async function getDashboardActivities(tenantId, limit = 5) {
  if (USE_MOCK) return (dashboardActivitiesByTenant[tenantId] ?? []).slice(0, limit);
  const response = await apiClient.get("/api/v1/dashboard/activities", {
    headers: tenantHeaders(tenantId),
    params: { limit },
  });
  return unwrapData(response);
}

// Nội dung minh họa tĩnh, chưa phải API tin tức trực tuyến.
export function getDashboardArticles() {
  return dashboardArticles;
}
