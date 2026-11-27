import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
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
  if (!canReadBusinessDashboard(claims)) return <section className="business-dashboard"><CorePageHeader title="Business Dashboard" /><FeedbackMessage>You do not have Dashboard read access in this tenant.</FeedbackMessage></section>;
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
    setDraft((previous) => {
      const next = { ...(previous || chosen), [field]: value };
      const prop = options.data.propositions.find((p) => p.id === next.propositionId);
      if (field === "propositionId" && prop?.canViewTotal && !prop.tenantIds.includes(next.tenantId)) next.tenantId = "__TOTAL__";
      if (field === "tenantId" && prop && next.tenantId !== "__TOTAL__" && !prop.tenantIds.includes(next.tenantId)) next.propositionId = "";
      if (field === "propositionId" && next.tenantId === "__TOTAL__" && !prop?.canViewTotal) next.tenantId = options.data.currentTenantId;
      return next;
    });
  }
  const error = options.error || summary.error || trends.error || comparison.error;
  const unavailable = error?.response?.status === 403 || error?.response?.status === 401;
  const availableProps = (options.data?.propositions || []).filter((p) => chosen?.tenantId === "__TOTAL__" ? p.canViewTotal : p.canViewTotal || p.tenantIds.includes(chosen?.tenantId));
  const selectedProp = options.data?.propositions.find((p) => p.id === chosen?.propositionId);
  const chartData = (trends.data || []).map((row) => ({ name: periodLabel(row.selection), row,
    actual: dashboardChartValue(row.metrics[kpi]?.actual), expected: dashboardChartValue(row.metrics[kpi]?.expected) }));
  const single = summary.data ? [{ name: periodLabel(summary.data.selection), row: summary.data,
    actual: dashboardChartValue(summary.data.metrics[kpi].actual), expected: dashboardChartValue(summary.data.metrics[kpi].expected) }] : [];
  return <section className="business-dashboard">
    <CorePageHeader title="Business Dashboard" description="Compare expected and actual performance by tenant, proposition, period and currency." />
    <button className="business-refresh" onClick={() => client.invalidateQueries({ queryKey: root })}><FiRefreshCw /> Refresh</button>
    {options.isPending && <CoreLoadingState title="Loading dashboard scope" />}
    {error && <FeedbackMessage error={error}><FiAlertCircle /> {unavailable ? "You do not have dashboard access in the selected scope. " : ""}{dashboardError(error)}</FeedbackMessage>}
    {options.data && chosen && <>
      <div className="business-filters">
        <label>Tenant<select value={chosen.tenantId} onChange={(e) => change("tenantId", e.target.value)}>
          {options.data.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          {options.data.partnerComparisonAllowed && selectedProp?.canViewTotal && <option value="__TOTAL__">Proposition total within your scope</option>}
        </select></label>
        <label>Proposition<select value={chosen.propositionId} onChange={(e) => change("propositionId", e.target.value)}>
          <option value="">All within your scope</option>{availableProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>
        <label>Currency<select value={chosen.currency} onChange={(e) => change("currency", e.target.value)}>
          {!chosen.currency && <option value="">Currency not available</option>}{options.data.currencies.map((c) => <option key={c}>{c}</option>)}
        </select></label>
        <label>Year<select value={chosen.year} onChange={(e) => change("year", Number(e.target.value))}>{options.data.years.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label>Period type<select value={chosen.period} onChange={(e) => change("period", e.target.value)}><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option></select></label>
        {chosen.period === "MONTHLY" && <label key="month">Month<select value={chosen.month} onChange={(e) => change("month", Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>}
        {chosen.period === "QUARTERLY" && <label key="quarter">Quarter<select value={chosen.quarter} onChange={(e) => change("quarter", Number(e.target.value))}>{Array.from({ length: 4 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>}
      </div>
      {!chosen.currency && <p role="status">No currency is available from expected or actual data.</p>}
      {ready && summary.isPending && <CoreLoadingState title="Loading KPIs" />}
      {summary.data && !summary.isError && <>
        <p className="business-period">{periodLabel(summary.data.selection)} · {chosen.currency} · Actual period: Asia/Ho_Chi_Minh</p>
        <div className="business-cards">{Object.entries(KPI_NAMES).map(([name, label]) => <KpiCard key={name} name={name} label={label} metric={summary.data.metrics[name]} selected={kpi === name} onSelect={() => setKpi(name)} />)}</div>
        {summary.data.metrics.totalSalesVolume.actualStatus === "NO_RECORDED_TRANSACTIONS" && <p role="status">No transactions recorded for the selected filters and period.</p>}
        <label className="business-kpi-select">Chart metric<select value={kpi} onChange={(e) => setKpi(e.target.value)}>{Object.entries(KPI_NAMES).map(([name, label]) => <option key={name} value={name}>{label}</option>)}</select></label>
        <div className="business-charts">
          <article><h2>Expected vs Actual</h2><ChartNotice metric={summary.data.metrics[kpi]} /><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={single}><CartesianGrid strokeDasharray="3 3" stroke="#e5eaf1" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip content={<KpiTooltip kpi={kpi} />} /><Legend /><Bar dataKey="actual" name="Actual" fill="#075acd" isAnimationActive={false} /><Bar dataKey="expected" name="Expected" fill="#a8c7f4" isAnimationActive={false} /></BarChart></ResponsiveContainer></div></article>
          <article><h2>Annual trend {chosen.year}</h2>{trends.isPending && <CoreLoadingState title="Loading trends" />}<div className="business-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#e5eaf1" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip content={<KpiTooltip kpi={kpi} />} /><Legend /><Line type="linear" dataKey="actual" name="Actual" stroke="#075acd" connectNulls={false} isAnimationActive={false} /><Line type="linear" dataKey="expected" name="Expected" stroke="#a8c7f4" connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></article>
        </div>
        {comparison.data && <BreakdownTable comparison={comparison.data} kpi={kpi} options={options.data} />}
        <p className="business-sync">Last updated: {summary.data.lastUpdatedAt ? new Date(summary.data.lastUpdatedAt).toLocaleString("en-US") : "Not available"}.</p>
        <p className="business-sync">Expected values use the current configuration. Quarterly expectations are not split into months, and currencies are not converted. Costs above budget are not treated as favorable performance.</p>
      </>}
    </>}
  </section>;
}
export function KpiCard({ name, label, metric, selected = false, onSelect }) {
  const missing = metric.actual == null;
  const cost = name.endsWith("Cost");
  const favorable = metric.variance == null ? "neutral" : (cost ? Number(metric.variance) <= 0 : Number(metric.variance) >= 0) ? "favorable" : "unfavorable";
  return <article className={`business-card${selected ? " business-card--selected" : ""}`} data-testid={`kpi-${name}`}
    role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} aria-pressed={onSelect ? selected : undefined}
    aria-label={onSelect ? label : undefined} onClick={onSelect} onKeyDown={(event) => {
      if (onSelect && ["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect(); }
    }}>
    <h2>{label}</h2><strong>{formatDashboardValue(metric.actual, metric.unit)}</strong>
    <p>Expected: {expectedLabel(metric)}</p>
    <p className={`business-${favorable}`}>Variance: {metric.variance == null ? "Not enough data to compare" : formatDashboardValue(metric.variance, metric.unit)}</p>
    {metric.variancePercent != null && <p>Variance %: {metric.variancePercent}%</p>}
    {metric.achievementPercent != null && <p>Achievement: {metric.achievementPercent}%</p>}
    {cost && <small>Budget comparison</small>}
    {missing && metric.actualStatus === "INCOMPLETE" && <p className="business-warning">Insufficient data · {metric.coveredInvoices}/{metric.totalInvoices} invoices with verified data</p>}
    {metric.actualStatus === "NO_RECORDED_TRANSACTIONS" && <small>No transactions recorded</small>}
  </article>;
}
function ChartNotice({ metric }) {
  return <p className="business-sync">{metric.actual == null ? "Insufficient actual data. " : ""}{metric.expected == null ? expectedLabel(metric) : "Comparisons use the same period and currency."}</p>;
}
function KpiTooltip({ active, payload, kpi }) {
  const metric = payload?.[0]?.payload?.row?.metrics[kpi];
  if (!active || !metric) return null;
  return <div className="business-tooltip"><p>Actual: {formatDashboardValue(metric.actual, metric.unit)}</p><p>Expected: {expectedLabel(metric)}</p></div>;
}
function BreakdownTable({ comparison, kpi, options }) {
  const rows = comparison.byTenant.length > 1 ? comparison.byTenant : comparison.byProposition;
  return <article className="business-breakdown"><h2>Comparison by {comparison.byTenant.length > 1 ? "Tenant" : "Proposition"}</h2><div className="business-table"><table><thead><tr><th>Scope</th><th>Actual</th><th>Expected</th><th>Variance</th></tr></thead><tbody>{rows.map((row) => {
    const metric = row.summary.metrics[kpi];
    const label = row.tenantId ? options.tenants.find((t) => t.id === row.tenantId)?.name : options.propositions.find((p) => p.id === row.propositionId)?.name;
    return <tr key={`${row.tenantId || ""}/${row.propositionId || ""}`}><td>{label || row.tenantId || row.propositionId}</td><td>{formatDashboardValue(metric.actual, metric.unit)}</td><td>{expectedLabel(metric)}</td><td>{metric.variance == null ? "—" : formatDashboardValue(metric.variance, metric.unit)}</td></tr>;
  })}</tbody></table>{rows.length === 0 && <p>No propositions within your scope.</p>}</div></article>;
}
