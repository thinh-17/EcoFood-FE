export function canUseNotificationRole(roles) {
  return Array.isArray(roles) && roles.some((role) => ["TENANT_ADMIN", "MASTER_ADMIN", "ENTERPRISE_ADMIN", "ECO_ADMIN"].includes(role));
}
export function notificationAccess(claims = {}) {
  const admin = canUseNotificationRole(claims.roles);
  const permissions = Array.isArray(claims.permissions) ? claims.permissions : [];
  return {
    read: admin && permissions.includes("NOTIFICATION_READ"),
    manage: admin && permissions.includes("NOTIFICATION_RULE_MANAGE"),
    retry: admin && permissions.includes("NOTIFICATION_READ") && permissions.includes("NOTIFICATION_RETRY"),
  };
}
export const emptyRule = () => ({ name: "", eventType: "INVOICE_PAID", enabled: false, revision: 0,
  subject: "Xác nhận giao dịch {invoiceNumber}", content: "Giao dịch {invoiceNumber} đã được ghi nhận.\nPlan: {planId}\nAmount: {totalAmount} {currency}",
  recipients: { userIds: [], roles: [], permissions: [], emails: [], invoiceCustomer: false } });
export function notificationError(error) {
  return error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Không thể xử lý yêu cầu";
}
export function historyParams(filters, page) {
  const result = { page, size: 20, event: filters.event || undefined, status: filters.status || undefined };
  if (filters.from) result.from = new Date(filters.from).toISOString();
  if (filters.to) result.to = new Date(filters.to).toISOString();
  return result;
}
