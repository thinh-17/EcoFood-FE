import test from "node:test";
import assert from "node:assert/strict";
import { buildProductPayload, calculateProductCost, canEditProduct, canManageProducts, inheritIngredients, productFormState, productFromProcess, validateProductStep } from "./product.js";
const id1 = "0123456789abcdef01234567";
const id2 = "0123456789abcdef01234568";
const draft = (extra = {}) => ({ ...productFormState(), name: " Chicken ", code: " ch-01 ", category: " Meals ", ...extra });
test("Product actions require an Enterprise Admin or Product Manager role", () => {
  assert.equal(canManageProducts(["ENTERPRISE_ADMIN"]), true);
  assert.equal(canManageProducts(["ENTERPRISE_PRODUCT_MANAGER"]), true);
  for (const role of ["ENTERPRISE_PARTNERSHIP_MANAGER", "ENTERPRISE_DASHBOARD_MANAGER", "TENANT_ADMIN", "CUSTOMER"]) assert.equal(canManageProducts([role]), false);
});
test("standalone draft includes definition and optional sections", () => {
  const result = buildProductPayload(draft());
  assert.equal(result.code, "CH-01"); assert.equal(result.category, "Meals");
  assert.equal(result.sourceProductId, null); assert.deepEqual(result.componentProducts, []);
  assert.equal(result.pricing, null); assert.equal(result.recipe.enabled, false); assert.deepEqual(result.ingredients, []);
  assert.equal("enterpriseId" in result, false);
});
test("required definition and unsafe image URLs are rejected", () => {
  for (const field of ["name", "code", "category"]) assert.throws(() => buildProductPayload(draft({ [field]: "" })));
  assert.throws(() => buildProductPayload(draft({ imageUrl: "javascript:alert(1)" })), /HTTP/);
});
test("adapted requires a base product ID", () => {
  assert.throws(() => buildProductPayload(draft({ type: "ADAPTED" })), /Master/);
  const result = buildProductPayload(draft({ type: "ADAPTED", sourceProductId: id1 }));
  assert.equal(result.sourceProductId, id1); assert.deepEqual(result.componentProducts, []);
});
test("master needs two unique products with positive quantities", () => {
  assert.throws(() => buildProductPayload(draft({ type: "MASTER" })), /at least two/);
  const components = [{ productId: id1, quantity: 1 }, { productId: id2, quantity: "2" }];
  assert.equal(buildProductPayload(draft({ type: "MASTER", componentProducts: components })).componentProducts[1].quantity, 2);
  assert.throws(() => buildProductPayload(draft({ type: "MASTER", componentProducts: [components[0], components[0]] })), /unique/);
  assert.throws(() => buildProductPayload(draft({ type: "MASTER", componentProducts: [components[0], { ...components[1], quantity: 0 }] })), /positive/);
});
test("ingredients support names and notes, positive quantities and unique names", () => {
  const ingredient = { name: " Chicken ", quantity: "500", unit: " g ", note: " Fresh " };
  assert.deepEqual(buildProductPayload(draft({ ingredients: [ingredient] })).ingredients[0], { ingredientId: null, name: "Chicken", quantity: 500, unit: "g", note: "Fresh" });
  assert.throws(() => buildProductPayload(draft({ ingredients: [ingredient, { ...ingredient, name: "chicken" }] })), /unique/);
  assert.throws(() => buildProductPayload(draft({ ingredients: [{ ...ingredient, quantity: 0 }] })), /positive/);
});
test("recipe may exist without ingredients and preserves metadata", () => {
  const form = draft({ recipeEnabled: true, recipeName: "Boil", preparationMinutes: 10, cookingMinutes: 20, recipeNote: "Serve hot", steps: [{ name: "Boil chicken", description: "Simmer", durationMinutes: 20 }] });
  assert.equal(buildProductPayload(form).recipe.preparationMinutes, 10);
  assert.equal(buildProductPayload(form).recipe.steps[0].order, 1);
  assert.throws(() => buildProductPayload({ ...form, steps: [] }), /at least one/);
  assert.throws(() => buildProductPayload({ ...form, cookingMinutes: -1 }), /non-negative/);
});
test("submit requires selling price, permits zero and optional cost price", () => {
  assert.throws(() => buildProductPayload(draft(), null, true), /Selling price is required/);
  assert.deepEqual(buildProductPayload(draft({ pricingEnabled: true, sellingPrice: "0", pricingNote: "Introductory" }), null, true).pricing,
    { sellingPrice: 0, costPrice: 0, currency: "VND", note: "Introductory" });
});
test("updates preserve revision zero and omit immutable type and source", () => {
  const result = buildProductPayload(draft(), { revision: 0 });
  assert.equal(result.expectedRevision, 0); assert.equal("type" in result, false); assert.equal("sourceProductId" in result, false);
  assert.throws(() => buildProductPayload(draft(), {}), /revision/);
});
test("optional steps may be skipped and editing respects status", () => {
  validateProductStep(draft(), 2); validateProductStep(draft(), 3);
  assert.equal(canEditProduct({ status: "REJECTED" }), true); assert.equal(canEditProduct({ status: "APPROVED" }), false);
});
test("component inheritance scales, merges, preserves sources and rejects mixed units", () => {
  const product = { ingredients: [{ name: "Rice", quantity: 100, unit: "g", note: "" }] };
  assert.equal(inheritIngredients([{ product, quantity: 2 }, { product, quantity: 1 }])[0].quantity, 300);
  assert.equal(product.ingredients[0].quantity, 100);
  assert.throws(() => inheritIngredients([{ product, quantity: 1 }, { product: { ingredients: [{ name: "Rice", quantity: 1, unit: "kg" }] }, quantity: 1 }]), /different units/);
});
test("cost calculation sums all inputs and applies target margin and tax", () => {
  const costing={ingredientCost:50000,packagingCost:5000,laborCost:10000,operationCost:3000,marketingFee:2000,targetMargin:30,tax:10};
  assert.deepEqual(calculateProductCost(costing), {totalCost:70000,basePrice:110000});
  const form=draft({costing,pricingEnabled:true,sellingPrice:120000});
  assert.equal(buildProductPayload(form).pricing.costPrice,70000);
  assert.throws(()=>buildProductPayload({...form,costing:{...costing,targetMargin:100}}), /below 100/);
});
test("historical process projects its own attributes rather than latest product fields", () => {
  const value=productFromProcess({version:2,name:"Latest"},{version:1,revision:3,status:"APPROVED",definition:{processElementAttribute:[{productName:"Original",code:"P1",category:"Meals",ingredients:[]}]},costing:{processElementAttribute:[{totalCost:70000,sellingPrice:100000,currency:"VND"}]}});
  assert.equal(value.name,"Original");assert.equal(value.version,1);assert.equal(value.pricing.costPrice,70000);
});
