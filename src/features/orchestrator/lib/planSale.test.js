import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultSchema,
  canConfigurePlanSale,
  changeType,
  field,
  groupFields,
  replaceGroup,
  samplePayload,
  configurationForSave,
} from "./planSale.js";
test("schema preserves required UC-015 transaction and invoice item fields", () => {
  const schema = defaultSchema();
  assert.deepEqual(
    groupFields(schema, "sale").map((f) => f.name),
    ["invoiceNumber", "transactionTime", "currency", "totalAmount", "items"],
  );
  assert.ok(groupFields(schema, "sale").every((f) => f.required));
  assert.deepEqual(
    schema.fields
      .find((f) => f.name === "items")
      .items.fields.map((f) => f.name),
    ["productCode", "productName", "quantity", "unitPrice", "amount"],
  );
  assert.ok(
    schema.fields
      .find((f) => f.name === "items")
      .items.fields.every((f) => f.required),
  );
});
test("accordion groups preserve existing schema fields when editing Customer", () => {
  const schema = defaultSchema();
  schema.fields.push(field("customerEmail"), field("legacyNote"));
  const updated = replaceGroup(schema, "customer", [field("customerName")]);
  assert.deepEqual(groupFields(updated, "sale"), groupFields(schema, "sale"));
  assert.deepEqual(
    groupFields(updated, "additional").map((f) => f.name),
    ["additionalInfo", "legacyNote"],
  );
  assert.deepEqual(
    groupFields(updated, "customer").map((f) => f.name),
    ["customerName"],
  );
});
test("preview renders nested Customer and Additional information with typed defaults", () => {
  const schema = defaultSchema();
  const info = schema.fields.find((f) => f.name === "additionalInfo");
  info.fields = [
    { ...field("enabled", "BOOLEAN"), defaultValue: false },
    { ...field("count", "NUMBER"), defaultValue: 0 },
  ];
  const payload = samplePayload(schema, "USD");
  assert.equal(payload.currency, "USD");
  assert.equal(payload.customer.email, "customer@example.com");
  assert.deepEqual(payload.additionalInfo, { enabled: false, count: 0 });
  assert.equal(payload.items[0].amount, payload.totalAmount);
  assert.equal(
    payload.items[0].quantity * payload.items[0].unitPrice,
    payload.items[0].amount,
  );
});
test("saving drops legacy POS fields and keeps configuration data", () => {
  const data = configurationForSave({
    name: "Sale",
    maxItems: 100,
    payloadSchema: defaultSchema(),
    postWorkflows: [],
    posBindings: [{ posId: "old-pos" }],
  });
  assert.equal(Object.hasOwn(data, "posBindings"), false);
  assert.equal(data.maxItems, 100);
  assert.equal(data.payloadSchema.fields.length, 7);
});
test("only authorized Tenant roles can configure an assigned Plan", () => {
  assert.ok(
    canConfigurePlanSale(["TENANT_ADMIN"], "tenant", { tenantIds: ["tenant"] }),
  );
  assert.ok(
    canConfigurePlanSale(["TENANT_PRODUCT_MANAGER"], "tenant", {
      tenantIds: ["tenant"],
    }),
  );
  assert.equal(
    canConfigurePlanSale(["ENTERPRISE_ADMIN"], "tenant", {
      tenantIds: ["tenant"],
    }),
    false,
  );
  assert.equal(
    canConfigurePlanSale(["TENANT_ADMIN"], "other", { tenantIds: ["tenant"] }),
    false,
  );
  assert.equal(
    canConfigurePlanSale([], "tenant", { tenantIds: ["tenant"] }),
    false,
  );
});
test("Plan defaults are independent and changing type removes incompatible rules", () => {
  const a = defaultSchema(),
    b = defaultSchema();
  a.fields[0].name = "changed";
  assert.equal(b.fields[0].name, "invoiceNumber");
  assert.deepEqual(
    changeType(
      { ...field("count", "NUMBER"), min: 0, defaultValue: 1 },
      "OBJECT",
    ),
    { name: "count", type: "OBJECT", required: false, fields: [] },
  );
});
