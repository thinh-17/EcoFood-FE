import { CoreButton } from "@thinh-17/fe-core";
import { money } from "../lib/proposition.js";
import {
  appendRevenueYear,
  normalizeQuarterlyMetrics,
} from "../lib/quarterlyMetrics.js";
const METRICS = {
  totalSalesVolume: "Sales volume",
  profit: "Profit",
  ingredientCost: "Ingredient cost",
  platformCost: "Platform cost",
};
export function MetricsEditor({
  value,
  onChange,
  currency = "USD",
  canAddYear = false,
}) {
  const years = [...new Set(value.map((row) => row.year))];
  const change = (year, quarter, revenue) =>
    onChange(
      value.map((row) =>
        row.year === year && row.quarter === quarter
          ? { ...row, revenue }
          : row,
      ),
    );
  return (
    <div className="prop-metrics">
      <div className="prop-table-wrap">
        <table className="prop-table prop-revenue-table">
          <caption>Quarterly revenue ({currency})</caption>
          <thead>
            <tr>
              <th scope="col">Year</th>
              {[1, 2, 3, 4].map((quarter) => (
                <th scope="col" key={quarter}>
                  Q{quarter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year}>
                <th scope="row">{year}</th>
                {[1, 2, 3, 4].map((quarter) => {
                  const row = value.find(
                    (item) => item.year === year && item.quarter === quarter,
                  );
                  return (
                    <td key={quarter}>
                      {row ? (
                        <input
                          aria-label={`Revenue Q${quarter}/${year} (${currency})`}
                          type="number"
                          min="0"
                          step="any"
                          value={row.revenue ?? ""}
                          onChange={(event) =>
                            change(year, quarter, event.target.value)
                          }
                        />
                      ) : (
                        <span className="prop-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canAddYear && (
        <CoreButton
          variant="secondary"
          size="sm"
          className="prop-add-year"
          disabled={value.at(-1)?.year >= 9999}
          onClick={() => onChange(appendRevenueYear(value))}
        >
          + Add year (4 quarters)
        </CoreButton>
      )}
    </div>
  );
}
export function MetricsTable({ value, currency }) {
  if (!value?.length)
    return <p className="prop-muted">No indicators recorded.</p>;
  const rows = normalizeQuarterlyMetrics(value);
  const columns = {
    revenue: "Revenue",
    ...Object.fromEntries(
      Object.entries(METRICS).filter(([key]) =>
        rows.some((row) => row[key] != null),
      ),
    ),
  };
  return (
    <div className="prop-table-wrap">
      <table className="prop-table">
        <thead>
          <tr>
            <th>Period</th>
            {Object.entries(columns).map(([key, label]) => (
              <th key={key}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.year}-${row.quarter}`}>
              <td>
                Q{row.quarter}/{row.year}
              </td>
              {Object.keys(columns).map((key) => (
                <td key={key}>
                  {key === "totalSalesVolume"
                    ? (row[key] ?? "—")
                    : money(row[key], currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Field({
  label,
  value,
  onChange,
  type = "text",
  labelClassName,
  error,
  ...props
}) {
  return (
    <label className={labelClassName}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
      {error}
    </label>
  );
}
