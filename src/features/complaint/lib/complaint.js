export const complaintStatuses = ["SUBMITTED", "IN_PROGRESS", "WAITING_REPORTER", "RESOLVED", "CLOSED"];
export const complaintTypes = [
  { value: "ECOSYSTEM", label: "App Platform" },
  { value: "TENANT", label: "Service" },
];
export const complaintTypeLabel = (type) => complaintTypes.find((item) => item.value === type)?.label ?? type;
export function complaintAccess(claims = {}) {
  const roles = claims.roles || [], permissions = claims.permissions || [];
  const admin = roles.includes("TENANT_ADMIN") || roles.includes("ECO_ADMIN");
  const handler = admin || (roles.length > 0 && !roles.includes("CUSTOMER") && permissions.includes("COMPLAINT_MANAGE"));
  return { read: handler && permissions.includes("COMPLAINT_READ"), manage: handler && permissions.includes("COMPLAINT_READ") && permissions.includes("COMPLAINT_MANAGE"), assign: admin && permissions.includes("COMPLAINT_ASSIGN") };
}
export function complaintTransitions(status) {
  return { IN_PROGRESS: ["WAITING_REPORTER", "RESOLVED"], WAITING_REPORTER: ["IN_PROGRESS"], RESOLVED: ["CLOSED"] }[status] || [];
}
export function complaintError(error) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;
  if (status === 409 && message === "Complaint storage constraint conflict; check complaint collection indexes") return "A database constraint prevented this complaint. Please contact support.";
  if (status === 409 && message === "requestId was already used for a different complaint; start a new complaint") return "This request ID was already used for different details. Start a new complaint.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have access to this workspace.";
  if (status === 404) return "The complaint or invoice is unavailable in your workspace.";
  if (status === 409) return "The record has changed or the action is unavailable. Refresh before continuing.";
  if (status === 429) return "You have reached the limit of 3 active complaints. You can submit another once a complaint is resolved or closed.";
  if (status === 400) return "Invalid complaint details. Check the required fields and selected invoice.";
  return "Unable to process the request. Please try again.";
}
