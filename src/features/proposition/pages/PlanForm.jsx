import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CoreButton, CoreSelect } from "@thinh-17/fe-core";
import { savePlan } from "../api/proposition.api.js";
import { useTouched } from "../../../hooks/useTouched.js";
import { errorMessage, planFormState, planPayload } from "../lib/proposition.js";
import { Field } from "./PropositionFields.jsx";
import { COUNTRIES } from "../../../constants/countries.js";
import { CurrencySelect } from "../../../components/CurrencySelect.jsx";
import { ProductUnitInput } from "../../product/pages/ProductUnitInput.jsx";
import { ProductCategoryInput } from "../../product/pages/ProductCategoryInput.jsx";
import { ProductCostingPanel } from "../../product/pages/ProductCostingPanel.jsx";

const PLAN_STEPS = ["Definition", "Ingredients", "Recipe", "Costing"];
const STEP_DESCRIPTIONS = [
  "A clone of the approved source product for this Plan — every field below is editable.",
  "Add ingredients, or skip this step.",
  "Define preparation instructions, or skip for ready-to-sell plans.",
  "Set the Plan's own cost and selling price. You can save a Draft without one; approval requires it.",
];

const isQuantityInvalid = (value) => !(value !== "" && Number.isFinite(Number(value)) && Number(value) > 0);
const isDurationInvalid = (value) => !(value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number.isInteger(Number(value)));

export function PlanForm({ proposition: p, plan, onCancel, onSaved }) {
  const [form, setForm] = useState(() => planFormState(plan, p));
  const [step, setStep] = useState(0);
  const [validation, setValidation] = useState("");
  const { touched, touch, touchAll } = useTouched();
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const changeRow = (field, index, key, value) => set(field, form[field].map((row, i) => i === index ? { ...row, [key]: value } : row));
  const remove = (field, index) => set(field, form[field].filter((_, i) => i !== index));
  const country = form.regionIds[0] ?? "";
  // No Distribution Sub-Tenants picker anymore — every Proposition partner
  // that operates in the chosen Country of Sale is automatically included
  // (the backend requires every Plan tenant's country to match the Plan's
  // own Country of Sale, so this can't include partners from other countries).
  const chooseCountry = (value) =>
    setForm((previous) => ({
      ...previous,
      regionIds: value ? [value] : [],
      tenantIds: value
        ? p.eligibleTenants.filter((t) => t.country === value).map((t) => t.id)
        : [],
    }));
  const mutation = useMutation({
    mutationFn: (body) => savePlan(p.id, plan?.id, body),
    onSuccess: onSaved,
  });
  function goNext() {
    touchAll(["name", "country"]);
    if (step === 0 && (!form.name.trim() || !country)) {
      setValidation("Plan name and a Country of Sale are required.");
      return;
    }
    setValidation("");
    setStep(step + 1);
  }
  function save() {
    touchAll(["name", "country"]);
    try {
      const body = planPayload(form, p);
      setValidation("");
      mutation.mutate(body);
    } catch (error) {
      setValidation(error.message);
    }
  }
  const busy = mutation.isPending;
  return (
    <div className="prop-wizard">
      <aside className="prop-stepper" aria-label="Create Plan steps">
        <ol>
          {PLAN_STEPS.map((label, index) => (
            <li
              key={label}
              className={step === index ? "is-current" : step > index ? "is-complete" : ""}
            >
              <CoreButton
                variant="ghost"
                size="sm"
                className="prop-step-button"
                disabled={busy || index > step}
                aria-current={index === step ? "step" : undefined}
                onClick={() => setStep(index)}
              >
                <span>{index + 1}</span>
                {label}
              </CoreButton>
            </li>
          ))}
        </ol>
        <p>Define the Plan, then save it as a Draft.</p>
      </aside>
      <div className="prop-wizard-content">
        <header className="prop-wizard-heading">
          <small>
            STEP {step + 1} OF {PLAN_STEPS.length}
          </small>
          <h2>{PLAN_STEPS[step]}</h2>
          <p>{STEP_DESCRIPTIONS[step]}</p>
        </header>
        <fieldset className="prop-wizard-fields" disabled={busy}>
          {step === 0 && (
            <>
              <p className="prop-source">
                {p.definition.name} · Approved product version {p.productVersion}
              </p>
              <div className="prop-grid">
                <Field
                  label="Plan name *"
                  required
                  value={form.name}
                  onChange={(value) => set("name", value)}
                  onBlur={touch("name")}
                  labelClassName={touched.name && !form.name.trim() ? "fe-field-invalid" : ""}
                  error={
                    touched.name &&
                    !form.name.trim() && <span className="fe-field-error">Plan name is required.</span>
                  }
                />
                {plan?.code && (
                  <label>
                    Plan code
                    <input disabled value={plan.code} />
                  </label>
                )}
                <label className={touched.country && !country ? "fe-field-invalid" : ""}>
                  Country of Sale *
                  <CoreSelect
                    value={country}
                    onChange={(value) => chooseCountry(value)}
                    onBlur={touch("country")}
                    options={[
                      { value: "", label: "Select Country of Sale" },
                      ...p.definition.regionIds.map((id) => ({
                        value: id,
                        label: `${COUNTRIES.find((c) => c.code === id)?.name ?? id} (${id})`,
                      })),
                    ]}
                  />
                  {touched.country && !country && (
                    <span className="fe-field-error">Country of Sale is required.</span>
                  )}
                </label>
              </div>
              <div className="prop-grid">
                <ProductCategoryInput value={form.category} onChange={(value) => set("category", value)} />
                <Field
                  label="Plan image URL"
                  type="url"
                  value={form.imageUrl}
                  onChange={(value) => set("imageUrl", value)}
                />
              </div>
              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <div className="prop-section-heading">
                <h3>Ingredients ({form.ingredients.length})</h3>
                <CoreButton
                  variant="secondary"
                  size="sm"
                  onClick={() => set("ingredients", [...form.ingredients, { name: "", quantity: "", unit: "g", note: "" }])}
                >
                  + Add ingredient
                </CoreButton>
              </div>
              {!form.ingredients.length && <p className="prop-muted">No ingredients added. You can continue without them.</p>}
              {form.ingredients.map((item, index) => {
                const nameInvalid = touched[`ingredient-name-${index}`] && !item.name.trim();
                const quantityInvalid = touched[`ingredient-quantity-${index}`] && isQuantityInvalid(item.quantity);
                return (
                  <div className="prop-subcard" key={index}>
                    <div className="prop-grid">
                      <Field
                        label="Ingredient name *"
                        value={item.name}
                        onChange={(value) => changeRow("ingredients", index, "name", value)}
                        onBlur={touch(`ingredient-name-${index}`)}
                        labelClassName={nameInvalid ? "fe-field-invalid" : ""}
                        error={nameInvalid && <span className="fe-field-error">Ingredient name is required.</span>}
                      />
                      <Field
                        label="Quantity *"
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(value) => changeRow("ingredients", index, "quantity", value)}
                        onBlur={touch(`ingredient-quantity-${index}`)}
                        labelClassName={quantityInvalid ? "fe-field-invalid" : ""}
                        error={quantityInvalid && <span className="fe-field-error">Quantity is required.</span>}
                      />
                      <ProductUnitInput value={item.unit} onChange={(value) => changeRow("ingredients", index, "unit", value)} />
                      <CoreButton variant="secondary" size="sm" onClick={() => remove("ingredients", index)}>
                        Remove
                      </CoreButton>
                    </div>
                    <Field label="Note" value={item.note} onChange={(value) => changeRow("ingredients", index, "note", value)} />
                  </div>
                );
              })}
            </>
          )}
          {step === 2 && (
            <>
              <label className="prop-check">
                <input type="checkbox" checked={form.recipeEnabled} onChange={(e) => set("recipeEnabled", e.target.checked)} />
                Enable recipe
              </label>
              {form.recipeEnabled ? (
                <>
                  <Field label="Recipe name" value={form.recipeName} onChange={(value) => set("recipeName", value)} />
                  <div className="prop-grid">
                    <Field label="Preparation time (minutes)" type="number" min="0" step="1" value={form.preparationMinutes} onChange={(value) => set("preparationMinutes", value)} />
                    <Field label="Cooking time (minutes)" type="number" min="0" step="1" value={form.cookingMinutes} onChange={(value) => set("cookingMinutes", value)} />
                  </div>
                  {form.steps.map((item, index) => {
                    const stepNameInvalid = touched[`step-name-${index}`] && !item.name.trim();
                    const durationInvalid = touched[`step-duration-${index}`] && isDurationInvalid(item.durationMinutes);
                    return (
                      <div className="prop-subcard" key={index}>
                        <strong>Step {index + 1}</strong>
                        <div className="prop-grid">
                          <Field
                            label="Step name *"
                            value={item.name}
                            onChange={(value) => changeRow("steps", index, "name", value)}
                            onBlur={touch(`step-name-${index}`)}
                            labelClassName={stepNameInvalid ? "fe-field-invalid" : ""}
                            error={stepNameInvalid && <span className="fe-field-error">Step name is required.</span>}
                          />
                          <Field
                            label="Duration (minutes) *"
                            type="number"
                            min="0"
                            step="1"
                            value={item.durationMinutes}
                            onChange={(value) => changeRow("steps", index, "durationMinutes", value)}
                            onBlur={touch(`step-duration-${index}`)}
                            labelClassName={durationInvalid ? "fe-field-invalid" : ""}
                            error={durationInvalid && <span className="fe-field-error">Duration (minutes) is required.</span>}
                          />
                        </div>
                        <Field label="Instructions" value={item.description} onChange={(value) => changeRow("steps", index, "description", value)} />
                        <CoreButton variant="secondary" size="sm" onClick={() => remove("steps", index)}>
                          Remove step
                        </CoreButton>
                      </div>
                    );
                  })}
                  <CoreButton
                    variant="secondary"
                    size="sm"
                    onClick={() => set("steps", [...form.steps, { name: "", description: "", durationMinutes: 0 }])}
                  >
                    + Add step
                  </CoreButton>
                  <Field label="Recipe note" value={form.recipeNote} onChange={(value) => set("recipeNote", value)} />
                </>
              ) : (
                <p className="prop-muted">No recipe required. Continue to costing.</p>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <label>
                Currency *
                <CurrencySelect value={form.currency} onChange={(value) => set("currency", value)} />
                <small>Applies to all costs and the selling price. Changing currency does not convert amounts.</small>
              </label>
              <ProductCostingPanel currency={form.currency} costing={form.costing} onChange={(value) => set("costing", value)} />
              <div className="prop-subcard">
                <strong>Selling price</strong>
                <div className="prop-grid">
                  <Field label="Selling price" type="number" min="0" step="any" value={form.sellingPrice} onChange={(value) => set("sellingPrice", value)} />
                  <label>
                    Currency
                    <input disabled value={form.currency} />
                  </label>
                </div>
                <Field label="Pricing note" value={form.pricingNote} onChange={(value) => set("pricingNote", value)} />
              </div>
              <p className="prop-muted">You may save a draft without a selling price; it's required before submitting for review.</p>
            </>
          )}
        </fieldset>
        {(validation || mutation.isError) && (
          <p role="alert" className="prop-error">
            {validation || errorMessage(mutation.error)}
            {mutation.error?.response?.status === 409 &&
              " Close and reopen to load the latest revision."}
          </p>
        )}
        <footer className="prop-actions prop-wizard-actions">
          <CoreButton variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </CoreButton>
          {step > 0 && (
            <CoreButton variant="secondary" disabled={busy} onClick={() => setStep(step - 1)}>
              Back
            </CoreButton>
          )}
          {step === 1 && (
            <CoreButton variant="secondary" disabled={busy} onClick={() => { set("ingredients", []); setStep(2); }}>
              Skip ingredients
            </CoreButton>
          )}
          {step === 2 && (
            <CoreButton variant="secondary" disabled={busy} onClick={() => { set("recipeEnabled", false); setStep(3); }}>
              Skip recipe
            </CoreButton>
          )}
          {step < PLAN_STEPS.length - 1 ? (
            <CoreButton disabled={busy} onClick={goNext}>
              Next
            </CoreButton>
          ) : (
            <CoreButton loading={busy} onClick={save}>
              Save Draft Plan
            </CoreButton>
          )}
        </footer>
      </div>
    </div>
  );
}
