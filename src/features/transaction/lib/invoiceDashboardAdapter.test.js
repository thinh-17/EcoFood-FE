import test from "node:test";
import assert from "node:assert/strict";
import { invoiceDetailView, invoicePropositions, invoiceTenantSelection } from "./invoiceDashboardAdapter.js";

test("tenant selections use one stable filter without duplicates", () => {
  assert.equal(invoiceTenantSelection(["regional", "enterprise", "regional"]), "enterprise,regional");
  assert.equal(invoiceTenantSelection([]), "");
});
test("DAR detail retains the invoice owner, tenant code and plan lines for the main modal", () => {
  const detail = { invoice: { id: "invoice", tenantId: "child", totalAmount: 100, currency: "USD" },
    tenantCode: "TE0060", receivedAt: "2026-11-28T00:00:00Z", planLines: [{ planName: "Lunch" }],
    propositions: [{ id: "p1", name: "Lunch proposition" }, { id: "p2", name: null }] };
  const view = invoiceDetailView(detail);
  assert.equal(view.tenantId, "child");
  assert.equal(view.tenantCode, "TE0060");
  assert.deepEqual(view.planLines, detail.planLines);
  assert.equal(invoicePropositions(view), "Lunch proposition (p1), p2");
  assert.equal(invoicePropositions({ propositionId: "legacy" }), "legacy");
});
