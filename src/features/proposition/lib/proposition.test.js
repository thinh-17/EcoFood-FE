import test from "node:test";
import assert from "node:assert/strict";
import {
  canUsePropositions,
  marketPreview,
  money,
  propositionFormState,
  propositionPayload,
  planFormState,
  planPayload,
  partnerCountries,
} from "./proposition.js";

test("country ordering is explicit, unique and independent of input order", () => {
  assert.deepEqual(
    partnerCountries(
      ["vn", "us", "other", "missing"],
      [
        { id: "vn", country: "VN" },
        { id: "us", country: "US" },
        { id: "other", country: "VN" },
      ],
    ),
    ["US", "VN"],
  );
});
test("decimal parsing preserves trailing-zero precision and rejects malformed amounts", () => {
  assert.equal(marketPreview({ salePrice: "1.230000" }).totalPrice, "1.23");
  assert.equal(
    marketPreview({ currency: "JPY", salePrice: "1.0000" }).totalPrice,
    "1",
  );
  for (const salePrice of [
    "",
    ".1",
    "1.",
    "1.2.3",
    "1e2",
    " 1",
    "+1",
    "1\n",
    "０１",
    "0." + "0".repeat(100000) + "1",
    "0".repeat(100000) + "x",
  ])
    assert.throws(() => marketPreview({ salePrice }));
});
test("only Product Library role sections can use Propositions", () => {
  for (const actor of ["ECO", "ENTERPRISE", "MASTER", "TENANT"])
    assert.equal(canUsePropositions([`${actor}_PRODUCT_MANAGER`]), true);
  for (const role of [
    "ENTERPRISE_PARTNERSHIP_MANAGER",
    "TENANT_DASHBOARD_MANAGER",
    "CUSTOMER",
  ])
    assert.equal(canUsePropositions([role]), false);
});
test("exact decimal market preview and currency-specific rounding", () => {
  assert.deepEqual(
    marketPreview({ salePrice: "0.10", taxRate: "5", surcharge: "0.20" }),
    { taxAmount: "0.01", totalPrice: "0.31" },
  );
  assert.equal(
    marketPreview({ currency: "KWD", salePrice: "1.123", taxRate: "0" })
      .totalPrice,
    "1.123",
  );
  assert.equal(
    marketPreview({
      currency: "VND",
      salePrice: "25000",
      taxRate: "8",
      surcharge: "1000",
    }).totalPrice,
    "28000",
  );
  assert.equal(
    marketPreview({ salePrice: "999999999999999.99" }).totalPrice,
    "999999999999999.99",
  );
  assert.equal(money("999999999999999.99"), "USD 999,999,999,999,999.99");
});
test("negative money, invalid precision and invalid tax are rejected", () => {
  for (const input of [
    { salePrice: "-1" },
    { salePrice: "1.001" },
    { currency: "JPY", salePrice: "1.1" },
    { salePrice: "1", taxRate: "100.001" },
  ])
    assert.throws(() => marketPreview(input));
});
test("create references one approved process; update preserves source and revision", () => {
  const form = {
    ...propositionFormState(),
    source: {
      productId: "product",
      productVersion: 2,
      productProcessId: "process",
    },
    name: "Distribution",
    brandId: "brand",
    regionIds: "SOUTH",
    distributionPartnerIds: ["partner"],
  };
  const created = propositionPayload(form);
  assert.equal(created.productProcessId, "process");
  assert.equal(created.definition.currency, "USD");
  const updated = propositionPayload(form, { revision: 4 });
  assert.equal(updated.expectedRevision, 4);
  assert.equal("productProcessId" in updated, false);
  assert.throws(() => propositionPayload({ ...form, source: null }));
});
test("Draft Plan allows empty market; entered amounts stay decimal strings", () => {
  const p = {
    revision: 7,
    definition: { currency: "USD" },
    availableCurrencies: ["USD"],
    eligibleTenants: [{ id: "partner", country: "SOUTH" }],
  };
  const form = {
    ...planFormState(null, p),
    name: "South",
    regionIds: ["SOUTH"],
    tenantIds: ["partner"],
  };
  assert.equal(planPayload(form, p).marketConfiguration, null);
  const payload = planPayload(
    {
      ...form,
      marketEnabled: true,
      marketConfirmed: true,
      salePrice: "25.10",
      currency: "THB",
    },
    p,
  );
  assert.equal(payload.marketConfiguration.salePrice, "25.10");
  assert.equal(payload.marketConfiguration.currency, "THB");
  assert.equal(
    planFormState({ marketConfiguration: payload.marketConfiguration }, p)
      .currency,
    "THB",
  );
  assert.equal(payload.expectedRevision, 7);
  assert.equal("status" in payload, false);
});
