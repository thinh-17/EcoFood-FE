import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CoreButton, CoreExpansionPanel } from "@thinh-17/fe-core";
import { useTouched } from "../../../hooks/useTouched.js";
import { errorMessage } from "../../proposition/lib/proposition.js";
import { getSaleOrchestrator, saveSaleOrchestrator } from "../api/planSale.api.js";
import { defaultInvoiceHolder, defaultPlanItems, field, samplePayload } from "../lib/planSale.js";
import { PlanMultiPicker } from "./PlanMultiPicker.jsx";
import { PayloadPreview } from "./PayloadPreview.jsx";
import { SaleConfigurationFieldTable } from "./SaleConfigurationFieldTable.jsx";
import "./PlanSaleOrchestrator.css";

// Backs the Proposition's "Sale Orchestrator" directory tab — same
// "table of records, Create new, click a row to view and edit it" shape as
// the Plans tab. One Sale Orchestrator can cover many Plans (the
// multi-select below), has no status/version lifecycle (just a current,
// always-editable configuration), and backs the one canonical
// submit-transaction endpoint (POST /api/v1/sales/transactions) — an item
// resolves which Orchestrator it belongs to from its own planId, so the
// caller never names one directly.
export function SaleOrchestratorEditor({ proposition, id, plans, onSaved, onCancel }) {
  const query = useQuery({
    queryKey: ["sale-orchestrator", proposition.id, id],
    queryFn: ({ signal }) => getSaleOrchestrator(proposition.id, id, signal),
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (id && query.isPending)
    return <p role="status">Loading this Sale Orchestrator…</p>;
  if (id && query.isError)
    return (
      <p role="alert" className="sale-error">
        {errorMessage(query.error)}{" "}
        <button type="button" onClick={() => query.refetch()}>
          Retry
        </button>
      </p>
    );
  return (
    <SaleOrchestratorForm
      key={id ?? "new"}
      row={id ? query.data : null}
      proposition={proposition}
      plans={plans}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}

// The three field lists describing this Orchestrator's whole
// submit-transaction shape — planItems/invoiceHolder are pre-seeded with
// their usual defaults for a brand new Orchestrator so the form doesn't
// start empty. Only Additional Info supports adding new fields (fully
// inline-editable); Item Plan is fixed display-only, Invoice Holder allows
// toggling Required on its five default fields but not adding more.
const FIELD_LISTS = {
  planItems: {
    title: "Item Plan",
    blurb: "The item's own planId/quantity/actualPrice fields.",
    editableFields: [],
    // planId/quantity must stay fixed, but actualPrice's Required toggle
    // genuinely changes submit-transaction behavior (turning it on means a
    // submitted item must always supply its own actualPrice, no fallback to
    // the Plan's own defined selling price), so it stays changeable.
    requiredEditableKeys: ["actualPrice"],
    creatable: false,
    removable: false,
  },
  additionalInfoFields: {
    title: "Additional Info",
    blurb: "Extra fields a submitted item may (or, if Required is on, must) carry on top of the Item Plan fields above.",
    editableFields: ["key", "dataType", "description", "shortName", "required"],
    creatable: true,
    removable: true,
  },
  invoiceHolder: {
    title: "Invoice Holder",
    blurb: "The buyer's own info, carried once per invoice — not repeated per item.",
    editableFields: ["required"],
    creatable: false,
    removable: false,
  },
};

function SaleOrchestratorForm({ row, proposition, plans, onSaved, onCancel }) {
  const [name, setName] = useState(row?.name ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [planIds, setPlanIds] = useState((row?.plans ?? []).map((p) => p.planId));
  const [fieldLists, setFieldLists] = useState({
    planItems: row?.planItems ?? defaultPlanItems(),
    additionalInfoFields: row?.additionalInfoFields ?? [],
    invoiceHolder: row?.invoiceHolder ?? defaultInvoiceHolder(),
  });
  const [error, setError] = useState("");
  const { touched, touch, touchAll } = useTouched();
  const nameInvalid = touched.name && !name.trim();
  const mutation = useMutation({
    mutationFn: () => saveSaleOrchestrator(proposition.id, row, { name, description, planIds, ...fieldLists }),
    onSuccess: (saved) => onSaved(saved),
    onError: (err) => setError(errorMessage(err)),
  });

  function updateList(list, updater) {
    setFieldLists((lists) => ({ ...lists, [list]: updater(lists[list]) }));
  }

  return (
    <form
      className="sale-panel sale-form"
      aria-label={row ? `Edit Sale Orchestrator · ${row.name}` : "Create Sale Orchestrator"}
      onSubmit={(event) => {
        event.preventDefault();
        touchAll(["name"]);
        if (!name.trim()) return;
        setError("");
        mutation.mutate();
      }}
    >
      <div className="sale-heading">
        <div>
          <h3>{row ? `Sale Orchestrator · ${row.name}` : "New Sale Orchestrator"}</h3>
          <p>
            Covers the Plans a customer can buy together on one invoice — the
            required item fields are planId and quantity; actualPrice is only
            needed when your own storefront sets the sale price.
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="sale-error">
          {error}
        </p>
      )}
      <label className={`sale-field${nameInvalid ? " fe-field-invalid" : ""}`}>
        <span>Name</span>
        <input
          className="fe-input"
          value={name}
          maxLength={200}
          required
          onChange={(event) => setName(event.target.value)}
          onBlur={touch("name")}
        />
        {nameInvalid && <span className="fe-field-error">Name is required.</span>}
      </label>
      <label className="sale-field">
        <span>Description</span>
        <textarea
          className="fe-input"
          value={description}
          maxLength={2000}
          rows={3}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="sale-field">
        <span>Plans</span>
        <PlanMultiPicker value={planIds} plans={plans} onChange={setPlanIds} />
      </label>
      {Object.entries(FIELD_LISTS).map(
        ([list, { title, blurb, editableFields, requiredEditableKeys, creatable, removable }]) => (
          <CoreExpansionPanel key={list} title={title} defaultExpanded={list === "planItems"}>
            <p className="sale-muted">{blurb}</p>
            <SaleConfigurationFieldTable
              fields={fieldLists[list]}
              editableFields={editableFields}
              requiredEditableKeys={requiredEditableKeys}
              onChange={(fields) => updateList(list, () => fields)}
              onRemove={
                removable ? (index) => updateList(list, (fields) => fields.filter((_, i) => i !== index)) : undefined
              }
              onCreate={creatable ? () => updateList(list, (fields) => [...fields, field()]) : undefined}
            />
          </CoreExpansionPanel>
        ),
      )}
      <PayloadPreview
        payload={samplePayload(
          planIds,
          fieldLists.planItems,
          fieldLists.additionalInfoFields,
          fieldLists.invoiceHolder,
        )}
      />
      <div className="sale-form-actions">
        <CoreButton
          type="submit"
          disabled={mutation.isPending || !planIds.length || !name.trim()}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </CoreButton>
        <CoreButton type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </CoreButton>
      </div>
    </form>
  );
}
