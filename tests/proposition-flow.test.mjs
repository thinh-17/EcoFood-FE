import test from "node:test";
import assert from "node:assert/strict";
import {
  isDistributionPartner,
  partnerCountries,
  propositionFormState,
  propositionPayload,
  planFormState,
  planPayload,
  marketPreview,
  statusLabel,
} from "../src/features/proposition/lib/proposition.js";

const partners = [
  {
    id: "brand",
    tenantType: "SUB_TENANT",
    partnerTypeCode: "BRAND",
    country: "VN",
  },
  {
    id: "partner",
    tenantType: "SUB_TENANT",
    partnerTypeCode: "ECOSYSTEM_PARTNER",
    country: "TH",
  },
  {
    id: "master",
    tenantType: "MASTER_TENANT",
    partnerTypeCode: "BRAND",
    country: "VN",
  },
];
const p = {
  revision: 3,
  definition: {
    ...propositionFormState(),
    regionIds: ["VN", "TH"],
    currency: "USD",
  },
  availableCurrencies: ["USD"],
  eligibleTenants: partners.slice(0, 2),
};
test("Directory admits both Sub-Tenant partner types and derives unique countries", () => {
  assert.deepEqual(
    partners.filter(isDistributionPartner).map((t) => t.id),
    ["brand", "partner"],
  );
  assert.deepEqual(partnerCountries(["brand", "partner", "brand"], partners), [
    "TH",
    "VN",
  ]);
});
test("Proposition needs no separate Brand and preserves null current revenue", () => {
  const form = {
    ...propositionFormState(),
    source: { productId: "p", productVersion: 1, productProcessId: "v" },
    name: "Launch",
    distributionPartnerIds: ["brand"],
    regionIds: "VN",
    targetYear: 2027,
    enterpriseProfitShare: "60",
    platformProfitShare: "10",
    distributionProfitShare: "30",
  };
  const result = propositionPayload(form);
  assert.equal(result.definition.brandId, null);
  assert.equal(result.definition.currentRevenue, null);
  assert.equal(result.definition.targetYear, 2027);
  assert.equal("allowedSegments" in result.definition, false);
  assert.equal("allowedScopes" in result.definition, false);
  assert.throws(
    () => propositionPayload({ ...form, distributionProfitShare: "20" }),
    /100%/,
  );
});
test("Plan pricing requires preview confirmation and matches the tenant country", () => {
  const form = {
    ...planFormState(null, p),
    name: "Vietnam",
    regionIds: ["VN"],
    tenantIds: ["brand"],
    marketEnabled: true,
    salePrice: "25.10",
    taxRate: "8",
    surcharge: "1",
  };
  assert.throws(() => planPayload(form, p), /Confirm/);
  assert.equal(
    planPayload({ ...form, marketConfirmed: true }, p).marketConfiguration
      .salePrice,
    "25.10",
  );
  const body = planPayload({ ...form, marketConfirmed: true }, p);
  assert.equal("segment" in body, false);
  assert.equal("scope" in body, false);
  assert.throws(
    () =>
      planPayload(
        { ...form, marketConfirmed: true, tenantIds: ["partner"] },
        p,
      ),
    /Country of Sale/,
  );
  assert.throws(
    () => planPayload({ ...form, regionIds: ["VN", "TH"] }, p),
    /one Country/,
  );
  assert.throws(
    () => planPayload({ ...form, salePrice: "", marketConfirmed: true }, p),
    /sale price/,
  );
  assert.deepEqual(marketPreview(form), {
    taxAmount: "2.01",
    totalPrice: "28.11",
  });
});
test("Review labels have only Draft, Pending Review and Approved", () => {
  assert.deepEqual(["DRAFT", "PENDING_REVIEW", "APPROVED"].map(statusLabel), [
    "Draft",
    "Pending Review",
    "Approved",
  ]);
});
