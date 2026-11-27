import test from "node:test";
import assert from "node:assert/strict";
import { navigationSections, activeNavigationPath } from "./navSections.js";
import { filterNavItems } from "./navAccess.js";

const source = [
  { id: "home", to: "/" }, { id: "manager", to: "/manager" }, { id: "complaints", to: "/complaints" },
  { id: "partner", children: [{ id: "tenant", to: "/partner/tenants" }, { id: "tenant-onboarding", to: "/partner/tenants/onboarding" }] },
  { id: "users-group", children: [{ id: "users", to: "/users" }, { id: "roles", to: "/users/roles" },
    { id: "permissions", to: "/users/permissions" }, { id: "data-access", to: "/users/data-access-rules" }] },
  { id: "audit-log", to: "/audit-log" }, { id: "catalog-publications" }, { id: "notifications" },
  { id: "product-library", children: [{ id: "products", to: "/product-library/products" }, { id: "propositions", to: "/product-library/propositions" }] },
];
test("section presentation preserves existing authorization and hides empty groups", () => {
  const sections = navigationSections(filterNavItems(source, ["TENANT_EMPLOYEE"], []));
  assert.deepEqual(sections.map((s) => s.id), ["overview"]);
  assert.deepEqual(sections[0].items.map((item) => item.id), ["home"]);
  const admin = navigationSections(filterNavItems(source, ["TENANT_ADMIN"], ["DASHBOARD_READ", "COMPLAINT_READ", "AUDIT_LOG_READ"]));
  const ids = admin.flatMap((section) => section.items.map((item) => item.id));
  assert.ok(ids.includes("manager") && ids.includes("data-access") && ids.includes("tenant"));
  assert.ok(ids.includes("products") && ids.includes("propositions"));
  for (const hidden of ["roles", "permissions", "tenant-onboarding", "catalog-publications", "notifications"]) assert.ok(!ids.includes(hidden));
});
test("nested detail pages activate only their most specific navigation item", () => {
  const links = source.flatMap((item) => item.children || [item]);
  assert.equal(activeNavigationPath("/users/roles/42", links), "/users/roles");
  assert.equal(activeNavigationPath("/users/data-access-rules/new", links), "/users/data-access-rules");
  assert.equal(activeNavigationPath("/partner/tenants/onboarding", links), "/partner/tenants/onboarding");
  assert.equal(activeNavigationPath("/partner/tenants/42", links), "/partner/tenants");
  assert.equal(activeNavigationPath("/users-unknown", links), undefined);
  assert.equal(activeNavigationPath("/", links), "/");
});
