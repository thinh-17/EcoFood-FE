import { exampleFor } from "../../orchestrator/lib/planSale.js";

// Mirrors BatchTransactionCsvParser's own fixed columns exactly (see
// app/.../transaction/csv/BatchTransactionCsvParser.java) — invoiceRef is a
// CSV-only grouping key (never persisted, never the backend's own generated
// invoice id); the other three map straight onto Item's fixed fields.
export const FIXED_COLUMNS = ["invoiceRef", "planId", "quantity", "actualPrice"];

const nonEmptyKeys = (fields) => (fields ?? []).filter((f) => f.key?.trim());

// Column headers for a CSV targeting this Sale Orchestrator's own
// configuration: the four fixed columns, then one invoiceHolder.<key>
// column per configured Invoice Holder field and one item.<key> column per
// configured Additional Info field — the same "invoiceHolder."/"item."
// prefix convention the parser buckets back into those two Maps.
export function csvColumnsFor(orchestrator) {
  return [
    ...FIXED_COLUMNS,
    ...nonEmptyKeys(orchestrator?.invoiceHolder).map((f) => `invoiceHolder.${f.key}`),
    ...nonEmptyKeys(orchestrator?.additionalInfoFields).map((f) => `item.${f.key}`),
  ];
}

function keyedExampleRow(fields, prefix, suffix) {
  return Object.fromEntries(nonEmptyKeys(fields).map((f) => [`${prefix}${f.key}`, `${exampleFor(f)}${suffix}`]));
}

// Two example invoices: the first has two items (illustrating that
// invoiceHolder.* values repeat identically across every item sharing the
// same invoiceRef), the second has one. actualPrice is left blank on one
// row to show it's optional (the Plan's own defined price applies then).
export function csvExampleRowsFor(orchestrator) {
  const planIds = orchestrator?.planIds?.length ? orchestrator.planIds : ["plan-abc", "plan-def"];
  const firstPlan = planIds[0];
  const secondPlan = planIds[1] ?? planIds[0];
  const invoice1Holder = keyedExampleRow(orchestrator?.invoiceHolder, "invoiceHolder.", "-1");
  const invoice2Holder = keyedExampleRow(orchestrator?.invoiceHolder, "invoiceHolder.", "-2");
  return [
    {
      invoiceRef: "1", planId: firstPlan, quantity: "2", actualPrice: "15.00",
      ...invoice1Holder, ...keyedExampleRow(orchestrator?.additionalInfoFields, "item.", "-a"),
    },
    {
      invoiceRef: "1", planId: secondPlan, quantity: "1", actualPrice: "",
      ...invoice1Holder, ...keyedExampleRow(orchestrator?.additionalInfoFields, "item.", "-b"),
    },
    {
      invoiceRef: "2", planId: firstPlan, quantity: "3", actualPrice: "9.50",
      ...invoice2Holder, ...keyedExampleRow(orchestrator?.additionalInfoFields, "item.", "-a"),
    },
  ];
}

function csvCell(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// RFC 4180-style CSV text (CRLF line endings) ready to download as a
// starting template — same column/row data the preview table renders.
export function buildSampleCsv(orchestrator) {
  const columns = csvColumnsFor(orchestrator);
  const rows = csvExampleRowsFor(orchestrator);
  const lines = [columns, ...rows.map((row) => columns.map((column) => row[column] ?? ""))]
    .map((cells) => cells.map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}
