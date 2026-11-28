import {
  quarterlyRevenueRows,
  quarterlyRevenueTotal,
} from "./quarterlyMetrics.js";
import { COST_FIELDS, calculateProductCost } from "../../product/lib/product.js";

// The five cost components a Plan must always carry on create and edit
// (0 is a real zero, not "missing"). Mirrors the backend's
// PropositionValidation.planCosting.
export const PLAN_COST_KEYS = Object.keys(COST_FIELDS);
const isCostEmpty = (value) => value === "" || value == null;
export const missingPlanCosts = (costing) =>
  PLAN_COST_KEYS.filter((key) => isCostEmpty(costing?.[key]));

export const canUsePropositions = (roles) =>
  (roles ?? []).some((role) =>
    /^(ECO|ENTERPRISE|MASTER|TENANT)_(ADMIN|PRODUCT_MANAGER)$/.test(role),
  );
export const errorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.message ||
  "Unable to complete the request.";
export const csv = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
export const isDistributionPartner = (tenant) =>
  tenant.tenantType === "SUB_TENANT" &&
  ["BRAND", "ECOSYSTEM_PARTNER"].includes(
    tenant.partnerTypeCode ?? tenant.partnerType,
  );
export function partnerCountries(ids, partners) {
  return [
    ...new Set(
      ids
        .map((id) => partners.find((p) => p.id === id)?.country)
        .filter(Boolean),
    ),
  ].sort((a, b) => {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  });
}
export const localDate = (value) =>
  value
    ? new Date(
        new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
export const utcDate = (value) =>
  value ? new Date(value).toISOString() : null;
export const showDate = (value) =>
  value ? new Date(value).toLocaleString() : "—";
export const currencyDigits = (currency = "USD") =>
  new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits;
function minor(value, digits) {
  const amount = String(value ?? "0");
  const dot = amount.indexOf(".");
  const whole = dot < 0 ? amount : amount.slice(0, dot);
  const fraction = dot < 0 ? "" : amount.slice(dot + 1);
  let significantDecimals = fraction.length;
  while (significantDecimals > 0 && fraction[significantDecimals - 1] === "0")
    significantDecimals--;
  if (
    !whole ||
    (dot >= 0 && !fraction) ||
    !decimalDigits(whole) ||
    !decimalDigits(fraction) ||
    significantDecimals > digits
  )
    throw new Error(
      `Enter a non-negative amount with at most ${digits} decimals.`,
    );
  return (
    BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.slice(0, digits).padEnd(digits, "0") || "0")
  );
}
function decimalDigits(value) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  return true;
}
function decimal(value, digits) {
  const scale = 10n ** BigInt(digits);
  return `${value / scale}${digits ? `.${(value % scale).toString().padStart(digits, "0")}` : ""}`;
}
export function money(value, currency = "USD") {
  if (value == null || value === "") return "—";
  try {
    const digits = currencyDigits(currency),
      [whole, fraction] = decimal(minor(value, digits), digits).split(".");
    return `${currency} ${new Intl.NumberFormat("en-US").format(BigInt(whole))}${fraction ? `.${fraction}` : ""}`;
  } catch {
    return `${currency} ${value}`;
  }
}
export function propositionFormState(p, fallback = "USD") {
  const d = p?.definition;
  const revenueStart = p?.createdAt ?? new Date().toISOString();
  return {
    // Only meaningful for creation (p is null there); editing an existing
    // Proposition never reads form.source (its Product binding is fixed).
    source: null,
    name: d?.name ?? "",
    description: d?.description ?? "",
    brandId: d?.brandId ?? "",
    regionIds: (d?.regionIds ?? []).join(", "),
    distributionPartnerIds: [...(d?.distributionPartnerIds ?? [])],
    currency: d?.currency ?? fallback,
    startDate: localDate(d?.startDate),
    endDate: localDate(d?.endDate),
    targetYear: d?.targetYear ?? new Date(revenueStart).getFullYear(),
    currentRevenue: d?.currentRevenue ?? "",
    expectRevenue: (d?.expectMetrics ?? []).some(
      (row) => row.revenue != null && row.revenue !== "",
    )
      ? ""
      : (d?.expectRevenue ?? ""),
    revenueStart,
    expectMetrics: quarterlyRevenueRows(d?.expectMetrics ?? [], revenueStart),
    partnerMetrics: (d?.partnerMetrics ?? []).map((item) => ({
      ...item,
      expectRevenue: (item.expectMetrics ?? []).some(
        (row) => row.revenue != null && row.revenue !== "",
      )
        ? ""
        : (item.expectRevenue ?? ""),
      expectMetrics: quarterlyRevenueRows(
        item.expectMetrics ?? [],
        revenueStart,
      ),
    })),
    enterpriseProfitShare: d?.enterpriseProfitShare ?? "",
    platformProfitShare: d?.platformProfitShare ?? "",
    distributionProfitShare: d?.distributionProfitShare ?? "",
    allowedOverrides: [...(d?.allowedOverrides ?? [])],
  };
}
const amount = (value) =>
  value === "" || value == null ? null : String(value);
export const metricPayload = (rows) =>
  rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        ["month", "quarter", "year"].includes(key)
          ? Number(value)
          : amount(value),
      ]),
    ),
  );
export function propositionPayload(form, existing) {
  if (
    !form.name.trim() ||
    !form.distributionPartnerIds.length ||
    !csv(form.regionIds).length
  )
    throw new Error(
      "Name, distribution Sub-Tenants and their onboarding countries are required.",
    );
  const shares = [
    form.enterpriseProfitShare,
    form.platformProfitShare,
    form.distributionProfitShare,
  ];
  if (
    shares.some((s) => s !== "" && s != null) &&
    (shares.some((s) => s === "" || s == null) ||
      shares.reduce((sum, s) => sum + minor(s, 4), 0n) !== 1000000n)
  )
    throw new Error(
      "Enterprise, Platform and Partner profit shares must total 100%.",
    );
  if (!existing && !form.source)
    throw new Error("Select a Product.");
  const definition = {
    name: form.name.trim(),
    description: form.description.trim(),
    brandId: form.brandId || null,
    regionIds: csv(form.regionIds),
    distributionPartnerIds: form.distributionPartnerIds,
    currency: form.currency,
    targetYear: form.targetYear === "" ? null : Number(form.targetYear),
    currentRevenue: amount(form.currentRevenue),
    startDate: utcDate(form.startDate),
    endDate: utcDate(form.endDate),
    expectRevenue:
      quarterlyRevenueTotal(form.expectMetrics) ?? amount(form.expectRevenue),
    expectMetrics: metricPayload(form.expectMetrics),
    partnerMetrics: form.partnerMetrics
      .filter((m) => form.distributionPartnerIds.includes(m.tenantId))
      .map((m) => ({
        tenantId: m.tenantId,
        expectRevenue:
          quarterlyRevenueTotal(m.expectMetrics ?? []) ??
          amount(m.expectRevenue),
        expectMetrics: metricPayload(m.expectMetrics ?? []),
      })),
    enterpriseProfitShare: amount(form.enterpriseProfitShare),
    platformProfitShare: amount(form.platformProfitShare),
    distributionProfitShare: amount(form.distributionProfitShare),
    allowedOverrides: form.allowedOverrides,
  };
  if (
    definition.startDate &&
    definition.endDate &&
    definition.startDate >= definition.endDate
  )
    throw new Error("End date must be after start date.");
  return existing
    ? { expectedRevision: existing.revision, definition }
    : {
        productId: form.source.productId,
        definition,
      };
}
const planPositive = (value) =>
  value !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
const planWhole = (value) =>
  value !== "" &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0 &&
  Number.isInteger(Number(value));
// A new Plan starts life as a full clone of whichever approved Product
// version it's bound to — name, description, category, image, ingredients
// and recipe are all editable from there, just like a Product's own
// Definition/Ingredients/Recipe steps. The Plan's own costing is never
// cloned from the Product (the Product no longer has one): a brand-new Plan
// always starts at zero cost. Unlike before, this binding is the Plan's own
// (not the Proposition's) — `sourceProcess` is the caller-resolved
// ProductProcessResponse for whichever version the user picked, not
// anything cached on the Proposition itself.
export function cloneFromSource(sourceProcess) {
  const source = sourceProcess?.definition?.processElementAttribute?.[0];
  return {
    name: source?.productName ?? "",
    description: source?.description ?? "",
    category: source?.category ?? "",
    imageUrl: source?.imagesURL ?? "",
    ingredients: source?.ingredients ?? [],
    recipe:
      source?.recipe ??
      {
        enabled: false,
        name: "",
        steps: [],
        preparationMinutes: 0,
        cookingMinutes: 0,
        note: "",
      },
  };
}
export function planFormState(plan, p, sourceProcess) {
  const base = plan ?? cloneFromSource(sourceProcess);
  const costing = plan?.costing;
  return {
    productVersion: plan?.productVersion ?? sourceProcess?.version ?? "",
    name: base.name ?? "",
    description: base.description ?? "",
    category: base.category ?? "",
    imageUrl: base.imageUrl ?? "",
    ingredients: (base.ingredients ?? []).map((item) => ({
      ...item,
      name: item.name ?? item.ingredientId ?? "",
      note: item.note ?? "",
    })),
    recipeEnabled: base.recipe?.enabled ?? false,
    recipeName: base.recipe?.name ?? "",
    preparationMinutes: base.recipe?.preparationMinutes ?? 0,
    cookingMinutes: base.recipe?.cookingMinutes ?? 0,
    recipeNote: base.recipe?.note ?? "",
    steps: [...(base.recipe?.steps ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({ ...step, description: step.description ?? "" })),
    regionIds: [...(plan?.regionIds ?? [])],
    tenantIds: [...(plan?.tenantIds ?? [])],
    currency:
      costing?.currency ??
      (p.availableCurrencies.includes(p.definition.currency)
        ? p.definition.currency
        : (p.availableCurrencies[0] ?? "USD")),
    // A brand-new Plan starts with all five costs empty so the user must
    // enter each one. An existing Plan shows what it stored; a legacy Plan
    // with no stored ingredient cost shows 0 (treated as a real 0).
    costing: {
      ingredientCost: plan ? (costing?.ingredientCost ?? 0) : "",
      packagingCost: costing?.packagingCost ?? "",
      laborCost: costing?.laborCost ?? "",
      operationCost: costing?.operationCost ?? "",
      marketingFee: costing?.marketingFee ?? "",
      targetMargin: costing?.targetMargin ?? 0,
      tax: costing?.tax ?? 0,
    },
    sellingPrice: costing?.sellingPrice ?? "",
    pricingNote: costing?.note ?? "",
  };
}
export function planPayload(form, p) {
  if (!form.productVersion)
    throw new Error("Select a source product version.");
  if (!form.name.trim() || form.regionIds.length !== 1 || !form.tenantIds.length)
    throw new Error("Plan name and a Country of Sale are required.");
  if (form.imageUrl.trim()) {
    let valid = false;
    try {
      const url = new URL(form.imageUrl.trim());
      valid = ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
    } catch {
      /* Report a field error below. */
    }
    if (!valid) throw new Error("Plan image must be an HTTP(S) URL.");
  }
  if (
    form.ingredients.some(
      (item) => !item.name.trim() || !item.unit.trim() || !planPositive(item.quantity),
    )
  )
    throw new Error("Each ingredient requires a name, positive quantity and unit.");
  const keys = form.ingredients.map(
    (item) => item.ingredientId?.trim() || item.name.trim().toLowerCase(),
  );
  if (new Set(keys).size !== keys.length)
    throw new Error("Ingredients must be unique.");
  if (form.recipeEnabled) {
    if (!form.steps.length)
      throw new Error("Add at least one recipe step or disable the recipe.");
    if (!planWhole(form.preparationMinutes) || !planWhole(form.cookingMinutes))
      throw new Error(
        "Preparation and cooking times must be whole, non-negative minutes.",
      );
    if (form.steps.some((step) => !step.name.trim() || !planWhole(step.durationMinutes)))
      throw new Error(
        "Each recipe step requires a name and a whole, non-negative duration.",
      );
  }
  const missingCosts = missingPlanCosts(form.costing);
  if (missingCosts.length) {
    const error = new Error(
      `Enter every required cost (0 is allowed): ${missingCosts.map((key) => COST_FIELDS[key]).join(", ")}.`,
    );
    error.costFields = missingCosts;
    throw error;
  }
  if (PLAN_COST_KEYS.some((key) => !(Number.isFinite(Number(form.costing[key])) && Number(form.costing[key]) >= 0)))
    throw new Error("Costs must be non-negative numbers.");
  const result = {
    expectedRevision: p.revision,
    productVersion: Number(form.productVersion),
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    imageUrl: form.imageUrl.trim() || null,
    ingredients: form.ingredients.map((item) => ({
      ingredientId: item.ingredientId?.trim() || null,
      name: item.name.trim(),
      quantity: Number(item.quantity),
      unit: item.unit.trim(),
      note: item.note.trim(),
    })),
    recipe: {
      enabled: form.recipeEnabled,
      name: form.recipeName.trim(),
      preparationMinutes: form.recipeEnabled ? Number(form.preparationMinutes) : 0,
      cookingMinutes: form.recipeEnabled ? Number(form.cookingMinutes) : 0,
      note: form.recipeNote.trim(),
      steps: form.recipeEnabled
        ? form.steps.map((step, index) => ({
            order: index + 1,
            name: step.name.trim(),
            description: step.description.trim(),
            durationMinutes: Number(step.durationMinutes),
          }))
        : [],
    },
    costing: {
      ingredientCost: Number(form.costing.ingredientCost),
      packagingCost: Number(form.costing.packagingCost),
      laborCost: Number(form.costing.laborCost),
      operationCost: Number(form.costing.operationCost),
      marketingFee: Number(form.costing.marketingFee),
      targetMargin: form.costing.targetMargin,
      tax: form.costing.tax,
      currency: form.currency,
    },
    pricing:
      form.sellingPrice === ""
        ? null
        : {
            sellingPrice: Number(form.sellingPrice),
            costPrice: calculateProductCost(form.costing).totalCost,
            currency: form.currency,
            note: form.pricingNote.trim() || null,
          },
    regionIds: form.regionIds,
    tenantIds: form.tenantIds,
  };
  return result;
}

export const statusLabel = (status) =>
  ({
    DRAFT: "Draft",
    PENDING_REVIEW: "Pending Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  })[status] ?? status;
