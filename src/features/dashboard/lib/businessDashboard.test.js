import test from "node:test";
import assert from "node:assert/strict";
import { canReadBusinessDashboard, dashboardParams, formatDashboardValue, expectedLabel, periodLabel, dashboardChartValue } from "./businessDashboard.js";
import { filterNavItems } from "../../../app/navigation/navAccess.js";

test("business dashboard requires explicit permission before API queries", () => {
  assert.equal(canReadBusinessDashboard({ roles: ["ECO_ADMIN"] }), false);
  assert.equal(canReadBusinessDashboard({ permissions: ["DASHBOARD_READ"] }), true);
  const items = [{ id: "home" }, { id: "manager" }];
  assert.equal(filterNavItems(items, ["TENANT_ADMIN"]).length, 1);
  assert.equal(filterNavItems(items, [], ["DASHBOARD_READ"]).length, 2);
});
test("null is missing, real zero remains zero and profit can be negative", () => {
  assert.equal(formatDashboardValue(null, "USD"), "Insufficient data");
  assert.notEqual(formatDashboardValue("0", "USD"), "Insufficient data");
  assert.match(formatDashboardValue("-20.50", "USD"), /-/);
  assert.match(formatDashboardValue("10", "USD"), /US\$/);
  assert.match(formatDashboardValue("10", "VND"), /₫/);
  assert.equal(expectedLabel({ expected: null, expectedStatus: "OVERLAPPING_PERIODS" }), "Overlapping expected periods");
});
test("period and currency parameters retain selected scope without Plan inference", () => {
  const filters = { tenantId: "a", propositionId: "p", currency: "USD", year: 2026, period: "MONTHLY", month: 2, quarter: 1 };
  assert.deepEqual(dashboardParams(filters), { tenantId: "a", propositionTotal: false, propositionId: "p", currency: "USD", year: 2026, period: "MONTHLY", month: 2, quarter: undefined });
  const total = dashboardParams({ ...filters, tenantId: "__TOTAL__", period: "YEARLY" });
  assert.equal(total.tenantId, undefined); assert.equal(total.propositionTotal, true); assert.equal(total.month, undefined); assert.equal(total.quarter, undefined);
  assert.equal(periodLabel({ year: 2026, period: "QUARTERLY", quarter: 2 }), "Q2/2026");
});
test("charts leave missing/non-finite values absent instead of creating zero or Infinity", () => {
  assert.equal(dashboardChartValue(null), null); assert.equal(dashboardChartValue("0"), 0);
  assert.equal(dashboardChartValue("1E+600"), null); assert.equal(dashboardChartValue("-20.5"), -20.5);
});
