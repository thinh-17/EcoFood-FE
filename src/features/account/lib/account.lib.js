// Presentation helpers for the read-only Account page.

/** Up to two initials for the avatar: first + last name, else the email's first letter. */
export function accountInitials({ firstName, lastName, email } = {}) {
  const fromName = [firstName, lastName]
    .map((part) => part?.trim()?.[0])
    .filter(Boolean)
    .join("");
  return (fromName || email?.trim()?.[0] || "?").toUpperCase();
}

/** "Jane Doe", falling back to the email (or "Your account") when no name is set. */
export function accountDisplayName({ firstName, lastName, email } = {}) {
  const name = [firstName, lastName].map((part) => part?.trim()).filter(Boolean).join(" ");
  return name || email || "Your account";
}

/** TENANT_PARTNERSHIP_MANAGER → "Tenant Partnership Manager". */
export function roleLabel(code) {
  if (!code) return "—";
  return code
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The user's tenant memberships (UserDetailResponse.tenantAssignments) with
 * the one matching the active token's tenantId flagged and listed first.
 */
export function accountMemberships(assignments, activeTenantId) {
  return (assignments ?? [])
    .map((assignment) => ({
      tenantId: assignment.tenantId,
      tenantName: assignment.tenantName || assignment.tenantId,
      roles: (assignment.roles ?? []).map((role) => role.name || roleLabel(role.code)),
      current: assignment.tenantId === activeTenantId,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current));
}
