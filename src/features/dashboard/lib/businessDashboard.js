export const KPI_NAMES = {
  totalSalesVolume: "Số Plan bán thành công", profit: "Lợi nhuận", ingredientCost: "Chi phí nguyên liệu", platformCost: "Chi phí nền tảng",
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
