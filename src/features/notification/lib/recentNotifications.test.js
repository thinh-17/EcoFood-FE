import test from "node:test";
import assert from "node:assert/strict";
import { recentNotifications } from "./recentNotifications.js";

test("popup shows ten recent deliveries without mutating cached API rows", () => {
  const rows = Array.from({ length: 15 }, (_, id) => ({ id, createdAt: new Date(2026, 0, id + 1).toISOString() }));
  const result = recentNotifications(rows);
  assert.equal(result.length, 10);
  assert.equal(result[0].id, 14);
  assert.equal(result[9].id, 5);
  assert.equal(rows[0].id, 0);
});
test("popup retains server order for undated rows and handles empty history", () => {
  const rows = [{ id: "pending" }, { id: "processing" }];
  assert.deepEqual(recentNotifications(rows), rows);
  assert.deepEqual(recentNotifications(), []);
  assert.equal(recentNotifications([{ id: "sent", sentAt: "2026-11-27T00:00:00Z" }, ...rows])[0].id, "sent");
});
