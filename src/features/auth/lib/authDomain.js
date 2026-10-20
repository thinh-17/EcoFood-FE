// Resolves which tenant domain to use: current session's, else the dev
// override for bare localhost, else the real host.
export function resolveLoginDomain(currentTenantDomain) {
  if (currentTenantDomain) {
    return currentTenantDomain;
  }

  const hostname = window.location.hostname;
  const isBareLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (isBareLocalhost) {
    const devDomain = import.meta.env.VITE_DEV_TENANT_DOMAIN;
    if (!devDomain) {
      throw new Error(
        "VITE_DEV_TENANT_DOMAIN is not set — required to resolve a tenant while running locally."
      );
    }
    return devDomain;
  }

  // host, not hostname — domainUrl includes the port (e.g. "x.localhost:5173").
  return window.location.host;
}
