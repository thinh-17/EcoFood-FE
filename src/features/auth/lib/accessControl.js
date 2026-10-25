// Role shape: ACTOR + SECTION, e.g. "MASTER_PARTNERSHIP_MANAGER" — see
// app/docs/ACL_ROLE_MODEL.md for the full design. Decoded straight off the
// internal access token's "roles" claim, never fetched separately.
const ROLE_ACTORS = ["ECO", "ENTERPRISE", "MASTER", "TENANT"];

// Splits a role code into its Actor/Section parts. "ECO_ADMIN" ->
// { actor: "ECO", section: "ADMIN" }. Returns null for an unrecognized code
// (e.g. "CUSTOMER", which isn't an actor+section role — see §1.4).
export function parseRole(code) {
  const actor = ROLE_ACTORS.find((candidate) => code.startsWith(`${candidate}_`));
  if (!actor) return null;
  return { actor, section: code.slice(actor.length + 1) };
}

// The current user's Role Actor (ECO/ENTERPRISE/MASTER/TENANT), or null if
// none of the role codes parse (e.g. no roles claim yet, or CUSTOMER).
export function getActor(roleCodes) {
  for (const code of roleCodes ?? []) {
    const parsed = parseRole(code);
    if (parsed) return parsed.actor;
  }
  return null;
}

// Partner tab: visible to _ADMIN/_PARTNERSHIP_MANAGER for every actor,
// including TENANT now (both TENANT_ADMIN and TENANT_PARTNERSHIP_MANAGER —
// a deliberate reversal of ACL_ROLE_MODEL.md §1.4/§3.1's original "TENANT
// never sees Partner" call), restricted for the TENANT actor to only the
// Tenant sub-tab — see canSeeTenantOnboarding.
export function canSeePartnerTab(roleCodes) {
  return (roleCodes ?? []).some((code) => {
    const parsed = parseRole(code);
    if (!parsed) return false;
    return parsed.section === "ADMIN" || parsed.section === "PARTNERSHIP_MANAGER";
  });
}

// The "Tenant Onboarding" sub-tab (and route): hidden from the TENANT actor
// entirely — TENANT_PARTNERSHIP_MANAGER's Partner-tab access is limited to
// the read-only Tenant directory, never onboarding (a sub-tenant still
// can't create new tenants, only view its own hierarchy).
export function canSeeTenantOnboarding(roleCodes) {
  return (roleCodes ?? []).some((code) => {
    const parsed = parseRole(code);
    return Boolean(parsed) && parsed.actor !== "TENANT";
  });
}

// Users tab: same gate as Partner — _ADMIN or _PARTNERSHIP_MANAGER, any
// actor (see ACL_ROLE_MODEL.md §3.2). Kept as its own named export (even
// though identical to canSeePartnerTab today) since the two tabs' rules are
// only coincidentally the same, not conceptually tied — don't assume one
// always implies the other if either changes later.
export function canSeeUsersTab(roleCodes) {
  return canSeePartnerTab(roleCodes);
}

// Data Access Rules sub-tab: _ADMIN-only, any actor. The "Users" sub-tab
// itself has no extra rule — anyone who passes canSeeUsersTab sees it.
export function canSeeDataAccessRulesSubTab(roleCodes) {
  return (roleCodes ?? []).some((code) => {
    const parsed = parseRole(code);
    return Boolean(parsed) && parsed.section === "ADMIN";
  });
}

// Roles/Permission sub-tabs: narrower than Data Access Rules — only the ECO
// actor, not any _ADMIN/_PARTNERSHIP_MANAGER (explicit instruction: only
// ECO_ADMIN or ECO_PARTNERSHIP_MANAGER). ENTERPRISE_ADMIN/MASTER_ADMIN/
// TENANT_ADMIN no longer see these two, even though they still see Data
// Access Rules and the rest of the Users tab.
export function canSeeRolesAndPermissionsSubTabs(roleCodes) {
  return (roleCodes ?? []).some((code) => {
    const parsed = parseRole(code);
    return (
      Boolean(parsed) &&
      parsed.actor === "ECO" &&
      (parsed.section === "ADMIN" || parsed.section === "PARTNERSHIP_MANAGER")
    );
  });
}
