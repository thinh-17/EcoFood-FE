import test from "node:test";
import assert from "node:assert/strict";
import { FIXED_COLUMNS, csvColumnsFor, csvExampleRowsFor, buildSampleCsv } from "./csvTemplate.js";

const orchestrator = {
  planIds: ["plan-abc", "plan-def"],
  invoiceHolder: [{ key: "email", dataType: "STRING" }, { key: "", dataType: "STRING" }],
  additionalInfoFields: [{ key: "cashierId", dataType: "STRING" }],
};

test("Columns are the four fixed ones plus prefixed dynamic fields, blank keys dropped", () => {
  assert.deepEqual(csvColumnsFor(orchestrator), [...FIXED_COLUMNS, "invoiceHolder.email", "item.cashierId"]);
  assert.deepEqual(csvColumnsFor(undefined), FIXED_COLUMNS);
});

test("Example rows group two items under invoiceRef 1 with identical invoiceHolder values", () => {
  const rows = csvExampleRowsFor(orchestrator);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].invoiceRef, "1");
  assert.equal(rows[1].invoiceRef, "1");
  assert.equal(rows[0]["invoiceHolder.email"], rows[1]["invoiceHolder.email"]);
  assert.notEqual(rows[0]["invoiceHolder.email"], rows[2]["invoiceHolder.email"]);
  assert.equal(rows[1].actualPrice, "");
});

test("buildSampleCsv renders a header row plus one line per example row, CRLF-terminated", () => {
  const csv = buildSampleCsv(orchestrator);
  const lines = csv.split("\r\n").filter(Boolean);
  assert.equal(lines.length, 4);
  assert.equal(lines[0], "invoiceRef,planId,quantity,actualPrice,invoiceHolder.email,item.cashierId");
  assert.ok(csv.endsWith("\r\n"));
});

test("Quoting escapes commas, quotes and newlines", () => {
  const csv = buildSampleCsv({ planIds: ['plan,with"quote'], invoiceHolder: [], additionalInfoFields: [] });
  assert.ok(csv.includes('"plan,with""quote"'));
});
