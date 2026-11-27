import test from "node:test";
import assert from "node:assert/strict";
import { notificationAccess, notificationEvents, notificationComplaintPath, notificationRuleForEvent, notificationError, emptyRule, historyParams } from "./notification.js";
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
  assert.equal(two.eventType, "COMPLAINT_CREATED");
  assert.deepEqual(notificationEvents, ["COMPLAINT_CREATED", "COMPLAINT_RESOLVED"]);
});
test("switching complaint events clears unrelated recipients and chooses the reporter for resolution", () => {
  const rule = emptyRule(); rule.recipients.roles = ["TENANT_ADMIN"];
  const resolved = notificationRuleForEvent(rule, "COMPLAINT_RESOLVED");
  assert.deepEqual(resolved.recipients.roles, []);
  assert.equal(resolved.recipients.complaintCustomer, true);
  assert.equal(resolved.content, "{resolution}");
  const created = notificationRuleForEvent(resolved, "COMPLAINT_CREATED");
  assert.equal(created.recipients.complaintCustomer, false);
  assert.equal(created.content, "{complaintDescription}");
});
test("notification errors displayed by the UI use English", () => {
  assert.match(notificationError({ response: { status: 403 } }), /permission/);
  assert.match(notificationError({ response: { status: 409 } }), /Refresh/);
});
test("complaint notifications link to the referenced complaint rather than their submission or delivery", () => {
  assert.equal(notificationComplaintPath({ type: "COMPLAINT_CREATED", complaintId: "complaint-123", submissionId: "event-456", id: "delivery-789" }), "/complaints?complaintId=complaint-123");
  assert.equal(notificationComplaintPath({ type: "COMPLAINT_RESOLVED", complaintId: "a/b?x=1" }), "/complaints?complaintId=a%2Fb%3Fx%3D1");
  assert.equal(notificationComplaintPath({ type: "COMPLAINT_CREATED", submissionId: "event" }), null);
  assert.equal(notificationComplaintPath({ type: "SALE_BATCH_ACCEPTED", complaintId: "unrelated" }), null);
});
test("history sends explicit filter instants and bounded pagination", () => {
  assert.deepEqual(historyParams({ event: "COMPLAINT_CREATED", status: "FAILED", from: "2026-12-01T00:00:00+07:00", to: "" }, 2), {
    page: 2, size: 20, event: "COMPLAINT_CREATED", status: "FAILED", from: "2026-11-30T17:00:00.000Z",
  });
});
