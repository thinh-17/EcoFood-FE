const parents = [
  ["/partner/tenants", "Back to tenants"],
  ["/product-library/products", "Back to products"],
  ["/users/data-access-rules", "Back to data access rules"],
  ["/users/permissions", "Back to permissions"],
  ["/users/roles", "Back to roles"],
  ["/users", "Back to users"],
];
export function backDestination(pathname, search = "") {
  if (parents.some(([path]) => pathname === path)) return null;
  const parent = parents.find(([path]) => pathname.startsWith(`${path}/`));
  if (parent) return { to: parent[0], label: parent[1] };
  if (pathname.startsWith("/customer/invoices/")) {
    const tenant = new URLSearchParams(search).get("tenant");
    return { to: `/customer${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ""}`, label: "Back to purchase history" };
  }
  return null;
}
