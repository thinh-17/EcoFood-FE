export const CUSTOMER_FLOW_KEY = "ecofood_customer_oauth";
export function receiptToken(fragment) {
  const token = new URLSearchParams(fragment.replace(/^#/, "")).get("token") || "";
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : "";
}
export function customerInvoicePath(id, tenant) {
  return `/customer/invoices/${encodeURIComponent(id)}${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ""}`;
}
export function validateCustomerFlow(flow, state, now = Date.now()) {
  return !!flow && typeof state === "string" && state.length > 0 && state === flow.state
    && typeof flow.startedAt === "number" && now >= flow.startedAt && now - flow.startedAt <= 10 * 60 * 1000
    && !!flow.codeVerifier && !!flow.config?.tenantId && !!flow.config?.realm && !!flow.config?.clientId;
}
export function customerMoney(value, currency) { return value == null ? "Chưa xác định" : new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(value); }
export function customerError(error) { return error?.response?.data?.message || error?.message || "Không xử lý được yêu cầu"; }
