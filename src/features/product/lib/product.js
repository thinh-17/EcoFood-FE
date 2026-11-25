export const PRODUCT_TYPES = { STANDALONE: "Standalone" };
export const PRODUCT_STATUSES = { DRAFT: "Draft", PENDING_REVIEW: "Pending Review", APPROVED: "Approved", REJECTED: "Rejected" };
export const PRODUCT_STEPS = ["Product Type", "Definition", "Ingredients", "Recipe", "Submit"];
export const canEditProduct = (product) => ["DRAFT", "REJECTED"].includes(product?.status);
export const canManageProducts = (roles) => (roles ?? []).some((role) => ["ENTERPRISE_ADMIN", "ENTERPRISE_PRODUCT_MANAGER"].includes(role));
// Wider than canManageProducts — matches the backend's ProductAuthorization.currentRead():
// Enterprise roles still manage (create/edit/submit/approve/reject) their own Products;
// ECO (platform-wide) and Tenant Admin/Product Manager can only ever read — across every
// Enterprise for ECO, a scoped set of Enterprises for Tenant (their own tenant tree, plus
// every Enterprise owning a Proposition their tenant is a distribution partner on). No
// Master Tenant role: that role group is never actually granted to anyone in this system.
export const canViewProducts = (roles) =>
  canManageProducts(roles) ||
  (roles ?? []).some((role) =>
    ["ECO_ADMIN", "ECO_PRODUCT_MANAGER", "TENANT_ADMIN", "TENANT_PRODUCT_MANAGER"].includes(role),
  );
export const productDate = (value) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
export const productMoney = (value, currency = "VND") => `${Number(value).toLocaleString("vi-VN")} ${currency}`;
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
    ingredients: (product?.ingredients ?? []).map((item) => ({ ...item, name: item.name ?? item.ingredientId ?? "", note: item.note ?? "" })),
    recipeEnabled: product?.recipe?.enabled ?? false, recipeName: product?.recipe?.name ?? "",
    preparationMinutes: product?.recipe?.preparationMinutes ?? 0, cookingMinutes: product?.recipe?.cookingMinutes ?? 0,
    recipeNote: product?.recipe?.note ?? "", steps: [...(product?.recipe?.steps ?? [])].sort((a, b) => a.order - b.order).map((step) => ({ ...step, description: step.description ?? "" })),
  };
}
const positive = (value) => value !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
const nonnegative = (value) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
const whole = (value) => nonnegative(value) && Number.isInteger(Number(value));
export function validateProductStep(form, step, isUpdate = false) {
  if (step === 0 && !PRODUCT_TYPES[form.type]) throw new Error("Select a product type.");
  if (step === 1) {
    if (!form.name.trim()) throw new Error("Product name is required.");
    // Product code is server-generated at creation time (see ProductServiceImpl.create)
    // — only validate its format when editing an already-created product.
    if (isUpdate && !/^[a-z\d][a-z\d._-]{0,63}$/i.test(form.code.trim())) throw new Error("Product code requires 1–64 letters, digits, dots, underscores or hyphens.");
    if (!form.category.trim()) throw new Error("Category is required.");
    if (form.imageUrl.trim()) {
      let valid = false;
      try { const url = new URL(form.imageUrl.trim()); valid = ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname); } catch { /* Report a field error below. */ }
      if (!valid) throw new Error("Product image must be an HTTP(S) URL.");
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
}
export function buildProductPayload(form, product) {
  for (let step = 0; step < 4; step++) validateProductStep(form, step, Boolean(product));
  const payload = {
    name: form.name.trim(), category: form.category.trim(), imageUrl: form.imageUrl.trim() || null, description: form.description.trim(),
    ingredients: form.ingredients.map((item) => ({ ingredientId: item.ingredientId?.trim() || null, name: item.name.trim(), quantity: Number(item.quantity), unit: item.unit.trim(), note: item.note.trim() })),
    recipe: { enabled: form.recipeEnabled, name: form.recipeName.trim(), preparationMinutes: form.recipeEnabled ? Number(form.preparationMinutes) : 0, cookingMinutes: form.recipeEnabled ? Number(form.cookingMinutes) : 0, note: form.recipeNote.trim(), steps: form.recipeEnabled ? form.steps.map((step, index) => ({ order: index + 1, name: step.name.trim(), description: step.description.trim(), durationMinutes: Number(step.durationMinutes) })) : [] },
  };
  if (product) {
    if (product.revision == null) throw new Error("Product revision is missing. Reload before saving.");
    return { ...payload, code: form.code.trim().toUpperCase(), expectedRevision: product.revision };
  }
  return { ...payload, type: form.type };
}
export function productFromProcess(product, process) {
  const definition = process.definition?.processElementAttribute?.[0];
  const costing = process.costing?.processElementAttribute?.[0];
  // A version may have no definition/costing attribute yet (e.g. a brand-new
  // DRAFT version). That must still switch the view to it — falling back to
  // `product` here made clicking such a version chip look like a no-op.
  return { ...product, version: process.version, revision: process.revision, status: process.status,
    name: definition?.productName ?? product.name, code: definition?.code ?? product.code,
    category: definition?.category ?? product.category, description: definition?.description ?? product.description,
    imageUrl: definition?.imagesURL ?? product.imageUrl,
    ingredients: definition?.ingredients ?? [], recipe: definition?.recipe,
    costing: costing ?? null, pricing: costing?.sellingPrice == null ? null : { sellingPrice: costing.sellingPrice, costPrice: costing.totalCost, currency: costing.currency, note: costing.note },
    createdAt: process.createdAt, updatedAt: process.updatedAt, approvedBy: process.approvedBy ?? null, approvedAt: process.approvedAt ?? null, rejectionReason: process.rejectionReason ?? null };
}
