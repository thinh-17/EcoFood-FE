import { ProductSuggestionInput } from "./ProductSuggestionInput.jsx";
const UNITS = ["g", "kg", "ml", "l", "piece"];
export function ProductUnitInput({ value, onChange }) {
  return <ProductSuggestionInput value={value} onChange={onChange} label="Unit *" suggestions={UNITS} listLabel="Ingredient units" placeholder="Select or enter a unit" className="product-unit" />;
}
