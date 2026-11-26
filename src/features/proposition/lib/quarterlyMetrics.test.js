import test from "node:test";
import assert from "node:assert/strict";
import {
  quarterlyRevenueRows,
  appendRevenueYear,
  normalizeQuarterlyMetrics,
  quarterlyRevenueTotal,
  propositionRevenueTotal,
} from "./quarterlyMetrics.js";
import { propositionFormState, propositionPayload } from "./proposition.js";

test("current revenue sums actual sales exactly in the Proposition currency", () => {
  const p = {
    definition: { currency: "USD", currentRevenue: "99999" },
    actualMetrics: [
      { month: 1, year: 2026, revenue: "0.1", currency: "USD", tenantId: "a" },
      { month: 2, year: 2026, revenue: "0.2", currency: "USD", tenantId: "b" },
      { month: 2, year: 2026, revenue: "100000", currency: "VND", tenantId: "a" },
    ],
  };
  assert.equal(propositionRevenueTotal(p), "0.3");
  assert.equal(propositionRevenueTotal({ ...p, actualMetrics: [] }), "0");
  assert.equal(propositionRevenueTotal({ ...p, definition: {} }), null);
  assert.equal(propositionRevenueTotal({ ...p, actualMetrics: [{ quarter: 4, year: 2026, revenue: "100" }] }), "100");
});

test("monthly actuals sum quantities and negative profit exactly across partners", () => {
  const rows = normalizeQuarterlyMetrics([
    { month: 1, year: 2026, totalSalesVolume: "2", revenue: "100", profit: "-1.25", tenantId: "a" },
    { month: 2, year: 2026, totalSalesVolume: "3", revenue: "150", profit: "0.50", tenantId: "b" },
  ]);
  assert.equal(rows[0].quarter, 1);
  assert.equal(rows[0].totalSalesVolume, "5");
  assert.equal(rows[0].revenue, "250");
  assert.equal(rows[0].profit, "-0.75");
});

test("three years starts at the creation calendar quarter and crosses years", () => {
  const rows = quarterlyRevenueRows([], "2026-11-17T12:00:00Z");
  assert.equal(rows.length, 12);
  assert.deepEqual(rows[0], { year: 2026, quarter: 4, revenue: "0" });
  assert.deepEqual(rows.at(-1), { year: 2029, quarter: 3, revenue: "0" });
  assert.equal(
    rows.some((row) => row.year === 2026 && row.quarter < 4),
    false,
  );
});

test("adding a year preserves values and survives saving and reopening", () => {
  const original = {
    createdAt: "2026-11-17T12:00:00Z",
    revision: 2,
    definition: {
      name: "Launch",
      regionIds: ["VN"],
      distributionPartnerIds: ["partner"],
    },
  };
  const form = propositionFormState(original);
  form.expectMetrics[0].revenue = "999999999999999.99";
  form.expectMetrics[1].revenue = "0.01";
  form.expectMetrics = appendRevenueYear(form.expectMetrics);
  const body = propositionPayload(form, original);
  assert.equal(body.definition.expectRevenue, "1000000000000000.00");
  assert.equal(body.definition.expectMetrics.length, 16);
  assert.equal(body.definition.expectMetrics[0].quarter, 4);
  assert.equal("month" in body.definition.expectMetrics[0], false);
  const reopened = propositionFormState({
    ...original,
    definition: body.definition,
  });
  assert.deepEqual(reopened.expectMetrics, form.expectMetrics);
  assert.deepEqual(reopened.expectMetrics.at(-1), {
    year: 2030,
    quarter: 3,
    revenue: "0",
  });
  reopened.expectMetrics = reopened.expectMetrics.map((row) => ({
    ...row,
    revenue: "",
  }));
  assert.equal(
    propositionPayload(reopened, original).definition.expectRevenue,
    null,
  );
});

test("legacy months are aggregated without losing precision or indicators", () => {
  const rows = normalizeQuarterlyMetrics([
    { month: 1, year: 2026, profit: "0.10", totalSalesVolume: "2" },
    { month: 3, year: 2026, profit: "0.20", totalSalesVolume: "3" },
    { month: 4, year: 2026, platformCost: "1.23" },
  ]);
  assert.deepEqual(rows, [
    {
      quarter: 1,
      year: 2026,
      revenue: "0",
      profit: "0.30",
      totalSalesVolume: "5",
    },
    { quarter: 2, year: 2026, revenue: "0", platformCost: "1.23" },
  ]);
});

test("quarterly totals distinguish empty, zero, and exponential input", () => {
  assert.equal(quarterlyRevenueTotal([{ revenue: "" }]), null);
  assert.equal(quarterlyRevenueTotal([{ revenue: "0" }]), "0");
  assert.equal(
    quarterlyRevenueTotal([{ revenue: "1e3" }, { revenue: "0.01" }]),
    "1000.01",
  );
  assert.equal(quarterlyRevenueTotal([{ revenue: "-1" }]), null);
});

test("partner revenue uses the same creation quarter and exact totals", () => {
  const p = {
    createdAt: "2026-11-17T12:00:00Z",
    revision: 1,
    definition: {
      name: "Launch",
      regionIds: ["VN"],
      distributionPartnerIds: ["partner"],
      partnerMetrics: [
        { tenantId: "partner", expectRevenue: "123", expectMetrics: [] },
      ],
    },
  };
  const form = propositionFormState(p);
  assert.equal(form.partnerMetrics[0].expectMetrics.length, 12);

  // Fresh rows now default to "0", not blank — a real (zero) total wins
  // over the legacy flat expectRevenue fallback.
  assert.equal(
    propositionPayload(form, p).definition.partnerMetrics[0].expectRevenue,
    "0",
  );

  // Blanking every row again falls back to the legacy flat field, same as
  // propositionFormState always did for genuinely-empty quarterly data.
  const blanked = {
    ...form,
    partnerMetrics: form.partnerMetrics.map((m) => ({
      ...m,
      expectMetrics: m.expectMetrics.map((row) => ({ ...row, revenue: "" })),
    })),
  };
  assert.equal(
    propositionPayload(blanked, p).definition.partnerMetrics[0].expectRevenue,
    "123",
  );

  form.partnerMetrics[0].expectMetrics[0].revenue = "2.10";
  form.partnerMetrics[0].expectMetrics[1].revenue = "0.20";
  assert.equal(
    propositionPayload(form, p).definition.partnerMetrics[0].expectRevenue,
    "2.30",
  );
});
