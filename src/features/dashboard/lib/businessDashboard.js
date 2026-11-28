import { canAccessManager } from "./dashboardAccess.js";

export const KPI_NAMES = {
  revenue: "Actual Revenue", totalSalesVolume: "Total Sales Volume", profit: "Profit", platformCost: "Platform cost",
};
export function canReadBusinessDashboard(claims = {}) { return canAccessManager(claims.roles); }
export function dashboardDefaults(options) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "numeric" }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year").value), month = Number(parts.find((p) => p.type === "month").value);
  const accessible = options.tenants.filter((tenant) => tenant.accessible !== false);
  const current = accessible.find((tenant) => tenant.id === options.currentTenantId && tenant.scopeTenantIds?.length);
  const children = accessible.filter((tenant) => tenant.id !== options.currentTenantId);
  const tenantIds = (current ? [current] : children.length ? children : accessible).map((tenant) => tenant.id);
  return { tenantIds, propositionId: "", currency: options.currencies[0] || "", year, period: "QUARTERLY", month, quarter: Math.ceil(month / 3) };
}
export function dashboardParams(filters) {
  if (Array.isArray(filters.tenantIds)) return { tenantIds: [...new Set(filters.tenantIds)].sort().join(","),
    propositionId: filters.propositionId || undefined, currency: filters.currency, year: Number(filters.year), period: filters.period,
    quarter: filters.period === "QUARTERLY" ? Number(filters.quarter) : undefined };
  return { tenantId: filters.tenantId === "__TOTAL__" ? undefined : filters.tenantId,
    propositionTotal: filters.tenantId === "__TOTAL__", propositionId: filters.propositionId || undefined,
    currency: filters.currency, year: Number(filters.year), period: filters.period,
    month: filters.period === "MONTHLY" ? Number(filters.month) : undefined,
    quarter: filters.period === "QUARTERLY" ? Number(filters.quarter) : undefined };
}
export function formatDashboardValue(value, unit) {
  if (value == null) return "Chưa đủ dữ liệu";
  const options = unit === "PLAN" ? { maximumFractionDigits: 4 } : { style: "currency", currency: unit };
  return new Intl.NumberFormat("vi-VN", options).format(value);
}
export function expectedLabel(metric) {
  if (metric?.expected != null) return formatDashboardValue(metric.expected, metric.unit);
  if (metric?.expectedStatus === "OVERLAPPING_PERIODS") return "Kỳ vọng chồng kỳ";
  if (metric?.expectedStatus === "CURRENCY_UNVERIFIED") return "Chưa xác định Currency kỳ vọng";
  if (metric?.expectedStatus === "CURRENCY_MISMATCH") return "Khác Currency kỳ vọng";
  return "Chưa cấu hình đủ kỳ vọng";
}
export function periodLabel(selection) {
  return selection.period === "MONTHLY" ? `T${selection.month}/${selection.year}` : selection.period === "QUARTERLY" ? `Q${selection.quarter}/${selection.year}` : String(selection.year);
}
export function dashboardError(error) { return error?.response?.data?.message || error?.message || "Không tải được Dashboard"; }
export function dashboardChartValue(value) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
