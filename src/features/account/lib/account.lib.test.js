import test from "node:test";
import assert from "node:assert/strict";
import { accountDisplayName, accountInitials, accountMemberships, roleLabel } from "./account.lib.js";

test("initials come from the name, else the email, else a placeholder", () => {
  assert.equal(accountInitials({ firstName: "jane", lastName: "doe" }), "JD");
  assert.equal(accountInitials({ firstName: "Jane" }), "J");
  assert.equal(accountInitials({ email: "ops@example.com" }), "O");
  assert.equal(accountInitials({}), "?");
});

test("display name falls back to the email", () => {
  assert.equal(accountDisplayName({ firstName: "Jane", lastName: " Doe " }), "Jane Doe");
  assert.equal(accountDisplayName({ email: "ops@example.com" }), "ops@example.com");
  assert.equal(accountDisplayName(), "Your account");
});

test("role codes become readable labels", () => {
  assert.equal(roleLabel("TENANT_PARTNERSHIP_MANAGER"), "Tenant Partnership Manager");
  assert.equal(roleLabel("ECO_ADMIN"), "Eco Admin");
  assert.equal(roleLabel(""), "—");
});

test("the active tenant's membership is flagged and listed first", () => {
  const rows = accountMemberships([
    { tenantId: "a", tenantName: "Alpha", roles: [{ code: "TENANT_ADMIN", name: "" }] },
    { tenantId: "b", tenantName: "", roles: [{ code: "X", name: "Custom role" }] },
  ], "b");
  assert.deepEqual(rows.map((r) => [r.tenantId, r.tenantName, r.current]), [["b", "b", true], ["a", "Alpha", false]]);
  assert.deepEqual(rows[0].roles, ["Custom role"]);
  assert.deepEqual(rows[1].roles, ["Tenant Admin"]);
  assert.deepEqual(accountMemberships(null, "a"), []);
});
