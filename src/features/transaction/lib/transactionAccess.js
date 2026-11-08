const READ_LEVELS = new Set(["SYSTEM", "ENTERPRISE", "MASTER_TENANT", "TENANT"]);

export function transactionAccess(claims = {}) {
  const permissions = Array.isArray(claims.permissions) ? claims.permissions : [];
  const groups = Array.isArray(claims.roleGroups) ? claims.roleGroups : [];
  const identity = Boolean(claims.sub && claims.tenantId);
  return {
    canRead: identity && permissions.includes("TRANSACTION_READ") && groups.some((group) => READ_LEVELS.has(group)),
    canSubmit: identity && permissions.includes("TRANSACTION_SUBMIT"),
    cacheKey: JSON.stringify([claims.sub, claims.tenantId, [...permissions].sort(), [...groups].sort()]),
  };
}
