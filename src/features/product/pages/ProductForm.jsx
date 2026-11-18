import { CURRENCIES } from "../../../constants/currencies.js";
import { ProductUnitInput } from "./ProductUnitInput.jsx";
import { ProductCategoryInput } from "./ProductCategoryInput.jsx";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBox, FiCheck, FiCopy, FiLayers, FiPackage } from "react-icons/fi";
import { createProduct, getReferenceProducts, productAction, updateProduct } from "../api/product.api.js";
import { PRODUCT_STEPS, PRODUCT_TYPES, buildProductPayload, inheritIngredients, productMoney, productError, productFormState, validateProductStep } from "../lib/product.js";
import { ProductSummary } from "./ProductSummary.jsx";
import { ProductCostingPanel } from "./ProductCostingPanel.jsx";

const TYPE_CARDS = [
  { type: "STANDALONE", icon: FiPackage, description: "A complete product that can be sold independently.", example: "Boiled chicken, soft drink, white rice", rules: "No base product required." },
  { type: "ADAPTED", icon: FiCopy, description: "Adjust an existing Master product to create a new product.", example: "Master meal → Customized meal", rules: "Select one Master product with an approved version." },
  { type: "MASTER", icon: FiLayers, description: "Combine existing products into a single selling package.", example: "Lunch combo = Chicken + Soft drink", rules: "Select at least two Standalone or Adapted products." },
];

export function ProductForm({ product, scope, onSaved, onCancel, onBusyChange }) {
  const client = useQueryClient();
  const [form, setForm] = useState(() => productFormState(product));
  const [savedProduct, setSavedProduct] = useState(product ?? null);
  const [step, setStep] = useState(0);
  const [validation, setValidation] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [referenceSearch, setReferenceSearch] = useState("");
  const [componentId, setComponentId] = useState("");
  const refs = useQuery({ queryKey: ["products", scope, "references"], queryFn: ({ signal }) => getReferenceProducts(signal), enabled: form.type !== "STANDALONE" });
  const references = (refs.data ?? []).filter((item) => item.id !== savedProduct?.id);
  const base = references.find((item) => item.id === form.sourceProductId);
  const choices = references.filter((item) => (form.type === "ADAPTED" ? item.type === "MASTER" && item.approvedSource : ["STANDALONE", "ADAPTED"].includes(item.type)) && !form.componentProducts.some((component) => component.productId === item.id) && `${item.name} ${item.code ?? ""}`.toLowerCase().includes(referenceSearch.toLowerCase()));
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const changeRow = (field, index, key, value) => set(field, form[field].map((row, i) => i === index ? { ...row, [key]: value } : row));
  const remove = (field, index) => set(field, form[field].filter((_, i) => i !== index));
  const mutation = useMutation({
    mutationFn: async ({ payload, submit }) => {
      const draft = savedProduct ? await updateProduct(savedProduct.id, payload) : await createProduct(payload);
      setSavedProduct(draft);
      client.setQueryData(["products", scope, "detail", draft.id], draft);
      client.invalidateQueries({ queryKey: ["products", scope] });
      setDraftMessage(`Draft ${draft.code || draft.id} saved. If submission fails, retry here or reopen it from the product list.`);
      return submit ? productAction(draft.id, "submit") : draft;
    },
    onSuccess: (result) => {
      client.setQueryData(["products", scope, "detail", result.id], result);
      client.invalidateQueries({ queryKey: ["products", scope] });
      onSaved(result);
    },
    onSettled: () => onBusyChange?.(false),
  });
  function goNext() {
    try { validateProductStep(form, step); setValidation(""); setStep(step + 1); } catch (err) { setValidation(err.message); }
  }
  function save(submit) {
    try {
      for (let index = 0; index < 5; index++) {
        try { validateProductStep(form, index, submit); } catch (err) { setStep(index); throw err; }
      }
      const payload = buildProductPayload(form, savedProduct, submit);
      setValidation(""); onBusyChange?.(true); mutation.mutate({ payload, submit });
    } catch (err) { setValidation(err.message); }
  }
  function importIngredients() {
    try {
      const sources = form.type === "ADAPTED" ? (base ? [{ product: base, quantity: 1 }] : []) : form.componentProducts.map((item) => ({ product: references.find((entry) => entry.id === item.productId), quantity: item.quantity }));
      if (!sources.length || sources.some((item) => !item.product || !(Number(item.quantity) > 0))) throw new Error("Select valid source products and quantities in Definition first.");
      set("ingredients", inheritIngredients(sources)); setValidation("");
    } catch (err) { setValidation(err.message); }
  }
  function copyRecipe() {
    if (!base?.recipe?.enabled) { setValidation("The selected base product has no recipe to inherit."); return; }
    const inherited = productFormState(base);
    setForm((current) => ({ ...current, recipeEnabled: true, recipeName: inherited.recipeName, preparationMinutes: inherited.preparationMinutes, cookingMinutes: inherited.cookingMinutes, recipeNote: inherited.recipeNote, steps: inherited.steps }));
    setValidation("");
  }
  const busy = mutation.isPending;
  return <div className="product-wizard">
    <aside className="product-stepper" aria-label="Create product steps"><ol>{PRODUCT_STEPS.map((label, index) => <li key={label} className={step === index ? "is-current" : step > index ? "is-complete" : ""}><button type="button" disabled={busy || index > step} aria-current={index === step ? "step" : undefined} onClick={() => { setStep(index); setValidation(""); }}><span>{step > index ? <FiCheck /> : index + 1}</span>{label}</button></li>)}</ol><p>Define your product, then save a draft or submit it for review.</p></aside>
    <div className="product-wizard-content">
      <header className="product-wizard-heading"><small>STEP {step + 1} OF 6</small><h2>{step === 5 ? "Product Summary" : PRODUCT_STEPS[step]}</h2><p>{["Choose the structure of your product.", "Enter basic information and define product relationships.", "Add ingredients, inherit them from related products, or skip this step.", "Define preparation instructions, or skip for ready-to-sell products.", "Set a basic selling price. Pricing is required when submitting.", "Review all information before saving or submitting for approval."][step]}</p></header>
      <fieldset className="product-wizard-fields" disabled={busy}>
        {step === 0 && <div className="product-type-cards" role="radiogroup" aria-label="Product type">{TYPE_CARDS.map(({ type, icon: Icon, description, example, rules }) => <label key={type} className={`product-type-card ${form.type === type ? "is-selected" : ""}`}><input type="radio" name="productType" value={type} checked={form.type === type} disabled={Boolean(savedProduct)} onChange={() => { setForm((current) => ({ ...current, type, sourceProductId: "", componentProducts: [] })); setComponentId(""); setReferenceSearch(""); }} /><Icon className="product-type-icon" /><strong>{PRODUCT_TYPES[type]}</strong><p>{description}</p><small>{rules}</small><span className="product-type-example">{example}</span></label>)}</div>}
        {step === 1 && <>
          <div className="product-grid"><label>Product name *<input value={form.name} onChange={(e) => set("name", e.target.value)} /></label><label>Product code *<input maxLength={64} disabled={Boolean(savedProduct?.code)} value={form.code} onChange={(e) => set("code", e.target.value)} /><small>Unique in your enterprise. Fixed after creation.</small></label></div>
          <div className="product-grid"><ProductCategoryInput value={form.category} onChange={(value) => set("category", value)} /><label>Product type<input readOnly value={PRODUCT_TYPES[form.type]} /></label></div>
          <label>Description<textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
          <label>Product image URL<input type="url" value={form.imageUrl} placeholder="https://..." onChange={(e) => set("imageUrl", e.target.value)} /><small>Optional HTTP(S) link to the product image.</small></label>
          {/^https?:\/\//i.test(form.imageUrl) && <img className="product-preview" src={form.imageUrl} alt="Product preview" />}
          {form.type !== "STANDALONE" && <div className="product-relations"><h3>{form.type === "ADAPTED" ? "Base product" : "Component products"}</h3>
            {refs.isPending && <p role="status">Loading products...</p>}
            {refs.isError && <p className="product-error" role="alert">{productError(refs.error)} <button type="button" onClick={() => refs.refetch()}>Retry</button></p>}
            <label>Search existing products<input type="search" value={referenceSearch} onChange={(e) => setReferenceSearch(e.target.value)} placeholder="Search by name or code" /></label>
            {form.type === "ADAPTED" ? <label>Master base product *<select disabled={Boolean(savedProduct) || refs.isPending || refs.isError} value={form.sourceProductId} onChange={(e) => set("sourceProductId", e.target.value)}><option value="">Select an approved Master product</option>{base && !choices.some((item) => item.id === base.id) && <option value={base.id}>{base.name} ({base.code || base.id})</option>}{choices.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code || item.id}) · v{item.version}</option>)}</select></label> : <>
              {form.componentProducts.map((item, index) => <div className="product-component-row" key={item.productId}><strong>{references.find((entry) => entry.id === item.productId)?.name ?? item.productId}</strong><label>Quantity *<input type="number" min="0" step="any" value={item.quantity} onChange={(e) => changeRow("componentProducts", index, "quantity", e.target.value)} /></label><button type="button" onClick={() => remove("componentProducts", index)}>Remove</button></div>)}
              <div className="product-component-row"><label>Add component<select value={componentId} disabled={refs.isPending || refs.isError} onChange={(e) => setComponentId(e.target.value)}><option value="">Select Standalone or Adapted</option>{choices.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code || item.id})</option>)}</select></label><button type="button" disabled={!componentId || !choices.some((item) => item.id === componentId)} onClick={() => { set("componentProducts", [...form.componentProducts, { productId: componentId, quantity: 1 }]); setComponentId(""); }}>+ Add component</button></div>
            </>}
            {refs.isSuccess && !choices.length && !form.sourceProductId && <p className="product-muted">{form.type === "ADAPTED" ? "No matching approved Master products available." : "No matching products available. Create the required component products first."}</p>}
          </div>}
        </>}
        {step === 2 && <>
          <div className="product-section-heading"><h3>Ingredients ({form.ingredients.length})</h3><div className="product-inline-actions">{form.type !== "STANDALONE" && <button type="button" disabled={refs.isPending || refs.isError} onClick={importIngredients}>Inherit from {form.type === "ADAPTED" ? "base product" : "components"}</button>}<button type="button" onClick={() => set("ingredients", [...form.ingredients, { name: "", quantity: "", unit: "g", note: "" }])}>+ Add ingredient</button></div></div>
          {form.type !== "STANDALONE" && <p className="product-muted">Inheriting replaces the current list with a copy you can edit. Component quantities scale their ingredients.</p>}
          {!form.ingredients.length && <div className="product-state"><FiBox size={28} /><p>No ingredients added. You can continue without them.</p></div>}
          {form.ingredients.map((item, index) => <div className="product-step" key={index}><div className="product-ingredient-row"><label>Ingredient name *<input value={item.name} onChange={(e) => changeRow("ingredients", index, "name", e.target.value)} /></label><label>Quantity *<input type="number" min="0" step="any" value={item.quantity} onChange={(e) => changeRow("ingredients", index, "quantity", e.target.value)} /></label><ProductUnitInput value={item.unit} onChange={(value) => changeRow("ingredients", index, "unit", value)} /><button type="button" onClick={() => remove("ingredients", index)}>Remove</button></div><label>Note<input value={item.note} onChange={(e) => changeRow("ingredients", index, "note", e.target.value)} /></label></div>)}
        </>}
        {step === 3 && <>
          <div className="product-section-heading"><label className="product-check"><input type="checkbox" checked={form.recipeEnabled} onChange={(e) => set("recipeEnabled", e.target.checked)} />Enable recipe</label>{form.type === "ADAPTED" && <button type="button" disabled={!base?.recipe?.enabled} onClick={copyRecipe}>Inherit base recipe</button>}</div>
          {form.type === "MASTER" && <p className="product-muted">A combo may use each component's own recipe. A shared recipe is optional.</p>}
          {form.recipeEnabled ? <><label>Recipe name<input value={form.recipeName} onChange={(e) => set("recipeName", e.target.value)} /></label><div className="product-grid"><label>Preparation time (minutes)<input type="number" min="0" step="1" value={form.preparationMinutes} onChange={(e) => set("preparationMinutes", e.target.value)} /></label><label>Cooking time (minutes)<input type="number" min="0" step="1" value={form.cookingMinutes} onChange={(e) => set("cookingMinutes", e.target.value)} /></label></div>
            {form.steps.map((item, index) => <div className="product-step" key={index}><div className="product-section-heading"><strong>Step {index + 1}</strong><div className="product-inline-actions"><button type="button" disabled={index === 0} aria-label={`Move step ${index + 1} up`} onClick={() => { const steps = [...form.steps]; [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]]; set("steps", steps); }}>↑</button><button type="button" disabled={index === form.steps.length - 1} aria-label={`Move step ${index + 1} down`} onClick={() => { const steps = [...form.steps]; [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]]; set("steps", steps); }}>↓</button><button type="button" onClick={() => remove("steps", index)}>Remove</button></div></div><div className="product-grid"><label>Step name *<input value={item.name} onChange={(e) => changeRow("steps", index, "name", e.target.value)} /></label><label>Duration (minutes) *<input type="number" min="0" step="1" value={item.durationMinutes} onChange={(e) => changeRow("steps", index, "durationMinutes", e.target.value)} /></label></div><label>Instructions<textarea rows={3} value={item.description} onChange={(e) => changeRow("steps", index, "description", e.target.value)} /></label></div>)}
            <button type="button" onClick={() => set("steps", [...form.steps, { name: "", description: "", durationMinutes: 0 }])}>+ Add step</button><label className="product-recipe-note">Recipe note<textarea rows={2} value={form.recipeNote} onChange={(e) => set("recipeNote", e.target.value)} /></label></> : <p className="product-state">No recipe required. Continue to pricing.</p>}
        </>}
        {step === 4 && <>
          <label>Currency *<select value={form.currency} onChange={(event) => set("currency", event.target.value)}>{CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} - {currency.name}</option>)}</select><small>Applies to all costs and the selling price. Changing currency does not convert amounts.</small></label>
          <ProductCostingPanel currency={form.currency} costing={form.costing} onChange={(value) => set("costing", value)} />
          <div className="product-pricing-method"><strong>Fixed Price</strong><p>One basic selling price for this product.</p></div>
          <label className="product-check"><input type="checkbox" checked={form.pricingEnabled} onChange={(e) => set("pricingEnabled", e.target.checked)} />Set pricing now</label>
          {!form.pricingEnabled && <p className="product-muted">You may save a draft without pricing. Set a selling price before submitting.</p>}
          {form.pricingEnabled && <><div className="product-grid product-pricing-fields"><label>Selling price *<input type="number" min="0" step="any" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} /></label><label>Currency<input readOnly value={form.currency} /></label></div><label>Pricing note<textarea rows={3} value={form.pricingNote} onChange={(e) => set("pricingNote", e.target.value)} /></label></>}
          {base?.pricing && <p className="product-muted">Base product selling price: {productMoney(base.pricing.sellingPrice, base.pricing.currency)}. Set your own price independently.</p>}
          {form.type === "MASTER" && <p className="product-muted">The combo price is independent of the sum of component prices.</p>}
        </>}
        {step === 5 && <><ProductSummary form={form} references={references} /><div className="product-review-flow"><span>Draft</span><span>→</span><span>Pending Review</span><span>→</span><span>Approved</span></div><p className="product-muted">Approved products can be used to create Propositions.</p></>}
      </fieldset>
      {validation && <p className="product-error" role="alert">{validation}</p>}
      {draftMessage && mutation.isError && <p className="product-notice" role="status">{draftMessage}</p>}
      {mutation.isError && <p className="product-error" role="alert">{productError(mutation.error)}{mutation.error?.response?.status === 409 && " Close and reopen the draft to load its latest revision before retrying."}</p>}
      <footer className="product-form-actions"><button type="button" disabled={busy} onClick={onCancel}>Cancel</button>{step > 0 && <button type="button" disabled={busy} onClick={() => { setStep(step - 1); setValidation(""); }}>Back</button>}{step === 2 && <button type="button" disabled={busy} onClick={() => { set("ingredients", []); setStep(3); setValidation(""); }}>Skip ingredients</button>}{step === 3 && <button type="button" disabled={busy} onClick={() => { set("recipeEnabled", false); setStep(4); setValidation(""); }}>Skip recipe</button>}{step >= 1 && <button type="button" disabled={busy} onClick={() => save(false)}>Save Draft</button>}{step < 5 ? <button type="button" className="product-primary" disabled={busy} onClick={goNext}>Next</button> : <button type="button" className="product-primary" disabled={busy} onClick={() => save(true)}>{busy ? "Saving..." : "Submit for review"}</button>}</footer>
    </div>
  </div>;
}
