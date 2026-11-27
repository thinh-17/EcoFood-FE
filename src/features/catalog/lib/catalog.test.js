import test from "node:test";
import assert from "node:assert/strict";
import { catalogAccess, catalogActions, newCatalogDraft, catalogError } from "./catalog.js";
import { filterNavItems } from "../../../app/navigation/navAccess.js";
test("Catalog visibility follows Employee roles and administrators have default actions", () => {
  assert.equal(catalogAccess({ roles: ["TENANT_EMPLOYEE"], permissions: ["CATALOG_API_READ", "CATALOG_API_MANAGE"] }).manage, true);
  assert.equal(catalogAccess({ roles: ["ECO_ADMIN"], permissions: ["CATALOG_API_READ"] }).read, false);
  for (const prefix of ["TENANT", "MASTER", "ENTERPRISE"]) {
    assert.deepEqual(catalogAccess({ roles: [`${prefix}_ADMIN`], permissions: [] }), { read: true, manage: true, publish: true, grant: true });
    assert.deepEqual(catalogAccess({ roles: [`${prefix}_EMPLOYEE`], permissions: [] }), { read: true, manage: false, publish: false, grant: false });
    assert.equal(catalogAccess({ roles: [`${prefix}_PRODUCT_MANAGER`] }).read, true);
  }
  assert.equal(catalogAccess({ roles: ["CUSTOMER"], permissions: ["CATALOG_API_READ"] }).read, false);
});
test("Publication actions follow lifecycle and separate Publish/Grant permissions", () => {
  const rights = { manage: true, publish: true, grant: false };
  assert.equal(catalogActions("DRAFT", rights).publish, false); assert.equal(catalogActions("VALIDATED", rights).publish, true);
  assert.equal(catalogActions("PUBLISHED", rights).edit, false); assert.equal(catalogActions("PUBLISHED", rights).grant, false);
  assert.equal(catalogActions("RETIRED", rights).retire, false);
});
test("Version draft keeps source selections but never copies credentials, grants or audit", () => {
  const draft = newCatalogDraft({ apiKey: "food", version: 4, name: "Food", catalogType: "PRICE", selections: [{ planId: "p" }], partnerIds: ["partner"], grants: [{ credential: "secret" }], audit: [{}] });
  assert.equal(draft.version, 5); assert.equal(draft.selections[0].planId, "p"); assert.equal(draft.grants, undefined); assert.equal(draft.audit, undefined);
});
test("Navigation and errors reflect permission without changing unrelated entries", () => {
  const items = [{ id: "catalog-publications" }, { id: "home" }];
  assert.equal(filterNavItems(items, ["TENANT_EMPLOYEE"], ["CATALOG_API_READ"]).length, 2);
  assert.equal(filterNavItems(items, ["TENANT_EMPLOYEE"], []).length, 2);
  assert.match(catalogError({ response: { status: 403 } }), /access/);
});
