import test from "node:test";
import assert from "node:assert/strict";
import { customerComplaintRoot, customerComplaintUpdates } from "./customerComplaintUpdates.js";

test("customer feed maps actual team events, excluding customer actions and unknown events", () => {
  const updates = customerComplaintUpdates([{ id: "c1", subject: "Service issue", complaintType: "TENANT", events: [
    { id: "created", eventType: "CREATED" }, { id: "reply", eventType: "REPORTER_REPLIED" }, { id: "unknown", eventType: "UNKNOWN" },
    { id: "accept", eventType: "ACCEPTED", newStatus: "IN_PROGRESS", createdAt: "2026-11-27T01:00:00Z", note: "Assignee: UNASSIGNED -> handler-id\nWe are looking into this." },
  ] }]);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].title, "Complaint accepted");
  assert.equal(updates[0].team, "Service team");
  assert.equal(updates[0].note, "We are looking into this.");
  assert.equal(updates[0].status, "IN_PROGRESS");
});

test("platform updates are sorted by event time and preserve status at event time", () => {
  const events = [
    { id: "old", eventType: "ACCEPTED", newStatus: "IN_PROGRESS", createdAt: "2026-11-27T01:00:00Z" },
    { id: "new", eventType: "RESOLVED", newStatus: "RESOLVED", createdAt: "2026-11-27T02:00:00Z" },
    { id: "info", eventType: "STATUS_CHANGED", newStatus: "WAITING_REPORTER", createdAt: "2026-11-27T01:30:00Z" },
  ];
  const updates = customerComplaintUpdates([{ id: "c1", complaintType: "ECOSYSTEM", status: "RESOLVED", events }]);
  assert.deepEqual(updates.map(item => item.id), ["c1/new", "c1/info", "c1/old"]);
  assert.equal(updates[0].team, "EcoFood platform team");
  assert.equal(updates[1].title, "More information requested");
  assert.equal(updates[2].status, "IN_PROGRESS");
  assert.equal(events[0].id, "old");
});

test("customer query identity separates account and tenant caches", () => {
  assert.notDeepEqual(customerComplaintRoot("a", "tenant1"), customerComplaintRoot("b", "tenant1"));
  assert.notDeepEqual(customerComplaintRoot("a", "tenant1"), customerComplaintRoot("a", "tenant2"));
  assert.deepEqual(customerComplaintUpdates(), []);
});
