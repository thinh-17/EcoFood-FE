import { ProductUnitInput } from "./ProductUnitInput.jsx";
import { ProductCategoryInput } from "./ProductCategoryInput.jsx";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FiBox, FiCheck, FiPackage } from "react-icons/fi";
import { createProduct, productAction, updateProduct } from "../api/product.api.js";
import { PRODUCT_STEPS, PRODUCT_TYPES, buildProductPayload, productError, productFormState, validateProductStep } from "../lib/product.js";
import { ProductSummary } from "./ProductSummary.jsx";
import { useTouched } from "../../../hooks/useTouched.js";

const isQuantityInvalid = (value) => !(value !== "" && Number.isFinite(Number(value)) && Number(value) > 0);
const isDurationInvalid = (value) => !(value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number.isInteger(Number(value)));
function touchKeysForStep(form, step) {
  if (step === 1) return ["name"];
  if (step === 2) return form.ingredients.flatMap((_, index) => [`ingredient-name-${index}`, `ingredient-quantity-${index}`]);
  if (step === 3 && form.recipeEnabled) return form.steps.flatMap((_, index) => [`step-name-${index}`, `step-duration-${index}`]);
  return [];
}

const TYPE_CARDS = [
  { type: "STANDALONE", icon: FiPackage, description: "A complete product that can be sold independently.", example: "Boiled chicken, soft drink, white rice", rules: "No base product required." },
];

export function ProductForm({ product, scope, onSaved, onCancel, onBusyChange, onStepChange, extraFooterActions, readOnly = false }) {
  const client = useQueryClient();
  const [form, setForm] = useState(() => productFormState(product));
  const { touched, touch, touchAll } = useTouched();
  const [savedProduct, setSavedProduct] = useState(product ?? null);
  const [step, setStep] = useState(0);
  const [validation, setValidation] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  useEffect(() => { onStepChange?.(step); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
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
    touchAll(touchKeysForStep(form, step));
    try { validateProductStep(form, step, Boolean(savedProduct)); setValidation(""); setStep(step + 1); } catch (err) { setValidation(err.message); }
  }
  function save(submit) {
    touchAll([1, 2, 3].flatMap((index) => touchKeysForStep(form, index)));
    try {
      for (let index = 0; index < 4; index++) {
        try { validateProductStep(form, index, Boolean(savedProduct)); } catch (err) { setStep(index); throw err; }
      }
      const payload = buildProductPayload(form, savedProduct);
      setValidation(""); onBusyChange?.(true); mutation.mutate({ payload, submit });
    } catch (err) { setValidation(err.message); }
  }
  const busy = mutation.isPending;
  return <div className="product-wizard">
    <aside className="product-stepper" aria-label="Create product steps"><ol>{PRODUCT_STEPS.map((label, index) => <li key={label} className={step === index ? "is-current" : step > index ? "is-complete" : ""}><button type="button" disabled={busy || index > step} aria-current={index === step ? "step" : undefined} onClick={() => { setStep(index); setValidation(""); }}><span>{step > index ? <FiCheck /> : index + 1}</span>{label}</button></li>)}</ol><p>Define your product, then save a draft or submit it for review.</p></aside>
    <div className="product-wizard-content">
      <header className="product-wizard-heading"><small>STEP {step + 1} OF 5</small><h2>{step === 4 ? "Product Summary" : PRODUCT_STEPS[step]}</h2><p>{["Choose the structure of your product.", "Enter basic information and define product relationships.", "Add ingredients, or skip this step.", "Define preparation instructions, or skip for ready-to-sell products.", "Review all information before saving or submitting for approval."][step]}</p></header>
      <fieldset className="product-wizard-fields" disabled={busy || readOnly}>
        {step === 0 && <div className="product-type-cards" role="radiogroup" aria-label="Product type">{TYPE_CARDS.map(({ type, icon: Icon, description, example, rules }) => <label key={type} className={`product-type-card ${form.type === type ? "is-selected" : ""}`}><input type="radio" name="productType" value={type} checked={form.type === type} disabled={Boolean(savedProduct)} onChange={() => setForm((current) => ({ ...current, type }))} /><Icon className="product-type-icon" /><strong>{PRODUCT_TYPES[type]}</strong><p>{description}</p><small>{rules}</small><span className="product-type-example">{example}</span></label>)}</div>}
        {step === 1 && <>
          <div className="product-grid"><label className={touched.name && !form.name.trim() ? "fe-field-invalid" : ""}>Product name *<input value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={touch("name")} />{touched.name && !form.name.trim() && <span className="fe-field-error">Product name is required.</span>}</label>{savedProduct?.code && <label>Product code<input disabled value={savedProduct.code} /><small>Auto-generated at creation.</small></label>}</div>
          <div className="product-grid"><ProductCategoryInput value={form.category} onChange={(value) => set("category", value)} /><label>Product type<input disabled value={PRODUCT_TYPES[form.type]} /></label></div>
          <label>Description<textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
          <label>Product image URL<input type="url" value={form.imageUrl} placeholder="https://..." onChange={(e) => set("imageUrl", e.target.value)} /><small>Optional HTTP(S) link to the product image.</small></label>
          {/^https?:\/\//i.test(form.imageUrl) && <img className="product-preview" src={form.imageUrl} alt="Product preview" />}
        </>}
        {step === 2 && <>
          <div className="product-section-heading"><h3>Ingredients ({form.ingredients.length})</h3><div className="product-inline-actions"><button type="button" onClick={() => set("ingredients", [...form.ingredients, { name: "", quantity: "", unit: "g", note: "" }])}>+ Add ingredient</button></div></div>
          {!form.ingredients.length && <div className="product-state"><FiBox size={28} /><p>No ingredients added. You can continue without them.</p></div>}
          {form.ingredients.map((item, index) => { const nameInvalid = touched[`ingredient-name-${index}`] && !item.name.trim(); const quantityInvalid = touched[`ingredient-quantity-${index}`] && isQuantityInvalid(item.quantity); return <div className="product-step" key={index}><div className="product-ingredient-row"><label className={nameInvalid ? "fe-field-invalid" : ""}>Ingredient name *<input value={item.name} onChange={(e) => changeRow("ingredients", index, "name", e.target.value)} onBlur={touch(`ingredient-name-${index}`)} />{nameInvalid && <span className="fe-field-error">Ingredient name is required.</span>}</label><label className={quantityInvalid ? "fe-field-invalid" : ""}>Quantity *<input type="number" min="0" step="any" value={item.quantity} onChange={(e) => changeRow("ingredients", index, "quantity", e.target.value)} onBlur={touch(`ingredient-quantity-${index}`)} />{quantityInvalid && <span className="fe-field-error">Quantity is required.</span>}</label><ProductUnitInput value={item.unit} onChange={(value) => changeRow("ingredients", index, "unit", value)} /><button type="button" onClick={() => remove("ingredients", index)}>Remove</button></div><label>Note<input value={item.note} onChange={(e) => changeRow("ingredients", index, "note", e.target.value)} /></label></div>; })}
        </>}
        {step === 3 && <>
          <div className="product-section-heading"><label className="product-check"><input type="checkbox" checked={form.recipeEnabled} onChange={(e) => set("recipeEnabled", e.target.checked)} />Enable recipe</label></div>
          {form.recipeEnabled ? <><label>Recipe name<input value={form.recipeName} onChange={(e) => set("recipeName", e.target.value)} /></label><div className="product-grid"><label>Preparation time (minutes)<input type="number" min="0" step="1" value={form.preparationMinutes} onChange={(e) => set("preparationMinutes", e.target.value)} /></label><label>Cooking time (minutes)<input type="number" min="0" step="1" value={form.cookingMinutes} onChange={(e) => set("cookingMinutes", e.target.value)} /></label></div>
            {form.steps.map((item, index) => { const stepNameInvalid = touched[`step-name-${index}`] && !item.name.trim(); const durationInvalid = touched[`step-duration-${index}`] && isDurationInvalid(item.durationMinutes); return <div className="product-step" key={index}><div className="product-section-heading"><strong>Step {index + 1}</strong><div className="product-inline-actions"><button type="button" disabled={index === 0} aria-label={`Move step ${index + 1} up`} onClick={() => { const steps = [...form.steps]; [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]]; set("steps", steps); }}>↑</button><button type="button" disabled={index === form.steps.length - 1} aria-label={`Move step ${index + 1} down`} onClick={() => { const steps = [...form.steps]; [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]]; set("steps", steps); }}>↓</button><button type="button" onClick={() => remove("steps", index)}>Remove</button></div></div><div className="product-grid"><label className={stepNameInvalid ? "fe-field-invalid" : ""}>Step name *<input value={item.name} onChange={(e) => changeRow("steps", index, "name", e.target.value)} onBlur={touch(`step-name-${index}`)} />{stepNameInvalid && <span className="fe-field-error">Step name is required.</span>}</label><label className={durationInvalid ? "fe-field-invalid" : ""}>Duration (minutes) *<input type="number" min="0" step="1" value={item.durationMinutes} onChange={(e) => changeRow("steps", index, "durationMinutes", e.target.value)} onBlur={touch(`step-duration-${index}`)} />{durationInvalid && <span className="fe-field-error">Duration (minutes) is required.</span>}</label></div><label>Instructions<textarea rows={3} value={item.description} onChange={(e) => changeRow("steps", index, "description", e.target.value)} /></label></div>; })}
            <button type="button" onClick={() => set("steps", [...form.steps, { name: "", description: "", durationMinutes: 0 }])}>+ Add step</button><label className="product-recipe-note">Recipe note<textarea rows={2} value={form.recipeNote} onChange={(e) => set("recipeNote", e.target.value)} /></label></> : <p className="product-state">No recipe required. Continue to review.</p>}
        </>}
        {step === 4 && <><ProductSummary form={form} /><div className="product-review-flow"><span>Draft</span><span>→</span><span>Pending Review</span><span>→</span><span>Approved</span></div><p className="product-muted">Approved products can be used to create Propositions.</p></>}
      </fieldset>
      {validation && <p className="product-error" role="alert">{validation}</p>}
      {draftMessage && mutation.isError && <p className="product-notice" role="status">{draftMessage}</p>}
      {mutation.isError && <p className="product-error" role="alert">{productError(mutation.error)}{mutation.error?.response?.status === 409 && " Close and reopen the draft to load its latest revision before retrying."}</p>}
      <footer className="product-form-actions">
        {!readOnly && <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>}
        {step > 0 && <button type="button" disabled={busy} onClick={() => { setStep(step - 1); setValidation(""); }}>Back</button>}
        {extraFooterActions}
        {!readOnly && step === 2 && <button type="button" disabled={busy} onClick={() => { set("ingredients", []); setStep(3); setValidation(""); }}>Skip ingredients</button>}
        {!readOnly && step === 3 && <button type="button" disabled={busy} onClick={() => { set("recipeEnabled", false); setStep(4); setValidation(""); }}>Skip recipe</button>}
        {!readOnly && step >= 1 && <button type="button" disabled={busy} onClick={() => save(false)}>Save Draft</button>}
        {readOnly
          ? step < 4 && <button type="button" className="product-primary" onClick={goNext}>Next</button>
          : (step < 4 ? <button type="button" className="product-primary" disabled={busy} onClick={goNext}>Next</button> : <button type="button" className="product-primary" disabled={busy} onClick={() => save(true)}>{busy ? "Saving..." : "Submit for review"}</button>)}
      </footer>
    </div>
  </div>;
}
