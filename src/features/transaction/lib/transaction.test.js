import test from "node:test";
import assert from "node:assert/strict";
import { buildPosPayload, calculateCart } from "./posPayload.js";
import { buildTransactionFilters } from "./transactionFormat.js";
import { transactionAccess } from "./transactionAccess.js";

const line = { productCode: "P1", productName: "Milk", quantity: "2", unitPrice: "10000" };
const invoice = { invoiceNumber: "INV-TEST", transactionTime: "2026-01-01T00:00:00Z", currency: "VND", lines: [line] };
const identity = { sub: "user-a", tenantId: "tenant-a" };
const filters = { invoiceId: "", invoiceNumber: "", from: "", to: "", status: "" };

test("decimal amount and invoice total avoid binary floating point drift", () => {
  const cart = calculateCart([
    { ...line, quantity: "3", unitPrice: "0.1" },
    { ...line, quantity: "1.5", unitPrice: "0.2" },
  ]);
  assert.equal(cart.items[0].amount, 0.3);
  assert.equal(cart.items[1].amount, 0.3);
  assert.equal(cart.totalAmount, 0.6);
});

test("decimal rounding never silently corrupts high precision money", () => {
  assert.throws(() => calculateCart([{ ...line, quantity: "999999999999", unitPrice: "999999999999" }]), /chính xác/);
  assert.equal(calculateCart([{ ...line, quantity: "0.000001", unitPrice: "0.000001" }]).totalAmount, 0.000000000001);
});

test("payload only contains backend contract fields and keeps identity server-side", () => {
  const payload = buildPosPayload(invoice);
  assert.deepEqual(Object.keys(payload).sort(), ["currency", "invoiceNumber", "items", "totalAmount", "transactionTime"]);
  assert.equal(payload.totalAmount, 20000);
  assert.deepEqual(payload.items, [{ productCode: "P1", productName: "Milk", quantity: 2, unitPrice: 10000, amount: 20000 }]);
});

test("invalid test modes intentionally corrupt a fresh payload without changing source cart", () => {
  assert.equal(buildPosPayload(invoice, "wrong-total").totalAmount, 0);
  assert.equal(buildPosPayload(invoice, "zero-quantity").items[0].quantity, 0);
  assert.equal(buildPosPayload(invoice).items[0].quantity, 2);
  assert.equal(line.quantity, "2");
  assert.throws(() => buildPosPayload(invoice, "unknown"));
});

test("rejects empty cart, bad currency, future date and missing invoice number", () => {
  assert.throws(() => buildPosPayload({ ...invoice, lines: [] }));
  assert.throws(() => buildPosPayload({ ...invoice, currency: "vnd" }));
  assert.throws(() => buildPosPayload({ ...invoice, invoiceNumber: " " }));
  assert.throws(() => buildPosPayload({ ...invoice, transactionTime: "invalid" }));
  assert.throws(() => buildPosPayload({ ...invoice, transactionTime: new Date(Date.now() + 86400000).toISOString() }));
});

test("normal mode rejects zero/negative quantities, malformed prices and missing products", () => {
  for (const quantity of ["0", "-1", "abc", "1e3", "0.0000001"]) {
    assert.throws(() => calculateCart([{ ...line, quantity }]));
  }
  assert.throws(() => calculateCart([{ ...line, unitPrice: "-1" }]));
  assert.throws(() => calculateCart([{ ...line, productCode: "" }]));
  assert.equal(calculateCart([{ ...line, unitPrice: "0" }]).totalAmount, 0);
});

test("filters trim search and convert local dates to ISO without pagination", () => {
  assert.deepEqual(buildTransactionFilters({ ...filters, invoiceNumber: "  INV.*  ",
    from: "2026-11-01T00:00:00Z", to: "2026-11-02T00:00:00Z", status: "ACCEPTED" }), {
    invoiceNumber: "INV.*", from: "2026-11-01T00:00:00.000Z", to: "2026-11-02T00:00:00.000Z", status: "ACCEPTED",
  });
  assert.deepEqual(buildTransactionFilters(filters), {});
});

test("filters reject malformed ids, reversed date ranges and oversize searches", () => {
  assert.throws(() => buildTransactionFilters({ ...filters, invoiceId: "INV-1" }));
  assert.throws(() => buildTransactionFilters({ ...filters, invoiceNumber: "x".repeat(101) }));
  assert.throws(() => buildTransactionFilters({ ...filters, from: "2026-02-01", to: "2026-01-01" }));
});

test("read requires both permission and employee data scope; submit alone does not grant read", () => {
  assert.equal(transactionAccess({ ...identity, permissions: ["TRANSACTION_SUBMIT"], roleGroups: ["TENANT"] }).canRead, false);
  for (const group of ["SYSTEM", "ENTERPRISE", "MASTER_TENANT", "TENANT"]) {
    assert.equal(transactionAccess({ ...identity, permissions: ["TRANSACTION_READ"], roleGroups: [group] }).canRead, true);
  }
  assert.equal(transactionAccess({ ...identity, permissions: ["TRANSACTION_READ"], roleGroups: ["CUSTOMER"] }).canRead, false);
  assert.equal(transactionAccess({ ...identity, permissions: ["TRANSACTION_READ"], roleGroups: [] }).canRead, false);
  assert.equal(transactionAccess({ ...identity, permissions: ["TRANSACTION_SUBMIT"] }).canSubmit, true);
  assert.equal(transactionAccess().canSubmit, false);
});

test("cache scope changes with user, tenant or ACL without embedding the access token", () => {
  const base = transactionAccess({ ...identity, permissions: ["TRANSACTION_READ"], roleGroups: ["TENANT"] }).cacheKey;
  for (const update of [{ sub: "user-b" }, { tenantId: "tenant-b" }, { permissions: [] }, { roleGroups: ["SYSTEM"] }]) {
    assert.notEqual(transactionAccess({ ...identity, permissions: ["TRANSACTION_READ"], roleGroups: ["TENANT"], ...update }).cacheKey, base);
  }
});
