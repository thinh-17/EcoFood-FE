import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CorePageHeader } from "@thinh-17/fe-core";
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
  if (!canReadBusinessDashboard(claims)) return <section className="business-dashboard"><CorePageHeader title="Business Dashboard" /><p role="alert">Bạn chưa có quyền DASHBOARD_READ trong Tenant hiện tại.</p></section>;
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
    <CorePageHeader title="Business Dashboard" description="KPI kỳ vọng và thực hiện theo Tenant, Proposition, kỳ và Currency." />
    <button className="business-refresh" onClick={() => client.invalidateQueries({ queryKey: root })}><FiRefreshCw /> Tải lại</button>
    {options.isPending && <p role="status">Đang tải phạm vi Dashboard…</p>}
    {error && <p role="alert" className="business-error"><FiAlertCircle /> {unavailable ? "Không có quyền Dashboard trong phạm vi đã chọn. " : ""}{dashboardError(error)}</p>}
    {options.data && chosen && <>
      <div className="business-filters">
        <label>Tenant<select value={chosen.tenantId} onChange={(e) => change("tenantId", e.target.value)}>
          {options.data.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          {options.data.partnerComparisonAllowed && selectedProp?.canViewTotal && <option value="__TOTAL__">Tổng Proposition trong phạm vi được phép</option>}
        </select></label>
        <label>Proposition<select value={chosen.propositionId} onChange={(e) => change("propositionId", e.target.value)}>
          <option value="">Tất cả trong phạm vi</option>{availableProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>
        <label>Currency<select value={chosen.currency} onChange={(e) => change("currency", e.target.value)}>
          {!chosen.currency && <option value="">Chưa xác định Currency</option>}{options.data.currencies.map((c) => <option key={c}>{c}</option>)}
        </select></label>
        <label>Năm<select value={chosen.year} onChange={(e) => change("year", Number(e.target.value))}>{options.data.years.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label>Chế độ kỳ<select value={chosen.period} onChange={(e) => change("period", e.target.value)}><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option></select></label>
        {chosen.period === "MONTHLY" && <label key="month">Tháng<select value={chosen.month} onChange={(e) => change("month", Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>}
        {chosen.period === "QUARTERLY" && <label key="quarter">Quý<select value={chosen.quarter} onChange={(e) => change("quarter", Number(e.target.value))}>{Array.from({ length: 4 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>}
      </div>
      {!chosen.currency && <p role="status">Chưa có tiền tệ từ số liệu kỳ vọng hoặc thực tế.</p>}
      {ready && summary.isPending && <p role="status">Đang tải KPI…</p>}
      {summary.data && !summary.isError && <>
        <p className="business-period">{periodLabel(summary.data.selection)} · {chosen.currency} · Kỳ Actual: Asia/Ho_Chi_Minh</p>
        <div className="business-cards">{Object.entries(KPI_NAMES).map(([name, label]) => <KpiCard key={name} name={name} label={label} metric={summary.data.metrics[name]} />)}</div>
        {summary.data.metrics.totalSalesVolume.actualStatus === "NO_RECORDED_TRANSACTIONS" && <p role="status">Chưa có giao dịch được ghi nhận cho bộ lọc và kỳ đang chọn.</p>}
        <label className="business-kpi-select">Chỉ số biểu đồ<select value={kpi} onChange={(e) => setKpi(e.target.value)}>{Object.entries(KPI_NAMES).map(([name, label]) => <option key={name} value={name}>{label}</option>)}</select></label>
        <div className="business-charts">
          <article><h2>Expected vs Actual</h2><ChartNotice metric={summary.data.metrics[kpi]} /><div className="business-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={single}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip content={<KpiTooltip kpi={kpi} />} /><Legend /><Bar dataKey="actual" name="Actual" fill="#177967" isAnimationActive={false} /><Bar dataKey="expected" name="Expected" fill="#7181a0" isAnimationActive={false} /></BarChart></ResponsiveContainer></div></article>
          <article><h2>Xu hướng {chosen.year}</h2>{trends.isPending && <p>Đang tải xu hướng…</p>}<div className="business-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip content={<KpiTooltip kpi={kpi} />} /><Legend /><Line type="linear" dataKey="actual" name="Actual" stroke="#177967" connectNulls={false} isAnimationActive={false} /><Line type="linear" dataKey="expected" name="Expected" stroke="#7181a0" connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></article>
        </div>
        {comparison.data && <BreakdownTable comparison={comparison.data} kpi={kpi} options={options.data} />}
        <p className="business-sync">Cập nhật số liệu gần nhất: {summary.data.lastUpdatedAt ? new Date(summary.data.lastUpdatedAt).toLocaleString("vi-VN") : "Chưa có"}.</p>
        <p className="business-sync">Expected lấy từ cấu hình hiện tại. Không chia Expected quý thành tháng; không quy đổi tiền tệ. Chi phí cao hơn ngân sách không được coi là thành tích.</p>
      </>}
    </>}
  </section>;
}
export function KpiCard({ name, label, metric }) {
  const missing = metric.actual == null;
  const cost = name.endsWith("Cost");
  const favorable = metric.variance == null ? "neutral" : (cost ? Number(metric.variance) <= 0 : Number(metric.variance) >= 0) ? "favorable" : "unfavorable";
  return <article className="business-card" data-testid={`kpi-${name}`}>
    <h2>{label}</h2><strong>{formatDashboardValue(metric.actual, metric.unit)}</strong>
    <p>Kỳ vọng: {expectedLabel(metric)}</p>
    <p className={`business-${favorable}`}>Chênh lệch: {metric.variance == null ? "Không đủ căn cứ so sánh" : formatDashboardValue(metric.variance, metric.unit)}</p>
    {metric.variancePercent != null && <p>Chênh lệch %: {metric.variancePercent}%</p>}
    {metric.achievementPercent != null && <p>Hoàn thành: {metric.achievementPercent}%</p>}
    {cost && <small>So sánh ngân sách</small>}
    {missing && metric.actualStatus === "INCOMPLETE" && <p className="business-warning">Chưa đủ dữ liệu · {metric.coveredInvoices}/{metric.totalInvoices} Invoice có dữ liệu xác minh</p>}
    {metric.actualStatus === "NO_RECORDED_TRANSACTIONS" && <small>Chưa có giao dịch được ghi nhận</small>}
  </article>;
}
function ChartNotice({ metric }) {
  return <p className="business-sync">{metric.actual == null ? "Actual chưa đủ dữ liệu. " : ""}{metric.expected == null ? expectedLabel(metric) : "Chỉ so sánh cùng kỳ và Currency."}</p>;
}
function KpiTooltip({ active, payload, kpi }) {
  const metric = payload?.[0]?.payload?.row?.metrics[kpi];
  if (!active || !metric) return null;
  return <div className="business-tooltip"><p>Actual: {formatDashboardValue(metric.actual, metric.unit)}</p><p>Expected: {expectedLabel(metric)}</p></div>;
}
function BreakdownTable({ comparison, kpi, options }) {
  const rows = comparison.byTenant.length > 1 ? comparison.byTenant : comparison.byProposition;
  return <article className="business-breakdown"><h2>So sánh theo {comparison.byTenant.length > 1 ? "Tenant" : "Proposition"}</h2><div className="business-table"><table><thead><tr><th>Phạm vi</th><th>Actual</th><th>Expected</th><th>Chênh lệch</th></tr></thead><tbody>{rows.map((row) => {
    const metric = row.summary.metrics[kpi];
    const label = row.tenantId ? options.tenants.find((t) => t.id === row.tenantId)?.name : options.propositions.find((p) => p.id === row.propositionId)?.name;
    return <tr key={`${row.tenantId || ""}/${row.propositionId || ""}`}><td>{label || row.tenantId || row.propositionId}</td><td>{formatDashboardValue(metric.actual, metric.unit)}</td><td>{expectedLabel(metric)}</td><td>{metric.variance == null ? "—" : formatDashboardValue(metric.variance, metric.unit)}</td></tr>;
  })}</tbody></table>{rows.length === 0 && <p>Chưa có Proposition trong phạm vi được phép.</p>}</div></article>;
}
