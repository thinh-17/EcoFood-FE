import test from "node:test";
import assert from "node:assert/strict";
import { ENTITY_TYPE_OPTIONS, ruleEntityTypes } from "./entityTypes.js";
test("options contain only the three independent dashboards", () => {
  assert.deepEqual(ENTITY_TYPE_OPTIONS.map((o) => o.value), ["BUSINESS_DASHBOARD", "INVOICE_DASHBOARD", "CUSTOMER_DASHBOARD"]);
});
test("legacy All Dashboards and single rules remain editable", () => {
  assert.equal(ruleEntityTypes({ accessEntityType: "ALL_DASHBOARDS" }).length, 3);
  assert.deepEqual(ruleEntityTypes({ accessEntityType: "INVOICE_DASHBOARD" }), ["INVOICE_DASHBOARD"]);
});
test("explicit selections override stale legacy All Dashboards", () => {
  assert.deepEqual(ruleEntityTypes({ accessEntityType: "ALL_DASHBOARDS", accessEntityTypes: ["BUSINESS_DASHBOARD"] }), ["BUSINESS_DASHBOARD"]);
  assert.deepEqual(ruleEntityTypes({ accessEntityType: "ALL_DASHBOARDS", accessEntityTypes: [] }), []);
  assert.deepEqual(ruleEntityTypes({ accessEntityTypes: ["BUSINESS_DASHBOARD", "BUSINESS_DASHBOARD", "Product"] }), ["BUSINESS_DASHBOARD"]);
});
