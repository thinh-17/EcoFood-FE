import test from "node:test";
import assert from "node:assert/strict";
import { canReadInvoices, invoiceLines, invoiceMoney, invoiceDate, invoiceError } from "./invoice.lib.js";

test("Invoice list requires explicit read permission", () => {
  assert.equal(canReadInvoices({ permissions: ["TRANSACTION_READ"] }), true);
  assert.equal(canReadInvoices({ roles: ["TENANT_ADMIN"], permissions: ["TRANSACTION_SUBMIT"] }), false);
  assert.equal(canReadInvoices({ permissions: "TRANSACTION_READ" }), false);
  assert.equal(canReadInvoices(), false);
});

test("Batch details read Plan lines while older invoices still read product items", () => {
  const line = { lineId: "item-0", planId: "plan", planName: "Lunch", quantity: 2,
    unitPrice: "50000", amount: "100000", snapshot: { internal: "not displayed" } };
  const legacy = { productCode: "P1", productName: "Coffee", quantity: 1, unitPrice: 10, amount: 10 };
  assert.deepEqual(invoiceLines({ planLines: [line], items: [legacy] }), [
    { id: "item-0", name: "Lunch", quantity: 2, unitPrice: "50000", amount: "100000" },
  ]);
  assert.deepEqual(invoiceLines({ planLines: [], items: [legacy] }), [
    { id: "0", name: "Coffee", quantity: 1, unitPrice: 10, amount: 10 },
  ]);
  assert.deepEqual(invoiceLines({}), []);
});

test("Missing dates and amounts stay distinct from real zero", () => {
  assert.equal(invoiceDate(null), "—");
  assert.equal(invoiceDate("invalid"), "—");
  assert.equal(invoiceMoney(null, "USD"), "—");
  assert.equal(invoiceMoney("100", null), "—");
  assert.notEqual(invoiceMoney("0", "USD"), "—");
  assert.match(invoiceMoney("100000", "VND"), /100\.000/);
});

test("Permission and tenant failures get clear messages", () => {
  assert.match(invoiceError({ response: { status: 401 } }), /đăng nhập/);
  assert.match(invoiceError({ response: { status: 403 } }), /quyền/);
  assert.match(invoiceError({ response: { status: 404 } }), /tenant hiện tại/);
});
