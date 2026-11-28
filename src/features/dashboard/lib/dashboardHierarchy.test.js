import test from "node:test";
import assert from "node:assert/strict";
import { dashboardDefaults, dashboardParams } from "./businessDashboard.js";

test("selects the current Enterprise aggregate including authorized descendants", () => {
  const filters = dashboardDefaults({ currentTenantId: "enterprise", tenants: [
    { id: "enterprise", accessible: true, scopeTenantIds: ["regional", "brand"] },
    { id: "regional", accessible: true, scopeTenantIds: ["regional", "brand"] },
    { id: "brand", accessible: true, scopeTenantIds: ["brand"] },
    { id: "denied", accessible: false, scopeTenantIds: [] },
  ], currencies: ["USD"] });
  assert.deepEqual(filters.tenantIds, ["enterprise"]);
  assert.equal(dashboardParams(filters).tenantIds, "enterprise");
});
