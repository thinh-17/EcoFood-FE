import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreButton, CoreCard, CorePageHeader, CoreSelect, CoreTable } from "@thinh-17/fe-core";
import { FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { businessDashboardApi as api } from "../api/businessDashboard.api.js";
import { KPI_NAMES, canReadBusinessDashboard, dashboardDefaults, dashboardParams, formatDashboardValue, expectedLabel, periodLabel, dashboardError, dashboardChartValue } from "../lib/businessDashboard.js";
import "./BusinessDashboardPage.css";

export function BusinessDashboardPage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  let claims = {}; try { claims = decodeJwt(token); } catch { /* Auth route handles invalid sessions. */ }
  if (!canReadBusinessDashboard(claims)) return <section className="business-dashboard"><CorePageHeader title="Business Dashboard" /><p role="alert">You do not have permission to view the business dashboard for the current tenant.</p></section>;
  return <DashboardWorkspace key={token} scope={token} />;
}
function DashboardWorkspace({ scope }) {
  const client = useQueryClient(), root = ["business-dashboard", scope];
  const options = useQuery({ queryKey: [...root, "filters"], queryFn: api.filters, retry: false });
  const [draft, setDraft] = useState(null), [kpi, setKpi] = useState("totalSalesVolume");
  const chosen = draft || (options.data ? dashboardDefaults(options.data) : null);
  const params = chosen ? dashboardParams(chosen) : null;
  const ready = !!options.data && !!chosen?.currency;
  const summary = useQuery({ queryKey: [...root, "summary", params], queryFn: () => api.summary(params), enabled: ready, retry: false });
  const trends = useQuery({ queryKey: [...root, "trends", params], queryFn: () => api.trends(params), enabled: ready, retry: false });
  const comparison = useQuery({ queryKey: [...root, "comparison", params], queryFn: () => api.comparison(params), enabled: ready, retry: false });
  function change(field, value) {
    setDraft((previous) => ({ ...(previous || chosen), [field]: value }));
  }
  const error = options.error || summary.error || trends.error || comparison.error;
  const unavailable = error?.response?.status === 403 || error?.response?.status === 401;
  const chartData = (trends.data || []).map((row) => ({ name: periodLabel(row.selection), row,
    actual: dashboardChartValue(row.metrics[kpi]?.actual), expected: dashboardChartValue(row.metrics[kpi]?.expected) }));
  const single = summary.data ? [{ name: periodLabel(summary.data.selection), row: summary.data,
    actual: dashboardChartValue(summary.data.metrics[kpi].actual), expected: dashboardChartValue(summary.data.metrics[kpi].expected) }] : [];
  return <section className="business-dashboard">
    <CorePageHeader title="Business Dashboard" description="Expected and actual KPIs by tenant, reporting period, and currency." />
    <CoreButton variant="secondary" className="business-refresh" onClick={() => client.invalidateQueries({ queryKey: root })}><FiRefreshCw /> Refresh</CoreButton>
    {options.isPending && <p role="status">Loading dashboard scope…</p>}
    {error && <p role="alert" className="business-error"><FiAlertCircle /> {unavailable ? "You do not have permission to view the selected scope. " : ""}{dashboardError(error)}</p>}
    {options.data && chosen && <>
      <CoreCard className="business-filters">
        <DashboardFilter label="Tenant" value={chosen.tenantId} onChange={(value) => change("tenantId", value)} options={options.data.tenants.map((t) => ({ value: t.id, label: t.name }))} />
        <DashboardFilter label="Currency" value={chosen.currency} onChange={(value) => change("currency", value)} options={options.data.currencies.map((value) => ({ value, label: value }))} placeholder="Currency not determined" />
        <DashboardFilter label="Year" value={chosen.year} onChange={(value) => change("year", value)} options={options.data.years.map((value) => ({ value, label: String(value) }))} />
        <DashboardFilter label="Reporting period" value={chosen.period} onChange={(value) => change("period", value)} options={[
          { value: "MONTHLY", label: "Monthly" }, { value: "QUARTERLY", label: "Quarterly" }, { value: "YEARLY", label: "Yearly" },
        ]} />
        {chosen.period === "MONTHLY" && <DashboardFilter label="Month" value={chosen.month} onChange={(value) => change("month", value)} options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Month ${i + 1}` }))} />}
        {chosen.period === "QUARTERLY" && <DashboardFilter label="Quarter" value={chosen.quarter} onChange={(value) => change("quarter", value)} options={Array.from({ length: 4 }, (_, i) => ({ value: i + 1, label: `Quarter ${i + 1}` }))} />}
      </CoreCard>
      {!chosen.currency && <p role="status">No verified currency is available from expected or actual data. Please check the currency configuration.</p>}
      {ready && summary.isPending && <p role="status">Loading KPIs…</p>}
      {summary.data && !summary.isError && <>
        <p className="business-period">{periodLabel(summary.data.selection)} · {chosen.currency} · Time zone: Asia/Ho_Chi_Minh</p>
        <div className="business-cards">{Object.entries(KPI_NAMES).map(([name, label]) => <KpiCard key={name} name={name} label={label} metric={summary.data.metrics[name]} />)}</div>
        {summary.data.metrics.totalSalesVolume.actualStatus === "NO_RECORDED_TRANSACTIONS" && <p role="status">No transactions have been recorded for this period. New transactions may be awaiting KPI updates.</p>}
        <DashboardFilter className="business-kpi-select" label="Chart metric" value={kpi} onChange={setKpi} options={Object.entries(KPI_NAMES).map(([value, label]) => ({ value, label }))} />
        <div className="business-charts">
          <CoreCard><h2>Expected vs Actual</h2><ChartNotice metric={summary.data.metrics[kpi]} /><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={single}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip content={<KpiTooltip kpi={kpi} />} /><Legend /><Bar dataKey="actual" name="Actual" fill="#177967" isAnimationActive={false} /><Bar dataKey="expected" name="Expected" fill="#7181a0" isAnimationActive={false} /></BarChart></ResponsiveContainer></div></CoreCard>
          <CoreCard><h2>Trends {chosen.year}</h2>{trends.isPending && <p>Loading trends…</p>}<div className="business-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip content={<KpiTooltip kpi={kpi} />} /><Legend /><Line type="linear" dataKey="actual" name="Actual" stroke="#177967" connectNulls={false} isAnimationActive={false} /><Line type="linear" dataKey="expected" name="Expected" stroke="#7181a0" connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></CoreCard>
        </div>
        {comparison.data && <BreakdownTable comparison={comparison.data} kpi={kpi} options={options.data} />}
        <p className="business-sync">Last updated: {summary.data.lastUpdatedAt ? new Date(summary.data.lastUpdatedAt).toLocaleString("en-US") : "Not available"}. </p>
        <p className="business-sync">Expected values use the current configuration. Quarterly targets are not split into months; currencies are not converted. Costs exceeding the budget are not treated as an achievement.</p>
      </>}
    </>}
  </section>;
}
function DashboardFilter({ label, className = "", ...props }) {
  return <div className={`business-filter ${className}`}><span>{label}</span><CoreSelect aria-label={label} {...props} /></div>;
}
export function KpiCard({ name, label, metric }) {
  const missing = metric.actual == null;
  const cost = name.endsWith("Cost");
  const favorable = metric.variance == null ? "neutral" : (cost ? Number(metric.variance) <= 0 : Number(metric.variance) >= 0) ? "favorable" : "unfavorable";
  return <CoreCard className="business-card">
    <h2>{label}</h2><strong>{formatDashboardValue(metric.actual, metric.unit)}</strong>
    <p>Expected: {expectedLabel(metric)}</p>
    <p className={`business-${favorable}`}>Variance: {metric.variance == null ? "Insufficient data for comparison" : formatDashboardValue(metric.variance, metric.unit)}</p>
    {metric.variancePercent != null && <p>Variance %: {metric.variancePercent}%</p>}
    {metric.achievementPercent != null && <p>Achievement: {metric.achievementPercent}%</p>}
    {cost && <small>Budget comparison</small>}
    {missing && metric.actualStatus === "INCOMPLETE" && <p className="business-warning">Insufficient data · {metric.coveredInvoices}/{metric.totalInvoices} invoices with verified data</p>}
    {metric.actualStatus === "NO_RECORDED_TRANSACTIONS" && <small>No recorded transactions</small>}
  </CoreCard>;
}
function ChartNotice({ metric }) {
  return <p className="business-sync">{metric.actual == null ? "Actual data is incomplete. " : ""}{metric.expected == null ? expectedLabel(metric) : "Only values for the same period and currency are compared."}</p>;
}
function KpiTooltip({ active, payload, kpi }) {
  const metric = payload?.[0]?.payload?.row?.metrics[kpi];
  if (!active || !metric) return null;
  return <div className="business-tooltip"><p>Actual: {formatDashboardValue(metric.actual, metric.unit)}</p><p>Expected: {expectedLabel(metric)}</p></div>;
}
function BreakdownTable({ comparison, kpi, options }) {
  const rows = comparison.byTenant.length > 1 ? comparison.byTenant : comparison.byProposition;
  const columns = [
    { id: "scope", header: "Scope", cell: ({ row: { original: row } }) => (row.tenantId ? options.tenants.find((t) => t.id === row.tenantId)?.name : options.propositions.find((p) => p.id === row.propositionId)?.name) || row.tenantId || row.propositionId },
    { id: "actual", header: "Actual", cell: ({ row }) => { const metric = row.original.summary.metrics[kpi]; return formatDashboardValue(metric.actual, metric.unit); } },
    { id: "expected", header: "Expected", cell: ({ row }) => expectedLabel(row.original.summary.metrics[kpi]) },
    { id: "variance", header: "Variance", cell: ({ row }) => { const metric = row.original.summary.metrics[kpi]; return metric.variance == null ? "—" : formatDashboardValue(metric.variance, metric.unit); } },
  ];
  return <CoreCard className="business-breakdown" title={`Comparison by ${comparison.byTenant.length > 1 ? "tenant" : "proposition"}`}>
    <CoreTable columns={columns} data={rows} emptyTitle="No propositions within the authorized scope." />
  </CoreCard>;
}
