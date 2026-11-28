import { CoreCard } from "@thinh-17/fe-core";
import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { dashboardChartValue, formatDashboardValue, KPI_NAMES, periodLabel } from "../lib/businessDashboard.js";

function points(rows, kpi) {
  return rows.map((row) => ({ name: periodLabel(row.selection), metric: row.metrics[kpi],
    actual: dashboardChartValue(row.metrics[kpi]?.actual), expected: dashboardChartValue(row.metrics[kpi]?.expected) }));
}
function MetricTooltip({ active, payload }) {
  const metric = payload?.[0]?.payload?.metric;
  if (!active || !metric) return null;
  return <div className="business-tooltip"><p>Actual: {formatDashboardValue(metric.actual, metric.unit)}</p>
    {metric.expected != null && <p>Expected: {formatDashboardValue(metric.expected, metric.unit)}</p>}</div>;
}
export function BusinessDashboardCharts({ summary, trends, kpi, year, loading, error, onRetry }) {
  const current = points([summary], kpi), history = points(trends || [], kpi);
  const hasExpected = summary.metrics[kpi]?.expected != null;
  const hasExpectedTrend = (trends || []).some((row) => row.metrics[kpi]?.expected != null);
  return <div className="business-charts">
    <CoreCard>
      <h2>{hasExpected ? "Expected vs Actual" : "Actual by selected period"}</h2>
      <p className="business-sync">{KPI_NAMES[kpi]} · {periodLabel(summary.selection)}</p>
      <div className="business-chart" role="img" aria-label={KPI_NAMES[kpi] + " for the selected period"}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={current}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip content={<MetricTooltip />} /><Legend />
          <Bar dataKey="actual" name="Actual" fill="#177967" isAnimationActive={false} />
          {hasExpected && <Bar dataKey="expected" name="Expected" fill="#7181a0" isAnimationActive={false} />}
        </BarChart></ResponsiveContainer>
      </div>
      {summary.metrics[kpi]?.actual == null && <p className="business-sync">No recorded value for this period.</p>}
    </CoreCard>
    <CoreCard>
      <h2>Trend {year}</h2>
      <p className="business-sync">{KPI_NAMES[kpi]} · {summary.selection.currency}</p>
      {loading ? <p role="status">Loading trend…</p> : error ? <p role="alert">Unable to load trend. <button type="button" onClick={onRetry}>Retry</button></p> :
        <div className="business-chart" role="img" aria-label={KPI_NAMES[kpi] + " trend for " + year}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip content={<MetricTooltip />} /><Legend />
            <Line type="linear" dataKey="actual" name="Actual" stroke="#177967" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
            {hasExpectedTrend && <Line type="linear" dataKey="expected" name="Expected" stroke="#7181a0" connectNulls={false} isAnimationActive={false} />}
          </LineChart></ResponsiveContainer>
        </div>}
    </CoreCard>
  </div>;
}
