import test from "node:test";
import assert from "node:assert/strict";
import {
  canUsePropositions,
  money,
  propositionFormState,
  propositionPayload,
  planFormState,
  planPayload,
  partnerCountries,
  PLAN_COST_KEYS,
  missingPlanCosts,
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
test("money formats decimal precision per currency", () => {
  assert.equal(money("999999999999999.99"), "USD 999,999,999,999,999.99");
  assert.equal(money(null), "—");
});
test("create references one Product; update never carries a product binding", () => {
  const form = {
    ...propositionFormState(),
    source: { productId: "product", name: "Boiled Chicken" },
    name: "Distribution",
    brandId: "brand",
    regionIds: "SOUTH",
    distributionPartnerIds: ["partner"],
  };
  const created = propositionPayload(form);
  assert.equal(created.productId, "product");
  assert.equal(created.definition.currency, "USD");
  const updated = propositionPayload(form, { revision: 4 });
  assert.equal(updated.expectedRevision, 4);
  assert.equal("productId" in updated, false);
  assert.throws(() => propositionPayload({ ...form, source: null }));
});
const planProposition = () => ({
  revision: 7,
  definition: { currency: "USD", startDate: null, endDate: null },
  availableCurrencies: ["USD"],
  eligibleTenants: [{ id: "partner", country: "SOUTH" }],
});
// The Plan's own bound Product version — resolved by the caller (e.g.
// PlanForm fetching the Proposition's Product's processes), never cached on
// the Proposition itself.
const planSourceProcess = () => ({
  version: 3,
  definition: {
    processElementAttribute: [
      {
        productName: "Boiled Chicken",
        description: "Original description",
        category: "Meals",
        imagesURL: "https://example.com/chicken.png",
        ingredients: [],
        recipe: { enabled: false, name: "", steps: [], preparationMinutes: 0, cookingMinutes: 0, note: "" },
      },
    ],
  },
});
test("a brand new Plan clones the source product's definition, binds its version and starts with empty costs", () => {
  const p = planProposition();
  const form = planFormState(null, p, planSourceProcess());
  assert.equal(form.productVersion, 3);
  assert.equal(form.name, "Boiled Chicken");
  assert.equal(form.category, "Meals");
  assert.equal(form.imageUrl, "https://example.com/chicken.png");
  assert.equal(form.sellingPrice, "");
  for (const key of PLAN_COST_KEYS) assert.equal(form.costing[key], "", key);
  assert.deepEqual(missingPlanCosts(form.costing), ["ingredientCost", "packagingCost", "laborCost", "operationCost", "marketingFee"]);
});
const zeroCosts = { ingredientCost: 0, packagingCost: 0, laborCost: 0, operationCost: 0, marketingFee: 0 };
test("saving a Plan requires all five costs, accepts real zeros and lists the missing fields", () => {
  const p = planProposition();
  const form = { ...planFormState(null, p, planSourceProcess()), name: "South", regionIds: ["SOUTH"], tenantIds: ["partner"] };
  assert.throws(() => planPayload(form, p), (error) => {
    assert.deepEqual(error.costFields, PLAN_COST_KEYS);
    assert.match(error.message, /Ingredient cost, Packaging cost, Labor cost, Operation cost, Marketing fee/);
    return true;
  });
  assert.throws(
    () => planPayload({ ...form, costing: { ...form.costing, ...zeroCosts, laborCost: "" } }, p),
    (error) => error.costFields.length === 1 && error.costFields[0] === "laborCost",
  );
  assert.throws(() => planPayload({ ...form, costing: { ...form.costing, ...zeroCosts, packagingCost: "-1" } }, p), /non-negative/);
  const payload = planPayload({ ...form, costing: { ...form.costing, ...zeroCosts } }, p);
  assert.deepEqual(
    PLAN_COST_KEYS.map((key) => payload.costing[key]),
    [0, 0, 0, 0, 0],
  );
});
test("a legacy Plan without a stored ingredient cost shows 0 and can be re-saved", () => {
  const p = planProposition();
  const plan = {
    productVersion: 5, name: "Legacy", description: "", category: "", imageUrl: "", ingredients: [],
    recipe: { enabled: false, steps: [] },
    costing: { ingredientCost: null, packagingCost: 1, laborCost: 2, operationCost: 3, marketingFee: 4, targetMargin: 0, tax: 0, currency: "VND" },
    regionIds: ["SOUTH"], tenantIds: ["partner"],
  };
  const form = planFormState(plan, p);
  assert.equal(form.costing.ingredientCost, 0);
  assert.deepEqual(missingPlanCosts(form.costing), []);
  assert.equal(planPayload(form, p).costing.ingredientCost, 0);
});
test("Draft Plan allows empty pricing; a selling price auto-derives its cost basis", () => {
  const p = planProposition();
  const form = {
    ...planFormState(null, p, planSourceProcess()),
    name: "South",
    regionIds: ["SOUTH"],
    tenantIds: ["partner"],
    costing: { ...planFormState(null, p, planSourceProcess()).costing, ...zeroCosts },
  };
  assert.equal(planPayload(form, p).pricing, null);
  const costing = { ...form.costing, ingredientCost: 50000, packagingCost: 5000, laborCost: 10000, operationCost: 3000, marketingFee: 2000, targetMargin: 30, tax: 10 };
  const payload = planPayload({ ...form, costing, currency: "THB", sellingPrice: "120000" }, p);
  assert.equal(payload.pricing.sellingPrice, 120000);
  assert.equal(payload.pricing.costPrice, 70000);
  assert.equal(payload.costing.ingredientCost, 50000);
  assert.equal(payload.pricing.currency, "THB");
  assert.equal(payload.costing.currency, "THB");
  assert.equal(payload.expectedRevision, 7);
  assert.equal("status" in payload, false);
});
test("an existing Plan's own saved costing/content round-trips through form state", () => {
  const p = planProposition();
  const plan = {
    productVersion: 5,
    name: "Existing Plan",
    description: "Already saved",
    category: "Drinks",
    imageUrl: "",
    ingredients: [{ ingredientId: "ing-1", name: "Water", quantity: 500, unit: "ml", note: "" }],
    recipe: { enabled: false, name: "", steps: [], preparationMinutes: 0, cookingMinutes: 0, note: "" },
    costing: {
      ingredientCost: 1000, packagingCost: 100, laborCost: 200, operationCost: 50, marketingFee: 50,
      targetMargin: 20, tax: 5, totalCost: 1400, basePrice: 1750, sellingPrice: 2000, currency: "VND", note: "Promo",
    },
    regionIds: ["SOUTH"],
    tenantIds: ["partner"],
  };
  const form = planFormState(plan, p);
  assert.equal(form.productVersion, 5);
  assert.equal(form.name, "Existing Plan");
  assert.equal(form.currency, "VND");
  assert.equal(form.sellingPrice, 2000);
  assert.equal(form.pricingNote, "Promo");
  assert.equal(form.ingredients[0].name, "Water");
});
