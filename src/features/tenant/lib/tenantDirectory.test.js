import test from "node:test";
import assert from "node:assert/strict";
import { tenantBelongsTo } from "./tenantDirectory.js";

test("a sub-tenant belongs to its master tenant", () => {
  assert.deepEqual(
    tenantBelongsTo({ parentTenantId: "e1", parentTenantName: "Acme", parentRelation: "SUB_TENANT" }),
    { name: "Acme", relation: "Sub-tenant" },
  );
});

test("a regional enterprise belongs to its owning enterprise", () => {
  assert.deepEqual(
    tenantBelongsTo({ parentTenantId: "e1", parentTenantName: "Acme", parentRelation: "REGIONAL_ENTERPRISE" }),
    { name: "Acme", relation: "Regional enterprise" },
  );
});

test("top-level tenants have no parent; a missing name falls back to the id", () => {
  assert.equal(tenantBelongsTo({ tenantName: "Acme" }), null);
  assert.equal(tenantBelongsTo(null), null);
  assert.deepEqual(tenantBelongsTo({ parentTenantId: "e1" }), { name: "e1", relation: null });
});
