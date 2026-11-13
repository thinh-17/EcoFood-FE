import test from "node:test";
import assert from "node:assert/strict";
import { getGuestReceiptToken, isGuestReceiptPath } from "./receiptRoute.js";
import { guestReceiptError, receiptSubtotal, validateGuestReceipt } from "./guestReceipt.js";

const receipt = { invoiceNumber: "INV-GUEST", transactionTime: "2026-11-14T01:00:00Z", distributionPartner: "DP-001",
  currency: "VND", totalAmount: 20000, items: [{ productCode: "P1", productName: "Milk", quantity: 2, unitPrice: 10000, amount: 20000 }] };

test("only exact Guest path bypasses auth bootstrap; protected paths remain private", () => {
  assert.equal(isGuestReceiptPath("/receipt"), true);
  assert.equal(isGuestReceiptPath("/receipt/"), true);
  for (const path of ["/", "/pos-simulator", "/receipt/other", "/receipts", "/customer/invoices", "/api/v1/public/receipts"]) {
    assert.equal(isGuestReceiptPath(path), false);
  }
});

test("reads only one well-formed receipt token, never user/tenant input", () => {
  const token = "a".repeat(43);
  assert.equal(getGuestReceiptToken(`?token=${token}&tenantId=other&customerId=other`), token);
  for (const search of ["", "?token=short", "?token=jwt.header.signature", `?token=${token}&token=${token}`, "?token=" + "a".repeat(5000)]) {
    assert.equal(getGuestReceiptToken(search), null);
  }
});

test("only explicit public fields are displayed, internal/customer fields are discarded", () => {
  assert.deepEqual(validateGuestReceipt({ ...receipt, tenantId: "private", posId: "secret", customerEmail: "private",
    token: "secret", paymentStatus: "PAID", items: [{ ...receipt.items[0], customerId: "private" }] }), receipt);
});

test("malformed receipt never becomes a success state", () => {
  for (const override of [{ items: [] }, { totalAmount: -1 }, { currency: "invalid" }, { transactionTime: "bad" },
    { items: [{ ...receipt.items[0], quantity: 0 }] }, { items: [{ ...receipt.items[0], amount: Infinity }] }]) {
    assert.throws(() => validateGuestReceipt({ ...receipt, ...override }), /INVALID_RECEIPT_RESPONSE/);
  }
});

test("subtotal sums decimal line amounts without binary floating-point rounding", () => {
  assert.equal(receiptSubtotal([{ amount: 0.1 }, { amount: 0.2 }]), "0.3");
  assert.equal(receiptSubtotal([{ amount: 1e-8 }, { amount: 1e-8 }]), "0.00000002");
  assert.equal(receiptSubtotal(receipt.items), "20000");
});

test("unavailable/expired/revoked/missing Invoice deliberately share a non-disclosing message", () => {
  const unavailable = guestReceiptError({ response: { status: 404, data: { message: "Receipt unavailable" } } });
  assert.equal(unavailable.retry, false);
  assert.ok(unavailable.message.includes("hết hạn"));
  assert.ok(unavailable.message.includes("thu hồi"));
  assert.equal(guestReceiptError({ response: { status: 404, data: { message: "SECRET CUSTOMER" } } }).message, unavailable.message);
});

test("network and server failures allow explicit retry without exposing raw request/token", () => {
  assert.equal(guestReceiptError(new Error("token=private")).retry, true);
  assert.equal(guestReceiptError({ response: { status: 503 } }).retry, true);
  assert.equal(guestReceiptError(new Error("INVALID_RECEIPT_RESPONSE")).title, "Chưa thể hiển thị hóa đơn");
  assert.equal(guestReceiptError(new Error("token=private")).message.includes("private"), false);
});
