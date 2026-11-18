import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CoreButton } from "@thinh-17/fe-core";
import { savePlan } from "../api/proposition.api.js";
import {
  currencyDigits,
  errorMessage,
  marketPreview,
  money,
  planFormState,
  planPayload,
} from "../lib/proposition.js";
import { ChoiceList, Field } from "./PropositionFields.jsx";
import { COUNTRIES } from "../../../constants/countries.js";
export function PlanForm({ proposition: p, plan, onCancel, onSaved }) {
  const [form, setForm] = useState(() => planFormState(plan, p)),
    [validation, setValidation] = useState("");
  const set = (key) => (value) =>
    setForm((previous) => ({
      ...previous,
      [key]: value,
      marketConfirmed: key === "marketConfirmed" ? value : false,
    }));
  const country = form.regionIds[0] ?? "";
  const tenants = p.eligibleTenants.filter((t) => t.country === country);
  const chooseCountry = (value) =>
    setForm((previous) => ({
      ...previous,
      regionIds: value ? [value] : [],
      tenantIds: previous.tenantIds.filter((id) =>
        p.eligibleTenants.some((t) => t.id === id && t.country === value),
      ),
      marketConfirmed: false,
    }));
  const mutation = useMutation({
    mutationFn: (body) => savePlan(p.id, plan?.id, body),
    onSuccess: onSaved,
  });
  const labels = {
    NAME: ["name", "Product name"],
    DESCRIPTION: ["description", "Description"],
    IMAGE_URL: ["imageUrl", "Image URL"],
  };
  let preview, previewError;
  try {
    if (form.marketEnabled && form.salePrice !== "")
      preview = marketPreview(form);
  } catch (error) {
    previewError = error.message;
  }
  return (
    <form
      className="prop-form"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          const body = planPayload(form, p);
          setValidation("");
          mutation.mutate(body);
        } catch (error) {
          setValidation(error.message);
        }
      }}
    >
      <fieldset disabled={mutation.isPending}>
        <p className="prop-source">
          {p.definition.name} · Approved product version {p.productVersion}
        </p>
        <div className="prop-grid">
          <Field
            label="Plan name *"
            required
            value={form.name}
            onChange={set("name")}
          />
          <Field label="Plan code" value={form.code} onChange={set("code")} />
        </div>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => set("description")(e.target.value)}
          />
        </label>
        <div className="prop-grid">
          <label>
            Country of Sale *
            <select
              required
              value={country}
              onChange={(e) => chooseCountry(e.target.value)}
            >
              <option value="">Select Country of Sale</option>
              {p.definition.regionIds.map((id) => (
                <option key={id} value={id}>
                  {COUNTRIES.find((c) => c.code === id)?.name ?? id} ({id})
                </option>
              ))}
            </select>
          </label>
          <ChoiceList
            label="Distribution Sub-Tenants *"
            items={tenants}
            value={form.tenantIds}
            onChange={set("tenantIds")}
          />
          <Field
            label="Effective from"
            type="datetime-local"
            value={form.startDate}
            onChange={set("startDate")}
          />
          <Field
            label="Effective until"
            type="datetime-local"
            value={form.endDate}
            onChange={set("endDate")}
          />
        </div>
        <h2>Permitted product customization</h2>
        {!p.definition.allowedOverrides.length && (
          <p className="prop-muted">
            The Enterprise has not enabled product overrides.
          </p>
        )}
        {p.definition.allowedOverrides
          .filter((field) => labels[field])
          .map((field) => {
            const [key, label] = labels[field];
            return (
              <div key={field}>
                <label className="prop-check">
                  <input
                    type="checkbox"
                    checked={form.productOverrides[key] != null}
                    onChange={(e) => {
                      const overrides = { ...form.productOverrides };
                      if (e.target.checked) overrides[key] = "";
                      else delete overrides[key];
                      set("productOverrides")(overrides);
                    }}
                  />
                  Customize {label.toLowerCase()}
                </label>
                {form.productOverrides[key] != null && (
                  <Field
                    label={label}
                    type={key === "imageUrl" ? "url" : "text"}
                    required={key === "name"}
                    value={form.productOverrides[key]}
                    onChange={(value) =>
                      set("productOverrides")({
                        ...form.productOverrides,
                        [key]: value,
                      })
                    }
                  />
                )}
              </div>
            );
          })}
        {p.definition.allowedOverrides.includes("RECIPE") && (
          <>
            <h3>Product Process recipe</h3>
            <label className="prop-check">
              <input
                type="checkbox"
                checked={form.productOverrides.recipe != null}
                onChange={(e) => {
                  const next = { ...form.productOverrides };
                  if (e.target.checked)
                    next.recipe = structuredClone(
                      p.sourceProcess?.definition?.processElementAttribute?.[0]
                        ?.recipe ?? {
                        enabled: true,
                        name: "",
                        steps: [],
                        preparationMinutes: 0,
                        cookingMinutes: 0,
                      },
                    );
                  else delete next.recipe;
                  set("productOverrides")(next);
                }}
              />
              Customize Product Process for this Plan
            </label>
            {form.productOverrides.recipe && (
              <RecipeEditor
                value={form.productOverrides.recipe}
                onChange={(recipe) =>
                  set("productOverrides")({ ...form.productOverrides, recipe })
                }
              />
            )}
          </>
        )}
        <h2>Market configuration</h2>
        <label className="prop-check">
          <input
            type="checkbox"
            checked={form.marketEnabled}
            onChange={(e) => set("marketEnabled")(e.target.checked)}
          />
          Set market pricing now
        </label>
        <p className="prop-muted">
          Draft may omit pricing; approval requires it. Tax is a percentage: 8
          means 8%. Prices are independent of Product pricing.
        </p>
        {p.plans.some(
          (item) => item.marketConfiguration && item.id !== plan?.id,
        ) && (
          <label>
            Use pricing from another Plan
            <select
              value=""
              onChange={(e) => {
                const market = p.plans.find(
                  (item) => item.id === e.target.value,
                )?.marketConfiguration;
                if (market)
                  setForm((previous) => ({
                    ...previous,
                    marketEnabled: true,
                    currency: market.currency,
                    salePrice: market.salePrice,
                    taxRate: market.taxRate,
                    surcharge: market.surcharge,
                    marketConfirmed: false,
                  }));
              }}
            >
              <option value="">Select pricing template</option>
              {p.plans
                .filter(
                  (item) =>
                    item.marketConfiguration &&
                    item.id !== plan?.id &&
                    p.availableCurrencies.includes(
                      item.marketConfiguration.currency,
                    ),
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.regionIds.join(", ")} · v{item.version}
                  </option>
                ))}
            </select>
          </label>
        )}
        {form.marketEnabled && (
          <>
            <div className="prop-grid">
              <label>
                Currency
                <select
                  value={form.currency}
                  onChange={(e) => set("currency")(e.target.value)}
                >
                  {!p.availableCurrencies.includes(form.currency) && (
                    <option>{form.currency}</option>
                  )}
                  {p.availableCurrencies.map((code) => (
                    <option key={code}>{code}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Sale price *"
                required
                type="number"
                min="0"
                step={10 ** -currencyDigits(form.currency)}
                value={form.salePrice}
                onChange={set("salePrice")}
              />
              <Field
                label="Tax (%)"
                type="number"
                min="0"
                max="100"
                step="0.0001"
                value={form.taxRate}
                onChange={set("taxRate")}
              />
              <Field
                label="Additional fees"
                type="number"
                min="0"
                step={10 ** -currencyDigits(form.currency)}
                value={form.surcharge}
                onChange={set("surcharge")}
              />
            </div>
            {preview && (
              <>
                <div className="prop-preview">
                  <div>
                    Country<strong>{country || "Select a country"}</strong>
                  </div>
                  <div>
                    Tax amount
                    <strong>{money(preview.taxAmount, form.currency)}</strong>
                  </div>
                  <div>
                    Total price
                    <strong>{money(preview.totalPrice, form.currency)}</strong>
                  </div>
                </div>
                <label className="prop-check">
                  <input
                    type="checkbox"
                    checked={form.marketConfirmed}
                    onChange={(e) => set("marketConfirmed")(e.target.checked)}
                  />
                  Confirm market configuration preview
                </label>
              </>
            )}
            {previewError && <p className="prop-muted">{previewError}</p>}
            <p className="prop-muted">
              Total = sale price + rounded tax + additional fees. Confirm the
              preview to save this configuration.
            </p>
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
      <div className="prop-actions">
        <CoreButton
          variant="secondary"
          disabled={mutation.isPending}
          onClick={onCancel}
        >
          Cancel
        </CoreButton>
        <CoreButton type="submit" loading={mutation.isPending}>
          Save Draft Plan
        </CoreButton>
      </div>
    </form>
  );
}
function RecipeEditor({ value, onChange }) {
  const steps = value.steps ?? [];
  const changeStep = (index, patch) =>
    onChange({
      ...value,
      steps: steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  return (
    <section className="prop-subcard">
      <label className="prop-check">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        Enable recipe
      </label>
      <Field
        label="Recipe name"
        value={value.name ?? ""}
        onChange={(name) => onChange({ ...value, name })}
      />
      <div className="prop-grid">
        {["preparationMinutes", "cookingMinutes"].map((key) => (
          <Field
            key={key}
            label={
              key === "preparationMinutes"
                ? "Preparation minutes"
                : "Cooking minutes"
            }
            type="number"
            min="0"
            value={value[key] ?? 0}
            onChange={(n) => onChange({ ...value, [key]: Number(n) })}
          />
        ))}
      </div>
      {steps.map((step, index) => (
        <div className="prop-subcard" key={index}>
          <Field
            required
            label={`Step ${index + 1} name`}
            value={step.name}
            onChange={(name) => changeStep(index, { name })}
          />
          <Field
            label="Instructions"
            value={step.description ?? ""}
            onChange={(description) => changeStep(index, { description })}
          />
          <Field
            label="Duration minutes"
            type="number"
            min="0"
            value={step.durationMinutes}
            onChange={(n) => changeStep(index, { durationMinutes: Number(n) })}
          />
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                steps: steps
                  .filter((_, i) => i !== index)
                  .map((s, i) => ({ ...s, order: i + 1 })),
              })
            }
          >
            Remove step
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            steps: [
              ...steps,
              {
                order: steps.length + 1,
                name: "",
                description: "",
                durationMinutes: 0,
              },
            ],
          })
        }
      >
        Add process step
      </button>
    </section>
  );
}
