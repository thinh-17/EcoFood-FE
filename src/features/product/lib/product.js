export const PRODUCT_TYPES = { STANDALONE: "Standalone", ADAPTED: "Adapted", MASTER: "Master (Combo)" };
export const PRODUCT_STATUSES = { DRAFT: "Draft", PENDING_REVIEW: "Pending Review", APPROVED: "Approved", REJECTED: "Rejected" };
export const PRODUCT_STEPS = ["Product Type", "Definition", "Ingredients", "Recipe", "Pricing", "Submit"];
export const canEditProduct = (product) => ["DRAFT", "REJECTED"].includes(product?.status);
export const canManageProducts = (roles) => (roles ?? []).some((role) => ["ENTERPRISE_ADMIN", "ENTERPRISE_PRODUCT_MANAGER"].includes(role));
export const productDate = (value) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
export const productMoney = (value) => `${Number(value).toLocaleString("vi-VN")} VND`;
export const COST_FIELDS = { ingredientCost: "Ingredient cost", packagingCost: "Packaging cost", laborCost: "Labor cost", operationCost: "Operation cost", marketingFee: "Marketing fee" };
export function calculateProductCost(costing) {
  const totalCost = Object.keys(COST_FIELDS).reduce((total, key) => total + Number(costing[key] || 0), 0);
  const margin = Number(costing.targetMargin || 0);
  const tax = Number(costing.tax || 0);
  const basePrice = margin < 100 ? Math.round((totalCost / (1 - margin / 100) * (1 + tax / 100) + Number.EPSILON) * 100) / 100 : 0;
  return { totalCost, basePrice };
}
export function productError(error) {
  const data = error?.response?.data;
  return data?.detail || data?.message || data?.error || error?.message || "Unable to complete the request.";
}
export function productFormState(product) {
  return {
    type: product?.type ?? "STANDALONE", name: product?.name ?? "", code: product?.code ?? "",
    category: product?.category ?? "", imageUrl: product?.imageUrl ?? "", description: product?.description ?? "",
    sourceProductId: product?.sourceProductId ?? "", componentProducts: (product?.componentProducts ?? []).map((item) => ({ ...item })),
    ingredients: (product?.ingredients ?? []).map((item) => ({ ...item, name: item.name ?? item.ingredientId ?? "", note: item.note ?? "" })),
    recipeEnabled: product?.recipe?.enabled ?? false, recipeName: product?.recipe?.name ?? "",
    preparationMinutes: product?.recipe?.preparationMinutes ?? 0, cookingMinutes: product?.recipe?.cookingMinutes ?? 0,
    recipeNote: product?.recipe?.note ?? "", steps: [...(product?.recipe?.steps ?? [])].sort((a, b) => a.order - b.order).map((step) => ({ ...step, description: step.description ?? "" })),
    pricingEnabled: Boolean(product?.pricing), sellingPrice: product?.pricing?.sellingPrice ?? "", costPrice: product?.pricing?.costPrice ?? "", pricingNote: product?.pricing?.note ?? "",
    costing: { ingredientCost: product?.costing?.ingredientCost ?? product?.pricing?.costPrice ?? 0, packagingCost: product?.costing?.packagingCost ?? 0, laborCost: product?.costing?.laborCost ?? 0, operationCost: product?.costing?.operationCost ?? 0, marketingFee: product?.costing?.marketingFee ?? 0, targetMargin: product?.costing?.targetMargin ?? 0, tax: product?.costing?.tax ?? 0 },
  };
}
const positive = (value) => value !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
const nonnegative = (value) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
const whole = (value) => nonnegative(value) && Number.isInteger(Number(value));
export function validateProductStep(form, step, requirePricing = false) {
  if (step === 0 && !PRODUCT_TYPES[form.type]) throw new Error("Select a product type.");
  if (step === 1) {
    if (!form.name.trim()) throw new Error("Product name is required.");
    if (!/^[a-z\d][a-z\d._-]{0,63}$/i.test(form.code.trim())) throw new Error("Product code requires 1–64 letters, digits, dots, underscores or hyphens.");
    if (!form.category.trim()) throw new Error("Category is required.");
    if (form.imageUrl.trim()) {
      let valid = false;
      try { const url = new URL(form.imageUrl.trim()); valid = ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname); } catch { /* Report a field error below. */ }
      if (!valid) throw new Error("Product image must be an HTTP(S) URL.");
    }
    if (form.type === "ADAPTED" && !/^[a-f\d]{24}$/i.test(form.sourceProductId)) throw new Error("Select an existing approved Master base product.");
    if (form.type === "MASTER") {
      if (form.componentProducts.length < 2) throw new Error("Select at least two distinct component products.");
      if (new Set(form.componentProducts.map((item) => item.productId)).size !== form.componentProducts.length) throw new Error("Component products must be unique.");
      if (form.componentProducts.some((item) => !/^[a-f\d]{24}$/i.test(item.productId) || !positive(item.quantity))) throw new Error("Each component requires a product and a positive quantity.");
    }
  }
  if (step === 2) {
    if (form.ingredients.some((item) => !item.name.trim() || !item.unit.trim() || !positive(item.quantity))) throw new Error("Each ingredient requires a name, positive quantity and unit.");
    const keys = form.ingredients.map((item) => item.ingredientId?.trim() || item.name.trim().toLowerCase());
    if (new Set(keys).size !== keys.length) throw new Error("Ingredients must be unique.");
  }
  if (step === 3 && form.recipeEnabled) {
    if (!form.steps.length) throw new Error("Add at least one recipe step or disable the recipe.");
    if (!whole(form.preparationMinutes) || !whole(form.cookingMinutes)) throw new Error("Preparation and cooking times must be whole, non-negative minutes.");
    if (form.steps.some((step) => !step.name.trim() || !whole(step.durationMinutes))) throw new Error("Each recipe step requires a name and a whole, non-negative duration.");
  }
  if (step === 4) {
    if (Object.values(form.costing).some((value) => !nonnegative(value))) throw new Error("Costs and percentages must be non-negative numbers.");
    if (Number(form.costing.targetMargin) >= 100 || Number(form.costing.tax) > 100) throw new Error("Target margin must be below 100%; tax cannot exceed 100%.");
    if (requirePricing && !form.pricingEnabled) throw new Error("Selling price is required before submitting.");
    if (form.pricingEnabled && !nonnegative(form.sellingPrice)) throw new Error("Selling price must be non-negative.");
  }
}
export function buildProductPayload(form, product, requirePricing = false) {
  for (let step = 0; step < 5; step++) validateProductStep(form, step, requirePricing);
  const payload = {
    name: form.name.trim(), code: form.code.trim().toUpperCase(), category: form.category.trim(), imageUrl: form.imageUrl.trim() || null, description: form.description.trim(),
    costing: Object.fromEntries(Object.entries(form.costing).map(([key, value]) => [key, Number(value)])),
    componentProducts: form.type === "MASTER" ? form.componentProducts.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })) : [],
    ingredients: form.ingredients.map((item) => ({ ingredientId: item.ingredientId?.trim() || null, name: item.name.trim(), quantity: Number(item.quantity), unit: item.unit.trim(), note: item.note.trim() })),
    recipe: { enabled: form.recipeEnabled, name: form.recipeName.trim(), preparationMinutes: form.recipeEnabled ? Number(form.preparationMinutes) : 0, cookingMinutes: form.recipeEnabled ? Number(form.cookingMinutes) : 0, note: form.recipeNote.trim(), steps: form.recipeEnabled ? form.steps.map((step, index) => ({ order: index + 1, name: step.name.trim(), description: step.description.trim(), durationMinutes: Number(step.durationMinutes) })) : [] },
    pricing: form.pricingEnabled ? { sellingPrice: Number(form.sellingPrice), costPrice: calculateProductCost(form.costing).totalCost, currency: "VND", note: form.pricingNote.trim() } : null,
  };
  if (product) {
    if (product.revision == null) throw new Error("Product revision is missing. Reload before saving.");
    return { ...payload, expectedRevision: product.revision };
  }
  return { ...payload, type: form.type, sourceProductId: form.type === "ADAPTED" ? form.sourceProductId : null };
}
export function inheritIngredients(products) {
  const combined = new Map();
  for (const { product, quantity } of products) {
    for (const item of product.ingredients ?? []) {
      const name = item.name ?? item.ingredientId ?? "";
      const key = item.ingredientId || name.trim().toLowerCase();
      const existing = combined.get(key);
      if (existing && existing.unit !== item.unit) throw new Error(`Cannot merge ${name} with different units. Add or adjust it manually.`);
      combined.set(key, { ...item, name, note: item.note ?? "", quantity: (existing?.quantity ?? 0) + Number(item.quantity) * Number(quantity) });
    }
  }
  return [...combined.values()];
}
export function productFromProcess(product, process) {
  const definition = process.definition?.processElementAttribute?.[0];
  const costing = process.costing?.processElementAttribute?.[0];
  if (!definition || !costing) return product;
  return { ...product, version: process.version, revision: process.revision, status: process.status,
    name: definition.productName, code: definition.code, category: definition.category, description: definition.description, imageUrl: definition.imagesURL,
    ingredients: definition.ingredients ?? [], componentProducts: definition.componentProducts ?? [], recipe: definition.recipe,
    costing, pricing: costing.sellingPrice == null ? null : { sellingPrice: costing.sellingPrice, costPrice: costing.totalCost, currency: costing.currency, note: costing.note },
    createdAt: process.createdAt, updatedAt: process.updatedAt, approvedBy: process.approvedBy ?? null, approvedAt: process.approvedAt ?? null, rejectionReason: process.rejectionReason ?? null };
}
