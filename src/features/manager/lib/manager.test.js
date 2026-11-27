import test from "node:test";
import assert from "node:assert/strict";
import { managerTabs } from "./manager.lib.js";
import { filterNavItems } from "../../../app/navigation/navAccess.js";

test("Manager exposes Dashboard and Invoice independently by permission", () => {
  assert.deepEqual(managerTabs({ permissions: ["DASHBOARD_READ", "TRANSACTION_READ"] }).map((tab) => tab.id), ["dashboard", "invoices"]);
  assert.deepEqual(managerTabs({ permissions: ["TRANSACTION_READ"] }).map((tab) => tab.id), ["invoices"]);
  assert.deepEqual(managerTabs({ permissions: ["DASHBOARD_READ"] }).map((tab) => tab.id), ["dashboard"]);
  assert.deepEqual(managerTabs({ permissions: ["TRANSACTION_SUBMIT"] }), []);
  assert.deepEqual(managerTabs({ permissions: "TRANSACTION_READ" }), []);
});

test("Invoice readers can reach Manager without receiving Dashboard access", () => {
  const navigation = [{ id: "manager" }, { id: "business-dashboard" }];
  assert.deepEqual(filterNavItems(navigation, [], ["TRANSACTION_READ"]), [{ id: "manager" }]);
  assert.deepEqual(filterNavItems(navigation, [], []), []);
  assert.deepEqual(filterNavItems(navigation, [], ["DASHBOARD_READ"]), navigation);
});
