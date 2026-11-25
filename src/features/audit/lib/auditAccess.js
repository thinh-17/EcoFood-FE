const adminRoles = ["TENANT_ADMIN", "MASTER_ADMIN", "ENTERPRISE_ADMIN", "ECO_ADMIN"];

export function canReadAudit(roles = [], permissions = []) {
  return roles.some((role) => adminRoles.includes(role)) && permissions.includes("AUDIT_LOG_READ");
}
