export function canAccessManager(roles = []) {
  return roles.some((role) => typeof role === "string" && /(?:admin|dashboard_manager)$/i.test(role));
}
