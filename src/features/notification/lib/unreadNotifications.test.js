import test from "node:test";
import assert from "node:assert/strict";
import { unreadBadge } from "./unreadNotifications.js";

test("bell badge hides zero and caps counts strictly above 99", () => {
  assert.equal(unreadBadge(0), "");
  assert.equal(unreadBadge(1), "1");
  assert.equal(unreadBadge(98), "98");
  assert.equal(unreadBadge(99), "99");
  assert.equal(unreadBadge(100), "99+");
  assert.equal(unreadBadge(1000), "99+");
});
test("missing or invalid counts never render an unread badge", () => {
  for (const value of [undefined, null, NaN, Infinity, -1]) assert.equal(unreadBadge(value), "");
});
