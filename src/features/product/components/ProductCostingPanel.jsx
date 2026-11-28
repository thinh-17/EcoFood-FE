import { COST_FIELDS, calculateProductCost, productMoney } from "../lib/product.js";
// `invalidFields` lists cost keys to highlight as required-but-empty (set by the Plan save validation).
export function ProductCostingPanel({ costing, currency = "VND", onChange, showBasePrice = true, invalidFields = [] }) {
  const result = calculateProductCost(costing);
  return <section aria-label="Product costing">
    <h3>Cost breakdown</h3><p className="product-muted">Enter the cost per product in {currency}. Every cost marked * is required; enter 0 if there is none. The suggested price includes target margin and tax.</p>
    <div className="product-grid">{Object.entries(COST_FIELDS).map(([key, label]) => {
      const invalid = invalidFields.includes(key);
      return <label key={key} className={invalid ? "fe-field-invalid" : ""}>{label} ({currency}) *<input type="number" min="0" step="any" required aria-invalid={invalid || undefined} value={costing[key]} onChange={(event) => onChange({ ...costing, [key]: event.target.value })} />{invalid && <span className="fe-field-error">{label} is required.</span>}</label>;
    })}
      <label>Target margin (%)<input type="number" min="0" max="99.99" step="any" value={costing.targetMargin} onChange={(event) => onChange({ ...costing, targetMargin: event.target.value })} /></label>
      <label>Tax (%)<input type="number" min="0" max="100" step="any" value={costing.tax} onChange={(event) => onChange({ ...costing, tax: event.target.value })} /></label>
    </div>
    <div className="product-cost-results"><div>Total cost<strong>{productMoney(result.totalCost, currency)}</strong></div>{showBasePrice && <div>Suggested base price<strong>{productMoney(result.basePrice, currency)}</strong></div>}</div>
    <p className="product-muted">Total cost = ingredients + packaging + labor + operation + marketing.{showBasePrice && <><br />Suggested price = total cost ÷ (1 − margin %) × (1 + tax %).</>} The backend recalculates these values when saving.</p>
  </section>;
}
