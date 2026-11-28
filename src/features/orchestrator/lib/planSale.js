// Same Tenant-or-Enterprise gate the backend enforces for the whole
// directory and every CRUD route (see PlanSaleAccess.requireConfigRole) — a
// Platform (ECO) viewer never sees this tab's content at all.
const SALE_ORCHESTRATOR_ROLES = [
  "TENANT_ADMIN",
  "TENANT_PRODUCT_MANAGER",
  "ENTERPRISE_ADMIN",
  "ENTERPRISE_PRODUCT_MANAGER",
];
export function canViewSaleOrchestratorDirectory(roles, tenant) {
  return (
    !!tenant && (roles ?? []).some((r) => SALE_ORCHESTRATOR_ROLES.includes(r))
  );
}

// An Enterprise actor owns the whole Proposition, so (mirroring the
// backend's currentForProposition) it can cover any Plan in it, not just
// ones assigned to its own Tenant.
export function isEnterpriseSaleOrchestratorActor(roles) {
  return (roles ?? []).some((r) =>
    ["ENTERPRISE_ADMIN", "ENTERPRISE_PRODUCT_MANAGER"].includes(r),
  );
}

// Data types a field can declare — matches the backend's own
// ALLOWED_DATA_TYPES in PlanSaleOrchestratorServiceImpl.
export const DATA_TYPES = ["STRING", "NUMBER", "BOOLEAN", "DATE"];

export const field = (overrides = {}) => ({
  key: "",
  dataType: "STRING",
  shortName: "",
  description: "",
  required: false,
  ...overrides,
});

// Matches PlanSaleOrchestratorServiceImpl.defaultPlanItems() exactly — the
// item's own planId/quantity/actualPrice fields, pre-seeded so a brand new
// Sale Orchestrator starts with the usual shape instead of an empty table.
// planId/quantity's keys are fixed (the backend rejects any other key set
// for planItems); only dataType/shortName/description/required are really
// configurable, same as Additional Info.
export function defaultPlanItems() {
  return [
    field({
      key: "planId",
      dataType: "STRING",
      shortName: "Plan Id",
      description: "The Plan the customer is buying",
      required: true,
    }),
    field({
      key: "quantity",
      dataType: "NUMBER",
      shortName: "Quantity",
      description: "How many of the Plan were bought",
      required: true,
    }),
    field({
      key: "actualPrice",
      dataType: "NUMBER",
      shortName: "Actual Price",
      description:
        "Only needed when your own storefront (not the Plan's own defined price) sets what it sold for",
      required: false,
    }),
  ];
}

// Matches PlanSaleOrchestratorServiceImpl.defaultInvoiceHolder() exactly —
// the buyer's own info, carried once per invoice (not per item). Free-form,
// like Additional Info: these five are just a starting point.
export function defaultInvoiceHolder() {
  return [
    field({ key: "firstName", shortName: "First Name" }),
    field({ key: "lastName", shortName: "Last Name" }),
    field({ key: "email", shortName: "Email" }),
    field({ key: "phoneNumber", shortName: "Phone Number" }),
    field({ key: "address", shortName: "Address" }),
  ];
}

// A Sale Orchestrator has no version/status lifecycle — just a current,
// always-editable configuration: name/description, the Plans it covers, and
// the three field lists describing its whole submit-transaction shape.
export function requestForSave(row, value) {
  return {
    expectedRevision: row?.revision ?? null,
    name: value.name.trim(),
    description: (value.description ?? "").trim(),
    planIds: value.planIds ?? [],
    planItems: value.planItems ?? [],
    additionalInfoFields: value.additionalInfoFields ?? [],
    invoiceHolder: value.invoiceHolder ?? [],
    createCustomer: !!value.createCustomer,
  };
}

const EXAMPLE_VALUES = { STRING: "example", NUMBER: 1, BOOLEAN: true, DATE: "2026-01-01T00:00:00Z" };
export const exampleFor = (f) => EXAMPLE_VALUES[f.dataType] ?? "example";
export const keyedExamples = (fields) =>
  Object.fromEntries((fields ?? []).filter((f) => f.key?.trim()).map((f) => [f.key, exampleFor(f)]));

// Sample submit-transaction payload reflecting exactly what's currently
// defined: planId/quantity plus any other planItems field (e.g.
// actualPrice, or a renamed one) as siblings on the item, one example value
// per configured Additional Info field (nested under `additionalInfo`), and
// the invoiceHolder fields once per invoice (sibling to items, never
// repeated per item). invoiceNumber is omitted here — it's the caller's
// own identifier for a real submission, not part of what this Orchestrator
// defines.
export function samplePayload(planIds, planItems, additionalInfoFields, invoiceHolder) {
  const extraPlanItemFields = (planItems ?? []).filter(
    (f) => f.key?.trim() && !["planId", "quantity"].includes(f.key),
  );
  const additionalInfo = keyedExamples(additionalInfoFields);
  const items = (planIds?.length ? planIds : ["<planId>"]).map((planId) => ({
    planId,
    quantity: 1,
    ...keyedExamples(extraPlanItemFields),
    ...(Object.keys(additionalInfo).length ? { additionalInfo } : {}),
  }));
  const invoiceHolderExample = keyedExamples(invoiceHolder);
  return {
    transaction: {
      invoices: [
        {
          ...(Object.keys(invoiceHolderExample).length ? { invoiceHolder: invoiceHolderExample } : {}),
          items,
        },
      ],
    },
  };
}
