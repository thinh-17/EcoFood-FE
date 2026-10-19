// Resolves the "domain" identifier the backend's GET /api/v1/tenants/
// login-info uses to pick a tenant's realm/clientId — mirrors DCMP's real
// DCMPLoginService.getDomain():
//  - already-authenticated: trust the tenant domain the session was minted
//    for, not whatever the browser happens to be on right now.
//  - localhost (or any dev build): a single configured stand-in domain,
//    swapped by editing VITE_DEV_TENANT_DOMAIN to test a different tenant
//    locally — same trick DCMP's own hardcoded localhostDomain constant
//    uses, just env-configurable instead of a source edit.
//  - anything else (a real deployment): the actual hostname the app is
//    served from.
export function resolveLoginDomain(currentTenantDomain) {
  if (currentTenantDomain) {
    return currentTenantDomain;
  }

  const hostname = window.location.hostname;
  const isLocalDev = hostname === "localhost" || hostname === "127.0.0.1" || import.meta.env.DEV;

  if (isLocalDev) {
    const devDomain = import.meta.env.VITE_DEV_TENANT_DOMAIN;
    if (!devDomain) {
      throw new Error(
        "VITE_DEV_TENANT_DOMAIN is not set — required to resolve a tenant while running locally."
      );
    }
    return devDomain;
  }

  return hostname;
}
