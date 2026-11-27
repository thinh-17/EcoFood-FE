import test from "node:test";
import assert from "node:assert/strict";
import { backDestination } from "./backDestination.js";

test("detail and create routes return to the corresponding tab, not arbitrary browser history", () => {
  assert.equal(backDestination("/product-library/products/new").to, "/product-library/products");
  assert.equal(backDestination("/partner/tenants/onboarding").to, "/partner/tenants");
  assert.equal(backDestination("/users/roles/role-1").to, "/users/roles");
  assert.equal(backDestination("/users/data-access-rules/new").to, "/users/data-access-rules");
  assert.equal(backDestination("/users/person-1").to, "/users");
  assert.equal(backDestination("/users/roles"), null);
  assert.equal(backDestination("/users"), null);
});
test("customer invoice back navigation retains the tenant context", () => {
  assert.deepEqual(backDestination("/customer/invoices/invoice-1", "?tenant=a%2Fb"), { to: "/customer?tenant=a%2Fb", label: "Back to purchase history" });
  assert.equal(backDestination("/customer/invoices/invoice-1").to, "/customer");
});
