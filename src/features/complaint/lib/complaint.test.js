import test from "node:test";
import assert from "node:assert/strict";
import { complaintAccess, complaintTransitions, complaintError, complaintTypes, complaintTypeLabel } from "./complaint.js";
import { filterNavItems } from "../../../app/navigation/navAccess.js";

test("Complaint labels change without changing the backend type values", () => {
  assert.deepEqual(complaintTypes, [
    { value: "ECOSYSTEM", label: "App Platform" },
    { value: "TENANT", label: "Service" },
  ]);
  assert.equal(complaintTypeLabel("ECOSYSTEM"), "App Platform");
  assert.equal(complaintTypeLabel("TENANT"), "Service");
  assert.equal(complaintTypeLabel("OTHER"), "OTHER");
});

test("Complaint workspace requires Admin role plus read permission", () => {
  assert.equal(complaintAccess({ roles: ["TENANT_ADMIN"], permissions: ["COMPLAINT_READ"] }).read, true);
  assert.equal(complaintAccess({ roles: ["ECO_ADMIN"], permissions: ["COMPLAINT_READ", "COMPLAINT_MANAGE"] }).manage, true);
  assert.equal(complaintAccess({ roles: ["CUSTOMER"], permissions: ["COMPLAINT_READ"] }).read, false);
  assert.equal(complaintAccess({ roles: ["TENANT_ADMIN"] }).read, false);
  assert.equal(complaintAccess({ roles: ["TENANT_STAFF"], permissions: ["COMPLAINT_READ", "COMPLAINT_MANAGE"] }).read, true);
  assert.equal(complaintAccess({ roles: ["TENANT_STAFF"], permissions: ["COMPLAINT_READ", "COMPLAINT_MANAGE", "COMPLAINT_ASSIGN"] }).assign, false);
});
test("Complaint lifecycle excludes escalation, reopen and arbitrary closure", () => {
  assert.deepEqual(complaintTransitions("SUBMITTED"), []);
  assert.deepEqual(complaintTransitions("IN_PROGRESS"), ["WAITING_REPORTER", "RESOLVED"]);
  assert.deepEqual(complaintTransitions("WAITING_REPORTER"), ["IN_PROGRESS"]);
  assert.deepEqual(complaintTransitions("RESOLVED"), ["CLOSED"]);
  assert.deepEqual(complaintTransitions("CLOSED"), []);
});
test("Complaint navigation does not authorize Customers or users without permission", () => {
  const items = [{ id: "complaints", to: "/complaints" }, { id: "home" }];
  assert.equal(filterNavItems(items, ["TENANT_ADMIN"], ["COMPLAINT_READ"]).length, 2);
  assert.equal(filterNavItems(items, ["TENANT_ADMIN"], []).length, 1);
  assert.equal(filterNavItems(items, [], ["COMPLAINT_READ"]).length, 1);
});
test("Complaint errors distinguish authorization and missing scoped resources", () => {
  assert.match(complaintError({ response: { status: 403 } }), /access/);
  assert.match(complaintError({ response: { status: 404 } }), /unavailable/);
  assert.match(complaintError({ response: { status: 409 } }), /Refresh/);
  assert.match(complaintError({ response: { status: 429 } }), /limit of 3 active complaints/);
  assert.match(complaintError({ response: { status: 409, data: { message: "Complaint storage constraint conflict; check complaint collection indexes" } } }), /database constraint/);
});
