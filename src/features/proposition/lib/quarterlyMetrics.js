const VALUES = [
  "revenue",
  "totalSalesVolume",
  "profit",
  "ingredientCost",
  "platformCost",
];

function addAmounts(values, allowNegative = false) {
  const amounts = values
    .filter((value) => value !== "" && value != null)
    .map(String);
  if (!amounts.length) return null;
  const parsed = amounts.map((value) => {
    const negative = allowNegative && value.startsWith("-");
    const match = /^(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(negative ? value.slice(1) : value);
    if (!match || Math.abs(Number(match[3] ?? 0)) > 1000) return null;
    return {
      units: (negative ? -1n : 1n) * BigInt(match[1] + (match[2] ?? "")),
      scale: (match[2]?.length ?? 0) - Number(match[3] ?? 0),
    };
  });
  // Invalid intermediate input is handled by the form's number/min validation.
  if (parsed.some((value) => value == null)) return null;
  const digits = Math.max(0, ...parsed.map((value) => value.scale));
  const sum = parsed.reduce(
    (total, value) => total + value.units * 10n ** BigInt(digits - value.scale),
    0n,
  );
  const scale = 10n ** BigInt(digits);
  const absolute = sum < 0n ? -sum : sum;
  return `${sum < 0n ? "-" : ""}${absolute / scale}${digits ? `.${String(absolute % scale).padStart(digits, "0")}` : ""}`;
}

const periodIndex = (row) => Number(row.year) * 4 + Number(row.quarter) - 1;
const period = (index) => ({
  year: Math.floor(index / 4),
  quarter: (index % 4) + 1,
  revenue: "0",
});

// Retain legacy indicators when converting saved monthly rows to quarters.
export function normalizeQuarterlyMetrics(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const quarter = Number(row.quarter ?? Math.ceil(Number(row.month) / 3));
    const year = Number(row.year);
    const key = year * 4 + quarter - 1;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, entries]) => {
      const result = period(index);
      for (const key of VALUES) {
        const total = addAmounts(entries.map((row) => row[key]), key === "profit");
        if (total != null) result[key] = total;
      }
      return result;
    });
}

export function quarterlyRevenueRows(rows = [], createdAt = new Date()) {
  const date = new Date(createdAt);
  const first = date.getFullYear() * 4 + Math.floor(date.getMonth() / 3);
  const result = new Map(
    normalizeQuarterlyMetrics(rows).map((row) => [periodIndex(row), row]),
  );
  for (let index = first; index < first + 12; index++) {
    if (!result.has(index)) result.set(index, period(index));
  }
  return [...result.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
}

export function appendRevenueYear(rows) {
  const last = Math.max(...rows.map(periodIndex));
  return [
    ...rows,
    ...Array.from({ length: 4 }, (_, index) => period(last + index + 1)),
  ];
}

export const quarterlyRevenueTotal = (rows) =>
  addAmounts(rows.map((row) => row.revenue));

// Current revenue comes from recorded sales; never mix currencies or use the manual legacy value.
export function propositionRevenueTotal(proposition) {
  const currency = proposition.definition?.currency;
  if (!currency) return null;
  const rows = (proposition.actualMetrics ?? []).filter(
    (row) => (row.currency ?? currency) === currency,
  );
  return quarterlyRevenueTotal(rows) ?? "0";
}
