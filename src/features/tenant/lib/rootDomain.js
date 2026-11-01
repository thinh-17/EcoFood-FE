// Derives the apex domain from the browser's own current host, so a
// subdomain input (e.g. the tenant onboarding form) can preview the full
// "<subdomain>.<rootDomain>" value without hardcoding any one environment's
// domain (ecofood.com in prod, localhost in local dev, etc).
export function getRootDomain() {
  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "localhost";
  }

  // Drops anything beyond the last two labels, so "gamma.ecofood.com" or
  // "admin.ecofood.com" both resolve to the same apex "ecofood.com".
  const labels = hostname.split(".");
  return labels.length > 2 ? labels.slice(-2).join(".") : hostname;
}
