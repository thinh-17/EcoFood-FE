import { DashboardAccessDenied } from "../components/DashboardAccessDenied.jsx";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreButton, CoreCard, CorePageHeader, CoreSelect } from "@thinh-17/fe-core";
import { useAuthStore } from "../../auth/store/authStore.js";
import { businessDashboardApi as api } from "../api/businessDashboard.api.js";
import { KPI_NAMES, dashboardDefaults, dashboardParams, formatDashboardValue, dashboardError, periodLabel } from "../lib/businessDashboard.js";
import { BusinessDashboardCharts } from "./BusinessDashboardCharts.jsx";
import "./BusinessDashboardPage.css";

export function BusinessDashboardPage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  return <Workspace key={token} scope={token} />;
}
function Workspace({ scope }) {
  const client = useQueryClient();
  const root = ["business-dashboard", scope];
  const [draft, setDraft] = useState(null);
  const [kpi, setKpi] = useState("revenue");
  const options = useQuery({ queryKey: [...root, "filters"], queryFn: api.filters, retry: false });
  const chosen = draft || (options.data ? dashboardDefaults(options.data) : null);
  const params = chosen ? dashboardParams(chosen) : null;
  const ready = !!chosen?.currency && !!options.data?.tenants.length;
  const summary = useQuery({ queryKey: [...root, "summary", params], queryFn: () => api.summary(params), enabled: ready, retry: false });
  const trends = useQuery({ queryKey: [...root, "trends", params], queryFn: () => api.trends(params), enabled: ready, retry: false });
  const change = (field, value) => setDraft({ ...chosen, [field]: value, ...(field === "tenantId" ? { propositionId: "" } : {}) });
  if (options.isPending) return <p role="status">Loading dashboard…</p>;
  if (options.error?.response?.status === 403) return <DashboardAccessDenied title="Business Dashboard" />;
  if (options.isError) return <p role="alert">{dashboardError(options.error)}</p>;
  if (!options.data.tenants.length) return <DashboardAccessDenied title="Business Dashboard" />;
  return <section className="eco-module-page business-dashboard">
    <CorePageHeader eyebrow="EcoFood Platform" title="Business Dashboard" description="Actual business performance by Proposition, quarter and year." />
    <div className="business-actions"><CoreButton variant="secondary" onClick={() => client.invalidateQueries({ queryKey: root })}>Refresh dashboard</CoreButton></div>
    <CoreCard><div className="business-filters">
      <Filter label="Tenant" value={chosen.tenantId} onChange={(value) => change("tenantId", value)} options={options.data.tenants.map((t) => ({ value: t.id, label: t.name }))} />
      <Filter label="Proposition" value={chosen.propositionId} onChange={(value) => change("propositionId", value)} options={[{ value: "", label: "All authorized propositions" }, ...options.data.propositions.map((p) => ({ value: p.id, label: p.name }))]} />
      <Filter label="Currency" value={chosen.currency} onChange={(value) => change("currency", value)} options={options.data.currencies.map((c) => ({ value: c, label: c }))} />
      <Filter label="Year" value={String(chosen.year)} onChange={(value) => change("year", Number(value))} options={options.data.years.map((y) => ({ value: String(y), label: String(y) }))} />
      <Filter label="Period" value={chosen.period} onChange={(value) => change("period", value)} options={[{ value: "QUARTERLY", label: "Quarterly" }, { value: "YEARLY", label: "Yearly" }]} />
      {chosen.period === "QUARTERLY" && <Filter label="Quarter" value={String(chosen.quarter)} onChange={(value) => change("quarter", Number(value))} options={[1,2,3,4].map((q) => ({ value: String(q), label: "Quarter " + q }))} />}
    </div></CoreCard>
    {!chosen.currency && <p role="status">No currency is available in the authorized data.</p>}
    {summary.isFetching && <p role="status">Loading metrics…</p>}
    {summary.isError && <p className="business-error" role="alert">{dashboardError(summary.error)}</p>}
    {summary.data && !summary.isError && <>
      <p className="business-period">{periodLabel(summary.data.selection)} · {chosen.currency}</p>
      <div className="business-cards">{Object.entries(KPI_NAMES).map(([name,label]) => <KpiCard key={name} label={label} metric={summary.data.metrics[name]} />)}</div>
      <div className="business-kpi-select"><Filter label="Chart metric" value={kpi} onChange={setKpi} options={Object.entries(KPI_NAMES).map(([value,label]) => ({ value, label }))} /></div>
      <BusinessDashboardCharts summary={summary.data} trends={trends.data} kpi={kpi} year={chosen.year} loading={trends.isPending} error={trends.isError} onRetry={() => trends.refetch()} />
    </>}
  </section>;
}
function Filter({ label, ...props }) {
  return <label className="fe-field business-filter">{label}<CoreSelect {...props} /></label>;
}
export function KpiCard({ label, metric }) {
  return <CoreCard className="business-card"><h2>{label}</h2><strong>{formatDashboardValue(metric?.actual, metric?.unit)}</strong></CoreCard>;
}
