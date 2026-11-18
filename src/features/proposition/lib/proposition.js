import {
  quarterlyRevenueRows,
  quarterlyRevenueTotal,
} from "./quarterlyMetrics.js";

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
  ].sort();
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
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(value ?? "0"));
  if (!match || (match[2]?.replace(/0+$/, "").length ?? 0) > digits)
    throw new Error(
      `Enter a non-negative amount with at most ${digits} decimals.`,
    );
  return (
    BigInt(match[1]) * 10n ** BigInt(digits) +
    BigInt((match[2] ?? "").slice(0, digits).padEnd(digits, "0") || "0")
  );
}
function decimal(value, digits) {
  const scale = 10n ** BigInt(digits);
  return `${value / scale}${digits ? `.${(value % scale).toString().padStart(digits, "0")}` : ""}`;
}
export function marketPreview({
  currency = "USD",
  salePrice,
  taxRate,
  surcharge,
}) {
  const digits = currencyDigits(currency),
    price = minor(salePrice, digits),
    extra = minor(surcharge || "0", digits),
    rate = minor(taxRate || "0", 4);
  if (rate > 1000000n) throw new Error("Tax must be between 0 and 100%.");
  const tax = (price * rate + 500000n) / 1000000n;
  return {
    taxAmount: decimal(tax, digits),
    totalPrice: decimal(price + tax + extra, digits),
  };
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
    source: p
      ? {
          productId: p.productId,
          productVersion: p.productVersion,
          productProcessId: p.productProcessId,
        }
      : null,
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
    throw new Error("Select an approved ProductProcess.");
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
        productVersion: form.source.productVersion,
        productProcessId: form.source.productProcessId,
        definition,
      };
}
export function planFormState(plan, p) {
  return {
    name: plan?.name ?? "",
    code: plan?.code ?? "",
    description: plan?.description ?? "",
    regionIds: [...(plan?.regionIds ?? [])],
    tenantIds: [...(plan?.tenantIds ?? [])],
    startDate: localDate(plan?.startDate ?? p.definition.startDate),
    endDate: localDate(plan?.endDate ?? p.definition.endDate),
    productOverrides: { ...(plan?.productOverrides ?? {}) },
    marketEnabled: Boolean(plan?.marketConfiguration),
    marketConfirmed: false,
    currency:
      plan?.marketConfiguration?.currency ??
      (p.availableCurrencies.includes(p.definition.currency)
        ? p.definition.currency
        : (p.availableCurrencies[0] ?? "USD")),
    salePrice: plan?.marketConfiguration?.salePrice ?? "",
    taxRate: plan?.marketConfiguration?.taxRate ?? "0",
    surcharge: plan?.marketConfiguration?.surcharge ?? "0",
  };
}
export function planPayload(form, p) {
  if (
    !form.name.trim() ||
    form.regionIds.length !== 1 ||
    !form.tenantIds.length
  )
    throw new Error(
      "Plan name, one Country of Sale and distribution Sub-Tenants are required.",
    );
  if (
    form.tenantIds.some(
      (id) =>
        !p.eligibleTenants.some(
          (t) => t.id === id && t.country === form.regionIds[0],
        ),
    )
  )
    throw new Error(
      "Every selected Sub-Tenant must belong to the Country of Sale.",
    );
  if (form.marketEnabled) {
    if (form.salePrice === "") throw new Error("Enter a sale price.");
    marketPreview(form);
    if (!form.marketConfirmed)
      throw new Error(
        "Confirm the market configuration preview before saving.",
      );
  }
  const result = {
    expectedRevision: p.revision,
    name: form.name.trim(),
    code: form.code.trim(),
    description: form.description.trim(),
    regionIds: form.regionIds,
    tenantIds: form.tenantIds,
    productOverrides: form.productOverrides,
    startDate: utcDate(form.startDate),
    endDate: utcDate(form.endDate),
    marketConfiguration: form.marketEnabled
      ? {
          currency: form.currency,
          salePrice: String(form.salePrice),
          taxRate: String(form.taxRate || "0"),
          surcharge: String(form.surcharge || "0"),
        }
      : null,
  };
  if (result.startDate && result.endDate && result.startDate >= result.endDate)
    throw new Error("End date must be after start date.");
  return result;
}

export const statusLabel = (status) =>
  ({ DRAFT: "Draft", PENDING_REVIEW: "Pending Review", APPROVED: "Approved" })[
    status
  ] ?? status;
