export const KPI_NAMES = {
  totalSalesVolume: "Successful sales plans", profit: "Profit", platformCost: "Platform cost",
};
export function canReadBusinessDashboard(claims = {}) { return Array.isArray(claims.permissions) && claims.permissions.includes("DASHBOARD_READ"); }
export function dashboardDefaults(options) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "numeric" }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year").value), month = Number(parts.find((p) => p.type === "month").value);
  return { tenantId: options.currentTenantId, propositionId: "", currency: options.currencies[0] || "", year, period: "QUARTERLY", month, quarter: Math.ceil(month / 3) };
}
export function dashboardParams(filters) {
  return { tenantId: filters.tenantId === "__TOTAL__" ? undefined : filters.tenantId,
    propositionTotal: filters.tenantId === "__TOTAL__", propositionId: filters.propositionId || undefined,
    currency: filters.currency, year: Number(filters.year), period: filters.period,
    month: filters.period === "MONTHLY" ? Number(filters.month) : undefined,
    quarter: filters.period === "QUARTERLY" ? Number(filters.quarter) : undefined };
}
export function formatDashboardValue(value, unit) {
  if (value == null) return "Insufficient data";
  const options = unit === "PLAN" ? { maximumFractionDigits: 4 } : { style: "currency", currency: unit };
  return new Intl.NumberFormat("en-US", options).format(value);
}
export function expectedLabel(metric) {
  if (metric?.expected != null) return formatDashboardValue(metric.expected, metric.unit);
  if (metric?.expectedStatus === "OVERLAPPING_PERIODS") return "Overlapping expected periods";
  if (metric?.expectedStatus === "CURRENCY_UNVERIFIED") return "Expected currency is unverified";
  if (metric?.expectedStatus === "CURRENCY_MISMATCH") return "Expected currency mismatch";
  return "Expected values are not fully configured";
}
export function periodLabel(selection) {
  return selection.period === "MONTHLY" ? `Month ${selection.month}/${selection.year}` : selection.period === "QUARTERLY" ? `Quarter ${selection.quarter}/${selection.year}` : String(selection.year);
}
export function dashboardError(error) { return error?.response?.data?.message || error?.message || "Unable to load the dashboard"; }
export function dashboardChartValue(value) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
