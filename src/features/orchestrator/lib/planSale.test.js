import test from "node:test";
import assert from "node:assert/strict";
import {
  canViewSaleOrchestratorDirectory,
  isEnterpriseSaleOrchestratorActor,
  requestForSave,
  samplePayload,
  defaultPlanItems,
  defaultInvoiceHolder,
  field,
} from "./planSale.js";

test("Tenant and Enterprise roles can view the Sale Orchestrator directory, Platform cannot", () => {
  assert.ok(canViewSaleOrchestratorDirectory(["TENANT_ADMIN"], "tenant"));
  assert.ok(
    canViewSaleOrchestratorDirectory(["TENANT_PRODUCT_MANAGER"], "tenant"),
  );
  assert.ok(canViewSaleOrchestratorDirectory(["ENTERPRISE_ADMIN"], "tenant"));
  assert.ok(
    canViewSaleOrchestratorDirectory(["ENTERPRISE_PRODUCT_MANAGER"], "tenant"),
  );
  assert.equal(canViewSaleOrchestratorDirectory(["ECO_ADMIN"], "tenant"), false);
  assert.equal(canViewSaleOrchestratorDirectory(["TENANT_ADMIN"], null), false);
  assert.equal(canViewSaleOrchestratorDirectory([], "tenant"), false);
});

test("only an Enterprise actor is flagged as covering every Plan in the Proposition", () => {
  assert.ok(isEnterpriseSaleOrchestratorActor(["ENTERPRISE_ADMIN"]));
  assert.ok(isEnterpriseSaleOrchestratorActor(["ENTERPRISE_PRODUCT_MANAGER"]));
  assert.equal(isEnterpriseSaleOrchestratorActor(["TENANT_ADMIN"]), false);
  assert.equal(isEnterpriseSaleOrchestratorActor([]), false);
});

test("defaultPlanItems seeds planId/quantity required and actualPrice optional", () => {
  const keys = defaultPlanItems().map((f) => f.key);
  assert.deepEqual(keys, ["planId", "quantity", "actualPrice"]);
  assert.ok(defaultPlanItems().find((f) => f.key === "planId").required);
  assert.ok(defaultPlanItems().find((f) => f.key === "quantity").required);
  assert.equal(defaultPlanItems().find((f) => f.key === "actualPrice").required, false);
});

test("defaultInvoiceHolder seeds the five buyer fields, all optional", () => {
  const keys = defaultInvoiceHolder().map((f) => f.key);
  assert.deepEqual(keys, ["firstName", "lastName", "email", "phoneNumber", "address"]);
  assert.ok(defaultInvoiceHolder().every((f) => f.required === false));
});

test("save request trims name/description, carries the row's own revision only on update, and passes through all three field lists", () => {
  assert.deepEqual(
    requestForSave(null, { name: "  Sale A  ", description: "  ", planIds: ["p1"] }),
    {
      expectedRevision: null,
      name: "Sale A",
      description: "",
      planIds: ["p1"],
      planItems: [],
      additionalInfoFields: [],
      invoiceHolder: [],
    },
  );
  const giftNote = field({ key: "giftNote", required: true });
  const planItems = defaultPlanItems();
  const invoiceHolder = defaultInvoiceHolder();
  assert.deepEqual(
    requestForSave(
      { revision: 3 },
      {
        name: "Sale A",
        description: "Covers factory plans",
        planIds: ["p1", "p2"],
        planItems,
        additionalInfoFields: [giftNote],
        invoiceHolder,
      },
    ),
    {
      expectedRevision: 3,
      name: "Sale A",
      description: "Covers factory plans",
      planIds: ["p1", "p2"],
      planItems,
      additionalInfoFields: [giftNote],
      invoiceHolder,
    },
  );
});

test("sample payload shows one item per selected Plan, or a placeholder when none are selected yet, with no invoiceNumber", () => {
  assert.deepEqual(samplePayload([]), {
    transaction: {
      invoices: [{ items: [{ planId: "<planId>", quantity: 1 }] }],
    },
  });
  assert.deepEqual(samplePayload(["p1", "p2"]), {
    transaction: {
      invoices: [
        {
          items: [
            { planId: "p1", quantity: 1 },
            { planId: "p2", quantity: 1 },
          ],
        },
      ],
    },
  });
});

test("sample payload includes an example value per configured Additional Info field, skipping blank keys", () => {
  const fields = [
    field({ key: "giftNote", dataType: "STRING" }),
    field({ key: "isGift", dataType: "BOOLEAN" }),
    field({ key: "deliverBy", dataType: "DATE" }),
    field({ key: "" }),
  ];
  assert.deepEqual(samplePayload(["p1"], [], fields), {
    transaction: {
      invoices: [
        {
          items: [
            {
              planId: "p1",
              quantity: 1,
              additionalInfo: { giftNote: "example", isGift: true, deliverBy: "2026-01-01T00:00:00Z" },
            },
          ],
        },
      ],
    },
  });
});

test("sample payload merges any extra planItems field (e.g. actualPrice) onto the item, and invoiceHolder once per invoice", () => {
  assert.deepEqual(samplePayload(["p1"], defaultPlanItems(), [], defaultInvoiceHolder()), {
    transaction: {
      invoices: [
        {
          invoiceHolder: {
            firstName: "example",
            lastName: "example",
            email: "example",
            phoneNumber: "example",
            address: "example",
          },
          items: [{ planId: "p1", quantity: 1, actualPrice: 1 }],
        },
      ],
    },
  });
});
