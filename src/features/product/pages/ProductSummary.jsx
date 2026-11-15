import { PRODUCT_TYPES, COST_FIELDS, calculateProductCost, productMoney } from "../lib/product.js";

export function ProductSummary({ form, references = [] }) {
  const name = (id) => { const item = references.find((product) => product.id === id); return item ? `${item.name}${item.code ? ` (${item.code})` : ""}` : id; };
  return <div className="product-summary">
    <div className="product-summary-top">
      {form.imageUrl && <img src={form.imageUrl} alt={form.name} className="product-preview" />}
      <dl className="product-facts"><div><dt>Product name</dt><dd>{form.name || "—"}</dd></div><div><dt>Product code</dt><dd>{form.code || "—"}</dd></div><div><dt>Type</dt><dd>{PRODUCT_TYPES[form.type]}</dd></div><div><dt>Category</dt><dd>{form.category || "—"}</dd></div></dl>
    </div>
    {form.description && <p className="product-description">{form.description}</p>}
    {form.type === "ADAPTED" && <p><strong>Base product:</strong> {name(form.sourceProductId)}</p>}
    {form.type === "MASTER" && <><h3>Component products</h3><ul>{form.componentProducts.map((item) => <li key={item.productId}>{name(item.productId)} × {item.quantity}</li>)}</ul></>}
    <h3>Ingredients ({form.ingredients.length})</h3>
    {form.ingredients.length ? <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Ingredient</th><th>Quantity</th><th>Unit</th><th>Note</th></tr></thead><tbody>{form.ingredients.map((item, index) => <tr key={index}><td>{item.name}</td><td>{item.quantity}</td><td>{item.unit}</td><td>{item.note || "—"}</td></tr>)}</tbody></table></div> : <p className="product-muted">No ingredients declared.</p>}
    <h3>Recipe{form.recipeName ? ` · ${form.recipeName}` : ""}</h3>
    {form.recipeEnabled ? <><p className="product-muted">Preparation: {form.preparationMinutes} min · Cooking: {form.cookingMinutes} min</p><ol>{form.steps.map((step, index) => <li key={index}><strong>{step.name}</strong> · {step.durationMinutes} min<p className="product-description">{step.description}</p></li>)}</ol>{form.recipeNote && <p className="product-description">{form.recipeNote}</p>}</> : <p className="product-muted">No recipe required.</p>}
    <h3>Costing overview</h3><dl className="product-facts">{Object.entries(COST_FIELDS).map(([key,label]) => <div key={key}><dt>{label}</dt><dd>{productMoney(form.costing[key])}</dd></div>)}<div><dt>Target margin / tax</dt><dd>{form.costing.targetMargin}% / {form.costing.tax}%</dd></div></dl>
    <div className="product-cost-results"><div>Total cost<strong>{productMoney(calculateProductCost(form.costing).totalCost)}</strong></div><div>Suggested base price<strong>{productMoney(calculateProductCost(form.costing).basePrice)}</strong></div></div>
    <h3>Selling price</h3>
    {form.pricingEnabled ? <><p className="product-summary-price">{productMoney(form.sellingPrice)}</p>{form.pricingNote && <p className="product-description">{form.pricingNote}</p>}</> : <p className="product-muted">No pricing set. You can save a draft; pricing is required to submit.</p>}
  </div>;
}
