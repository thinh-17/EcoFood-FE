export const TYPES = ["STRING", "NUMBER", "BOOLEAN", "DATE", "OBJECT", "ARRAY"];
export const TRANSACTION_FIELDS = {
  invoiceNumber: "STRING",
  transactionTime: "DATE",
  currency: "STRING",
  totalAmount: "NUMBER",
  items: "ARRAY",
};
export const ITEM_FIELDS = {
  productCode: "STRING",
  productName: "STRING",
  quantity: "NUMBER",
  unitPrice: "NUMBER",
  amount: "NUMBER",
};
export const field = (name = "", type = "STRING", required = false) => ({
  name,
  type,
  required,
});
export function defaultSchema() {
  const schema = {
    fields: Object.entries(TRANSACTION_FIELDS).map(([name, type]) =>
      name === "items"
        ? {
            ...field(name, type, true),
            items: {
              type: "OBJECT",
              fields: Object.entries(ITEM_FIELDS).map(([key, kind]) => ({
                ...field(key, kind, true),
                ...(kind === "NUMBER" ? { min: 0 } : {}),
              })),
            },
          }
        : {
            ...field(name, type, true),
            ...(name === "totalAmount" ? { min: 0 } : {}),
          },
    ),
  };
  schema.fields.push(
    {
      ...field("customer", "OBJECT"),
      fields: [
        field("firstName"),
        field("lastName"),
        { ...field("email"), format: "EMAIL" },
        field("phoneNumber"),
      ],
    },
    { ...field("additionalInfo", "OBJECT"), fields: [] },
  );
  return schema;
}
export function canConfigurePlanSale(roles, tenant, plan) {
  return (
    !!tenant &&
    (roles ?? []).some((r) =>
      ["TENANT_ADMIN", "TENANT_PRODUCT_MANAGER"].includes(r),
    ) &&
    (plan.tenantIds ?? []).includes(tenant)
  );
}
export function changeType(value, type) {
  const {
    fields: _fields,
    items: _items,
    min: _min,
    max: _max,
    format: _format,
    defaultValue: _default,
    ...rest
  } = value;
  return {
    ...rest,
    type,
    ...(type === "OBJECT" ? { fields: [] } : {}),
    ...(type === "ARRAY" ? { items: { type: "STRING" } } : {}),
  };
}

export const schemaGroup = (value) =>
  Object.hasOwn(TRANSACTION_FIELDS, value.name)
    ? "sale"
    : /^customer/i.test(value.name ?? "")
      ? "customer"
      : "additional";
export function groupFields(schema, group) {
  return (schema?.fields ?? []).filter((value) => schemaGroup(value) === group);
}
export function replaceGroup(schema, group, values) {
  const fields = schema?.fields ?? [];
  const index = fields.findIndex((value) => schemaGroup(value) === group);
  const result = fields.filter((value) => schemaGroup(value) !== group);
  result.splice(
    index < 0 ? result.length : Math.min(index, result.length),
    0,
    ...values,
  );
  return { fields: result };
}
export function configurationForSave(value) {
  return {
    name: value.name,
    description: value.description ?? "",
    maxItems: value.maxItems,
    payloadSchema: value.payloadSchema,
    postWorkflows: value.postWorkflows ?? [],
  };
}
export function samplePayload(schema, currency = "VND") {
  const examples = {
    invoiceNumber: "INV-001",
    transactionTime: "2026-01-01T00:00:00Z",
    currency,
    totalAmount: 100000,
    productCode: "PRODUCT-001",
    productName: "Sample product",
    quantity: 1,
    unitPrice: 100000,
    amount: 100000,
    firstName: "An",
    lastName: "Nguyen",
    email: "customer@example.com",
    phoneNumber: "0900000000",
  };
  function value(f, depth = 0) {
    if (depth > 10) return null;
    if (f.defaultValue != null) return f.defaultValue;
    if (f.type === "OBJECT")
      return Object.fromEntries(
        (f.fields ?? []).map((child) => [child.name, value(child, depth + 1)]),
      );
    if (f.type === "ARRAY") return f.items ? [value(f.items, depth + 1)] : [];
    if (f.type === "BOOLEAN") return false;
    if (f.type === "NUMBER") {
      const candidate = Object.hasOwn(examples, f.name) ? examples[f.name] : 0;
      return Math.max(
        f.min == null ? -Infinity : Number(f.min),
        Math.min(f.max == null ? Infinity : Number(f.max), candidate),
      );
    }
    if (f.type === "DATE") return "2026-01-01T00:00:00Z";
    if (f.format === "EMAIL") return "customer@example.com";
    return String(Object.hasOwn(examples, f.name) ? examples[f.name] : "");
  }
  return Object.fromEntries(
    (schema?.fields ?? []).map((f) => [f.name, value(f)]),
  );
}
