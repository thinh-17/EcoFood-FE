export const CUSTOMER_FLOW_KEY = "ecofood_customer_oauth";
export const customerNavigation = [
  { id: "history", label: "Purchase History", path: "/customer" },
  { id: "profile", label: "Profile", path: "/customer/profile" },
  { id: "care", label: "Customer Care", path: "/customer/complaints" },
];

export function customerSection(pathname) {
  if (pathname === "/customer/profile") return "profile";
  if (pathname === "/customer/complaints") return "care";
  return "history";
}

export function customerProfilePayload(draft, profile) {
  const firstName = typeof draft.firstName === "string" ? draft.firstName.trim() : "";
  const lastName = typeof draft.lastName === "string" ? draft.lastName.trim() : "";
  if (!firstName || !lastName) throw new Error("First name and last name are required.");
  if (firstName.length > 100 || lastName.length > 100) throw new Error("Names must not exceed 100 characters.");
  if (!Number.isSafeInteger(profile.revision) || profile.revision < 0) throw new Error("Reload your profile before saving.");
  return { firstName, lastName, revision: profile.revision };
}
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
