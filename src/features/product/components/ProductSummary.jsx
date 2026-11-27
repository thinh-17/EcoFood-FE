import { PRODUCT_TYPES } from "../lib/product.js";

export function ProductSummary({ form }) {
  return <div className="product-summary">
    <div className="product-summary-top">
      {form.imageUrl && <img src={form.imageUrl} alt={form.name} className="product-preview" />}
      <dl className="product-facts"><div><dt>Product name</dt><dd>{form.name || "—"}</dd></div><div><dt>Product code</dt><dd>{form.code || "—"}</dd></div><div><dt>Type</dt><dd>{PRODUCT_TYPES[form.type]}</dd></div><div><dt>Category</dt><dd>{form.category || "—"}</dd></div></dl>
    </div>
    {form.description && <p className="product-description">{form.description}</p>}
    <h3>Ingredients ({form.ingredients.length})</h3>
    {form.ingredients.length ? <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Ingredient</th><th>Quantity</th><th>Unit</th><th>Note</th></tr></thead><tbody>{form.ingredients.map((item, index) => <tr key={index}><td>{item.name}</td><td>{item.quantity}</td><td>{item.unit}</td><td>{item.note || "—"}</td></tr>)}</tbody></table></div> : <p className="product-muted">No ingredients declared.</p>}
    <h3>Recipe{form.recipeName ? ` · ${form.recipeName}` : ""}</h3>
    {form.recipeEnabled ? <><p className="product-muted">Preparation: {form.preparationMinutes} min · Cooking: {form.cookingMinutes} min</p><ol>{form.steps.map((step, index) => <li key={index}><strong>{step.name}</strong> · {step.durationMinutes} min<p className="product-description">{step.description}</p></li>)}</ol>{form.recipeNote && <p className="product-description">{form.recipeNote}</p>}</> : <p className="product-muted">No recipe required.</p>}
  </div>;
}
