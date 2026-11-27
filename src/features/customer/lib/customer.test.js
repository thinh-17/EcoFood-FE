import test from "node:test";
import assert from "node:assert/strict";
import { receiptToken, validateCustomerFlow, customerInvoicePath, customerMoney, customerProfilePayload, customerNavigation, customerSection } from "./customer.lib.js";

test("Customer navigation offers profile and care without a receipt scanning tab", () => {
  assert.deepEqual(customerNavigation.map((item) => item.path), ["/customer", "/customer/profile", "/customer/complaints"]);
  assert.equal(customerSection("/customer/invoices/invoice-1"), "history");
  assert.equal(customerSection("/customer/profile"), "profile");
  assert.equal(customerSection("/customer/complaints"), "care");
});

test("Profile updates trim names and never submit email or identity fields", () => {
  assert.deepEqual(customerProfilePayload({ firstName: " An ", lastName: " Nguyen ", email: "changed@example.com", username: "changed", tenantId: "other" },
    { revision: 0, email: "verified@example.com" }), { firstName: "An", lastName: "Nguyen", revision: 0 });
  assert.throws(() => customerProfilePayload({ firstName: " ", lastName: "Nguyen" }, { revision: 0 }), /required/);
  assert.throws(() => customerProfilePayload({ firstName: "a".repeat(101), lastName: "Nguyen" }, { revision: 0 }), /100/);
  assert.throws(() => customerProfilePayload({ firstName: "An", lastName: "Nguyen" }, {}), /Reload/);
});

test("receipt fragment requires an actual capability, never an Invoice ID or number", () => {
  assert.equal(receiptToken("#token=" + "t".repeat(43)), "t".repeat(43));
  assert.equal(receiptToken("#token=INV-001"), ""); assert.equal(receiptToken("#invoiceId=123"), "");
});
test("Customer OAuth requires matching state, tenant config and a short lived PKCE session", () => {
  const flow = { state: "random", startedAt: 1000, codeVerifier: "secret", config: { tenantId: "t", realm: "realm", clientId: "client" } };
  assert.equal(validateCustomerFlow(flow, "random", 2000), true);
  assert.equal(validateCustomerFlow(flow, "wrong", 2000), false); assert.equal(validateCustomerFlow(flow, "random", 1000000), false);
  assert.equal(validateCustomerFlow({ ...flow, codeVerifier: "" }, "random", 2000), false);
});
test("Email links lead to authenticated owner routes with encoded identifiers", () => {
  assert.equal(customerInvoicePath("invoice", "tenant"), "/customer/invoices/invoice?tenant=tenant");
  assert.equal(customerInvoicePath("x/y", "a&b"), "/customer/invoices/x%2Fy?tenant=a%26b");
  assert.match(customerMoney("20", "USD"), /US\$/);
});
