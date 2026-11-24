import test from "node:test";
import assert from "node:assert/strict";
import { canReadAudit } from "./auditAccess.js";

test("only the four tenant admin roles with the read permission can see Audit Log", () => {
  for (const role of ["TENANT_ADMIN", "MASTER_ADMIN", "ENTERPRISE_ADMIN", "ECO_ADMIN"]) {
    assert.equal(canReadAudit([role], ["AUDIT_LOG_READ"]), true);
    assert.equal(canReadAudit([role], []), false);
  }
  for (const role of ["CUSTOMER", "TENANT_EMPLOYEE"]) {
    assert.equal(canReadAudit([role], ["AUDIT_LOG_READ"]), false);
  }
});
