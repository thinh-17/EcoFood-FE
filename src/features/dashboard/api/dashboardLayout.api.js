import { apiClient, unwrapData } from "../../../services/apiClient.js";
import {
  getMockDashboardDefinition,
  saveMockDashboardDefinition,
  getMockDashboardWidgetData,
} from "../mocks/dashboardLayout.mock.js";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";
const headers = (tenantId) => ({ "X-Tenant-Id": tenantId });

export async function getDashboardDefinition(tenantId) {
  if (USE_MOCK) return getMockDashboardDefinition(tenantId);
  const response = await apiClient.get("/api/v1/dashboard/layout", { headers: headers(tenantId) });
  return unwrapData(response);
}

export async function saveDashboardDefinition(tenantId, definition) {
  if (USE_MOCK) return saveMockDashboardDefinition(tenantId, definition);
  const response = await apiClient.put("/api/v1/dashboard/layout", definition, { headers: headers(tenantId) });
  return unwrapData(response);
}

export async function getDashboardWidgetData(tenantId) {
  if (USE_MOCK) return getMockDashboardWidgetData(tenantId);
  const response = await apiClient.get("/api/v1/dashboard/widget-data", { headers: headers(tenantId) });
  return unwrapData(response);
}
