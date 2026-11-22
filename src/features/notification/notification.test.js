import test from "node:test";
import assert from "node:assert/strict";
import { notificationAccess, emptyRule, historyParams } from "./notification.js";
import { filterNavItems } from "../../app/navigation/navAccess.js";

test("Tenant Admin and Eco Admin require specific permissions for feature actions", () => {
  assert.deepEqual(notificationAccess({ roles: ["TENANT_ADMIN"], permissions: ["NOTIFICATION_READ"] }), { read: true, manage: false, retry: false });
  assert.equal(notificationAccess({ roles: ["ECO_ADMIN"], permissions: ["NOTIFICATION_RULE_MANAGE"] }).manage, true);
  assert.deepEqual(notificationAccess({ roles: ["ECO_ADMIN"] }), { read: false, manage: false, retry: false });
  assert.equal(notificationAccess({ roles: ["ECO_ADMIN"], permissions: ["NOTIFICATION_READ", "NOTIFICATION_RETRY"] }).retry, true);
  assert.equal(notificationAccess({ roles: ["ENTERPRISE_ADMIN"], permissions: ["NOTIFICATION_RULE_MANAGE"] }).manage, true);
  assert.equal(notificationAccess({ roles: ["TENANT_ADMIN"], permissions: ["NOTIFICATION_READ", "NOTIFICATION_RETRY"] }).retry, true);
  assert.equal(notificationAccess({ roles: ["TENANT_ADMIN"] }).read, false);
});
test("navigation addition does not expose notifications to other roles", () => {
  const entries = [{ id: "home" }, { id: "notifications" }];
  assert.equal(filterNavItems(entries, ["TENANT_ADMIN"]).length, 2);
  assert.equal(filterNavItems(entries, ["ECO_ADMIN"]).length, 2);
  assert.equal(filterNavItems(entries, ["ENTERPRISE_ADMIN"]).length, 2);
  assert.equal(filterNavItems(entries, ["MASTER_ADMIN"]).length, 2);
  assert.equal(filterNavItems(entries, ["TENANT_EMPLOYEE"]).length, 1);
});
test("rule defaults are disabled and never guess customer or recipient", () => {
  const one = emptyRule(), two = emptyRule(); one.recipients.emails.push("x@example.org");
  assert.deepEqual(two.recipients.emails, []); assert.equal(two.enabled, false); assert.equal(two.recipients.invoiceCustomer, false);
});
test("history sends explicit filter instants and bounded pagination", () => {
  assert.deepEqual(historyParams({ event: "INVOICE_PAID", status: "FAILED", from: "2026-12-01T00:00:00+07:00", to: "" }, 2), {
    page: 2, size: 20, event: "INVOICE_PAID", status: "FAILED", from: "2026-11-30T17:00:00.000Z",
  });
});
