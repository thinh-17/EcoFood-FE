// Isolated browser fixture: all requests use an in-memory Axios adapter.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CorePageHeader } from "@thinh-17/fe-core";
import "@thinh-17/fe-core/style.css";
import "../src/index.css";
import "../src/features/product/pages/ProductListPage.css";
import { apiClient } from "../src/services/apiClient.js";
import { ProductForm } from "../src/features/product/pages/ProductForm.jsx";
import { ProductDetail } from "../src/features/product/pages/ProductDetail.jsx";

const baseId = "0123456789abcdef01234567";
const drinkId = "0123456789abcdef01234568";
const masterId = "0123456789abcdef01234571";
const references = [
  { id: baseId, type: "STANDALONE", name: "Boiled chicken", code: "CHICKEN", category: "Meals", ingredients: [{ name: "Chicken", quantity: 500, unit: "g", note: "Fresh" }], recipe: { enabled: true, name: "Boil chicken", preparationMinutes: 10, cookingMinutes: 20, steps: [{ order: 1, name: "Boil", description: "Simmer until cooked", durationMinutes: 20 }] }, pricing: { sellingPrice: 100000 } },
  { id: drinkId, type: "STANDALONE", name: "Soft drink", code: "DRINK", category: "Drinks", ingredients: [], recipe: null },
  { id: masterId, type: "MASTER", status: "APPROVED", version: 1, name: "Master meal", code: "MASTER", category: "Meals", ingredients: [{ name: "Chicken", quantity: 500, unit: "g", note: "Fresh" }], recipe: { enabled: true, name: "Boil chicken", preparationMinutes: 10, cookingMinutes: 20, steps: [{ order: 1, name: "Boil", description: "Simmer until cooked", durationMinutes: 20 }] }, pricing: { sellingPrice: 100000 } },
];
const calls = [];
let saved;
let completed;
let failSubmit = true;
let historyFixture = null;
apiClient.defaults.adapter = async (config) => {
  calls.push({ method: config.method, url: config.url });
  const body = config.data ? JSON.parse(config.data) : {};
  let data;
  if (config.method === "get" && historyFixture && config.url.endsWith("/versions")) data = historyFixture.productProcess.map((process) => ({ version: process.version, status: process.status, name: process.definition.processElementAttribute[0].productName }));
  else if (config.method === "get" && historyFixture && config.url.endsWith(historyFixture.id)) data = historyFixture;
  else if (config.method === "get" && config.url.endsWith(`${masterId}/versions`)) data = [{ version: 1, status: "APPROVED" }];
  else if (config.method === "get" && config.url.endsWith(`${masterId}/processes/1`)) data = references.find((item) => item.id === masterId);
  else if (config.method === "get") data = { content: references, totalPages: 1 };
  else if (config.url.endsWith("/submit")) {
    if (failSubmit) { failSubmit = false; throw Object.assign(new Error("Submission temporarily unavailable"), { response: { status: 503, data: { message: "Submission temporarily unavailable" } } }); }
    data = { ...saved, status: "PENDING_REVIEW" };
  } else {
    saved = { ...saved, ...body, id: "0123456789abcdef01234569", status: "DRAFT", revision: config.method === "post" ? 0 : saved.revision + 1 };
    data = saved;
  }
  return { data, status: 200, statusText: "OK", headers: {}, config };
};
const root = createRoot(document.getElementById("root"));
const pause = () => new Promise((resolve) => setTimeout(resolve, 75));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const button = (text) => [...document.querySelectorAll("button")].find((element) => element.textContent.trim() === text);
async function click(text) { const target = button(text); assert(target && !target.disabled, `Button unavailable: ${text}`); target.click(); await pause(); }
const field = (text) => [...document.querySelectorAll("label")].find((label) => label.textContent.trim().startsWith(text))?.querySelector("input,select,textarea");
async function fill(label, value) {
  const element = field(label); assert(element, `Missing field: ${label}`);
  const prototype = element.tagName === "SELECT" ? HTMLSelectElement.prototype : element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
  element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true })); await pause();
}
async function check(label) { const element = field(label); assert(element, `Missing checkbox: ${label}`); element.click(); await pause(); }
async function render(key) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root.render(<QueryClientProvider client={client}><section className="product-page product-surface"><CorePageHeader title="Create Product" description="Define product details, costs and pricing." /><ProductForm key={key} scope="fixture" onCancel={() => {}} onSaved={(product) => { completed = product; }} /></section></QueryClientProvider>);
  await pause();
}
async function definition(name, code) { await fill("Product name", name); await fill("Product code", code); await fill("Category", "Meals"); }

try {
  await render("standalone");
  assert(!document.querySelector('[role="dialog"]'), "Create renders within the page without a modal");
  assert(document.querySelectorAll('.product-type-card').length === 3, "Three product types rendered");
  await click("Next"); await definition("Boiled chicken", "CH-01"); await click("Next");
  await click("Skip ingredients"); await click("Skip recipe");
  await fill("Ingredient cost", "50000"); await fill("Packaging cost", "5000"); await fill("Labor cost", "10000"); await fill("Operation cost", "3000"); await fill("Marketing fee", "2000"); await fill("Target margin", "30"); await fill("Tax", "10");
  await check("Set pricing now"); await fill("Selling price", "120000"); await click("Next");
  assert(document.body.textContent.includes("110.000 VND"), "Overview shows suggested price from costing");
  assert(document.body.textContent.includes("Product Summary"), "Summary rendered");
  await click("Submit for review");
  assert(document.querySelector('[role="alert"]')?.textContent.includes("temporarily unavailable"), "Submission failure displayed");
  await click("Submit for review");
  assert(completed?.status === "PENDING_REVIEW", "Submission retry completed");
  assert(completed?.pricing?.costPrice === 70000, "Saved cost is the sum of all five cost inputs");
  assert(calls.filter((call) => call.method === "post" && call.url === "/api/v1/products").length === 1, "Retry did not duplicate product creation");
  assert(calls.some((call) => call.method === "put"), "Retry saved using expected revision");

  await render("adapted"); document.querySelector('input[value="ADAPTED"]').click(); await pause();
  await click("Next"); await definition("Garlic fish sauce chicken", "GARLIC-01"); await fill("Master base product", masterId); await click("Next"); await click("Inherit from base product");
  assert(field("Ingredient name").value === "Chicken", "Adapted ingredients inherited");
  await click("Next"); await click("Inherit base recipe");
  assert(field("Recipe name").value === "Boil chicken", "Adapted recipe inherited");
  await click("Next");

  await render("master"); document.querySelector('input[value="MASTER"]').click(); await pause();
  await click("Next"); await definition("Lunch combo", "LUNCH-01"); await click("Next");
  assert(document.querySelector('[role="alert"]')?.textContent.includes("at least two"), "Master minimum components validated");
  await fill("Add component", baseId); await click("+ Add component"); await fill("Add component", drinkId); await click("+ Add component");
  await fill("Quantity", "2"); await click("Next"); await click("Inherit from components");
  assert(field("Quantity").value === "1000", "Component quantity scales inherited ingredients");
  await click("Next"); await click("Skip recipe"); await check("Set pricing now"); await fill("Selling price", "130000"); await click("Next");
  assert(document.body.textContent.includes("Lunch combo") && document.body.textContent.includes("Soft drink"), "Combo summary includes components");
  const surface = document.querySelector('.product-surface').getBoundingClientRect();
  assert(surface.left >= 0 && surface.right <= window.innerWidth, "Inline form fits viewport width");
  assert(getComputedStyle(document.querySelector('.product-primary')).backgroundColor === "rgb(8, 127, 110)", "Product uses the shared FE accent color");
  const process = (version, name, status, cost) => ({ version, revision: 0, status,
    definition: { processElementAttribute: [{ productName: name, code: "CHICKEN", category: "Meals", ingredients: [], componentProducts: [] }] },
    costing: { processElementAttribute: [{ ingredientCost: cost, totalCost: cost, basePrice: cost, sellingPrice: cost * 2, currency: "VND" }] } });
  historyFixture = { id: "0123456789abcdef01234570", enterpriseId: "fixture-enterprise", type: "STANDALONE", version: 2, revision: 0, status: "DRAFT", name: "Current chicken", code: "CHICKEN", category: "Meals", ingredients: [], componentProducts: [], pricing: { sellingPrice: 160000, costPrice: 80000, currency: "VND" },
    productProcess: [process(2, "Current chicken", "DRAFT", 80000), process(1, "Original chicken", "APPROVED", 70000)] };
  const detailClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root.render(<QueryClientProvider client={detailClient}><section className="product-page product-surface"><CorePageHeader title="Product details" /><ProductDetail id={historyFixture.id} scope="history-fixture" onClose={() => {}} onNotice={() => {}} /></section></QueryClientProvider>);
  await pause();
  document.querySelector('[aria-label="View version 1"]').click(); await pause();
  assert(document.querySelector('.product-section-heading h3').textContent === "Original chicken", "Historical process uses its own definition");
  assert(!button("Edit product") && !button("Submit for review"), "Historical process is read only");
  await click("Back to latest");
  assert(document.querySelector('.product-section-heading h3').textContent === "Current chicken" && Boolean(button("Edit product")), "Latest draft actions are restored");
  document.getElementById("test-result").textContent = "PASS: inline create and shared colors; cost/overview; submit retry; inheritance; combo; historical process read-only view.";
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  document.getElementById("test-result").textContent = `FAIL: ${error.message}`;
  document.documentElement.dataset.testResult = "failed";
  console.error(error);
}
