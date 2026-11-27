import { ProductSuggestionInput } from "./ProductSuggestionInput.jsx";
const CATEGORIES = ["Main dishes", "Side dishes", "Drinks", "Desserts", "Combos", "Other"];
export function ProductCategoryInput({ value, onChange }) {
  return <ProductSuggestionInput value={value} onChange={onChange} label="Category *" suggestions={CATEGORIES} listLabel="Categories" placeholder="Select or enter a category" className="product-category" />;
}
