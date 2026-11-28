import test from "node:test";
import assert from "node:assert/strict";
import { managerTabs, resolveManagerTab } from "./manager.lib.js";

test("only existing Manager tabs resolve; the removed customers tab does not", () => {
  const tabs = managerTabs({ roles: ["TENANT_ADMIN"] });
  assert.equal(resolveManagerTab(tabs, null), "dashboard");
  assert.equal(resolveManagerTab(tabs, ""), "dashboard");
  assert.equal(resolveManagerTab(tabs, "dashboard"), "dashboard");
  assert.equal(resolveManagerTab(tabs, "invoices"), "invoices");
  assert.equal(resolveManagerTab(tabs, "customers"), null);
  assert.equal(resolveManagerTab([], null), null);
});
import { filterNavItems } from "../../../app/navigation/navAccess.js";

test("Manager keeps main tab UI while roles control visibility independently of DAR", () => {
  assert.deepEqual(managerTabs({ roles: ["TENANT_ADMIN"] }).map((tab) => tab.id), ["dashboard", "invoices"]);
  assert.deepEqual(managerTabs({ roles: ["REGIONAL_DASHBOARD_MANAGER"] }).map((tab) => tab.id), ["dashboard", "invoices"]);
  assert.deepEqual(managerTabs({ permissions: ["DASHBOARD_READ", "TRANSACTION_READ"] }), []);
  assert.deepEqual(managerTabs({ permissions: ["TRANSACTION_SUBMIT"] }), []);
  assert.deepEqual(managerTabs({ permissions: "TRANSACTION_READ" }), []);
});

test("Manager navigation preserves role checks after restoring upstream UI", () => {
  const navigation = [{ id: "manager" }, { id: "business-dashboard" }];
  assert.deepEqual(filterNavItems(navigation, [], ["TRANSACTION_READ"]), []);
  assert.deepEqual(filterNavItems(navigation, [], []), []);
  assert.deepEqual(filterNavItems(navigation, ["TENANT_ADMIN"], []), navigation);
});
