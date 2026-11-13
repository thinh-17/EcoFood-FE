import test from "node:test";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { createReceiptSession, validateReceiptAccess, validateReceiptUrl } from "./receiptFlow.js";
import { createReceiptQr } from "./receiptQr.js";

const invoiceId = "abcdef000000000000000001";
const receiptUrl = `https://receipts.example/api/v1/public/receipts?token=${"a".repeat(43)}`;
const access = { receiptId: "b".repeat(64), invoiceId, receiptUrl, expiresAt: "2099-01-01T00:00:00Z" };
const payload = { invoiceNumber: "INV-1", transactionTime: "2026-11-01T00:00:00Z", currency: "VND", totalAmount: 20000,
  items: [{ productCode: "P1", productName: "Milk", quantity: 2, unitPrice: 10000, amount: 20000 }] };
const response = { id: invoiceId, invoiceNumber: "INV-1", status: "ACCEPTED", receivedAt: "2026-11-01T00:00:00Z" };
const detail = { ...payload, distributionPartner: "DP-001" };

test("QR decodes to EXACT backend Receipt URL with no appended Invoice/JWT/customer data", () => {
  for (const value of [receiptUrl, receiptUrl.replace("receipts.example", "receipts.example:8443"), receiptUrl.replace("https:", "http:")]) {
    const qr = createReceiptQr(value);
    const scale = 6;
    const width = qr.viewSize * scale;
    const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
    for (let row = 0; row < qr.size; row++) for (let col = 0; col < qr.size; col++) {
      if (!qr.modules[row * qr.size + col]) continue;
      for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
        const offset = (((row + qr.margin) * scale + y) * width + (col + qr.margin) * scale + x) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
      }
    }
    const decoded = jsQR(pixels, width, width);
    assert.ok(decoded, "Independent decoder can scan generated QR");
    assert.equal(decoded.data, value);
    assert.equal(qr.margin, 4);
  }
});

test("rejects unsafe URLs, credentials and Invoice-only links", () => {
  for (const value of ["javascript:alert(1)", "https://user:pass@example.com/?token=" + "a".repeat(43),
    "https://example.com/invoices/" + invoiceId, receiptUrl + "&jwt=secret", receiptUrl + "#secret", "not-a-url"]) {
    assert.throws(() => validateReceiptUrl(value));
  }
  assert.throws(() => validateReceiptAccess({ ...access, invoiceId: "other" }, invoiceId));
  assert.throws(() => validateReceiptAccess({ ...access, expiresAt: "bad" }, invoiceId));
});

test("render/subscription/refresh do not start issuance until the explicit success handler", () => {
  let calls = 0;
  const session = createReceiptSession({ response, payload }, { requestId: "request", issue: async () => { calls++; return access; }, read: async () => detail });
  const unsubscribe = session.subscribe(() => {});
  session.getSnapshot(); session.getSnapshot(); unsubscribe();
  assert.equal(calls, 0);
  assert.equal(session.getSnapshot().status, "idle");
});

test("successful issue happens once and repeated ensure calls only reuse result", async () => {
  const calls = [];
  const session = createReceiptSession({ response, payload }, {
    requestId: "stable-id", issue: async (...args) => { calls.push(args); return access; }, read: async () => detail,
  });
  const first = session.ensure();
  assert.strictEqual(first, session.ensure());
  await first; await session.ensure();
  assert.deepEqual(calls, [[invoiceId, "stable-id"]]);
  assert.equal(session.getSnapshot().status, "success");
});

test("lost issue response then Retry preserves Invoice and idempotency key, never submits a transaction", async () => {
  const calls = [];
  const session = createReceiptSession({ response, payload }, {
    requestId: "same-request", issue: async (...args) => {
      calls.push(args);
      if (calls.length === 1) throw new Error("Timeout after server may have committed");
      return access;
    }, read: async () => detail,
  });
  await session.ensure();
  assert.equal(session.getSnapshot().status, "error");
  assert.deepEqual(session.payment.response, response);
  await session.ensure();
  assert.deepEqual(calls, [[invoiceId, "same-request"], [invoiceId, "same-request"]]);
  assert.equal(session.getSnapshot().receipt.receiptUrl, receiptUrl);
});

test("detail retry never issues a second access token", async () => {
  let issues = 0; let reads = 0;
  const session = createReceiptSession({ response, payload }, {
    requestId: "one-request", issue: async () => { issues++; return access; }, read: async () => {
      if (++reads === 1) throw new Error("Network error");
      return detail;
    },
  });
  await session.ensure();
  assert.equal(session.getSnapshot().stage, "details");
  assert.equal(session.getSnapshot().receipt.receiptUrl, receiptUrl);
  await session.ensure();
  assert.equal(issues, 1); assert.equal(reads, 2);
  assert.equal(session.getSnapshot().status, "success");
});

test("payment summary is a snapshot even when editable cart changes", async () => {
  const mutable = structuredClone(payload);
  const session = createReceiptSession({ response, payload: mutable }, { requestId: "id", issue: async () => access, read: async () => detail });
  mutable.items[0].quantity = 99; mutable.totalAmount = 990000;
  await session.ensure();
  assert.equal(session.payment.payload.items[0].quantity, 2);
  assert.equal(session.payment.payload.totalAmount, 20000);
});

test("wrong receipt response never renders another Invoice's receipt details", async () => {
  const session = createReceiptSession({ response, payload }, { requestId: "id", issue: async () => access,
    read: async () => ({ ...detail, invoiceNumber: "INV-OTHER" }) });
  await session.ensure();
  assert.equal(session.getSnapshot().status, "error");
  assert.equal(session.getSnapshot().detail, null);
});
