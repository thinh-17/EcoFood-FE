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
export const notificationEvents = ["COMPLAINT_CREATED", "COMPLAINT_RESOLVED"];
export function notificationComplaintPath(notification) {
  if (!notificationEvents.includes(notification?.type) || typeof notification.complaintId !== "string" || !notification.complaintId.trim()) return null;
  return `/complaints?complaintId=${encodeURIComponent(notification.complaintId)}`;
}
export const emptyRule = () => ({ name: "", eventType: "COMPLAINT_CREATED", enabled: false, revision: 0,
  subject: "Complaint {complaintId}", content: "{complaintDescription}",
  recipients: { userIds: [], roles: [], permissions: [], emails: [], invoiceCustomer: false } });
export function notificationRuleForEvent(rule, eventType) {
  const resolved = eventType === "COMPLAINT_RESOLVED";
  return { ...rule, eventType,
    subject: resolved ? "Complaint {complaintId} resolved" : "Complaint {complaintId}",
    content: resolved ? "{resolution}" : "{complaintDescription}",
    recipients: { ...emptyRule().recipients, complaintCustomer: resolved },
  };
}
export function notificationError(error) {
  const status = error?.response?.status;
  return ({ 400: "Invalid notification settings. Check recipients and placeholders.",
    401: "Your session has expired. Please sign in again.",
    403: "You do not have permission to perform this action.",
    404: "The notification or rule is unavailable in this tenant.",
    409: "The record has changed. Refresh before continuing." })[status]
    || "Unable to process the request. Please try again.";
}
export function historyParams(filters, page) {
  const result = { page, size: 20, event: filters.event || undefined, status: filters.status || undefined };
  if (filters.from) result.from = new Date(filters.from).toISOString();
  if (filters.to) result.to = new Date(filters.to).toISOString();
  return result;
}
