export const ROUTES = {
  HOME: "/",

  ACCOUNT: "/account",

  TENANT: "/partner/tenants",
  TENANT_DETAIL: "/partner/tenants/:id",
  TENANT_ONBOARDING: "/partner/tenants/onboarding",

  MANAGER: "/manager",
  PRODUCT_LIBRARY: "/product-library",
  PRODUCTS: "/product-library/products",
  PRODUCT_NEW: "/product-library/products/new",
  PRODUCT_DETAIL: "/product-library/products/:id",
  PROPOSITIONS: "/product-library/propositions",

  USERS: "/users",
  USER_DETAIL: "/users/:id",
  ROLES: "/users/roles",
  ROLE_DETAIL: "/users/roles/:id",
  PERMISSIONS: "/users/permissions",
  PERMISSION_DETAIL: "/users/permissions/:id",
  DATA_ACCESS_RULES: "/users/data-access-rules",
  DATA_ACCESS_RULE_NEW: "/users/data-access-rules/new",
  DATA_ACCESS_RULE_DETAIL: "/users/data-access-rules/:id",

  // Legacy URL: redirects to Manager
  DASHBOARD: "/dashboard",
};
