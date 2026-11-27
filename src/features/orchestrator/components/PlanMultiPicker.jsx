import { CoreLoadingState } from "@thinh-17/fe-core";
import { useState } from "react";
import { PlanStatus } from "../../proposition/components/PlanStatus.jsx";

// Multi-select counterpart of PlanSourceVersionPicker (used when creating a
// Plan) — same custom listbox shape (open/close/click-outside, no native
// <select>) so each Plan's own status pill shows inline, just toggling
// membership in the list instead of picking a single value.
export function PlanMultiPicker({ value, plans, loading, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value ?? []);
  const label = (planId) => {
    const plan = plans.find((p) => p.id === planId);
    return plan ? `${plan.name}${plan.code ? ` (${plan.code})` : ""}` : planId;
  };
  function toggle(planId) {
    onChange(
      selected.has(planId)
        ? value.filter((id) => id !== planId)
        : [...(value ?? []), planId],
    );
  }
  return (
    <div
      className="prop-version-picker sale-plan-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="prop-version-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {loading ? (
          <CoreLoadingState variant="inline" title="Loading Plans" />
        ) : !selected.size ? (
          <span>Select Plans</span>
        ) : selected.size === 1 ? (
          <span>{label(value[0])}</span>
        ) : (
          <span>{selected.size} Plans selected</span>
        )}
        <span className="prop-version-picker__chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul
          className="prop-version-picker__options"
          role="listbox"
          aria-multiselectable="true"
        >
          {plans.map((plan) => (
            <li
              key={plan.id}
              role="option"
              aria-selected={selected.has(plan.id)}
              className={selected.has(plan.id) ? "is-selected" : ""}
              onMouseDown={(event) => {
                // preventDefault here (not on pointerdown) is what actually
                // stops the browser from blurring the trigger button on
                // click — without it, the onBlur handler above closes this
                // listbox after every single toggle, when multi-select
                // needs it to stay open across several picks.
                event.preventDefault();
                toggle(plan.id);
              }}
            >
              <span>
                <input type="checkbox" checked={selected.has(plan.id)} readOnly tabIndex={-1} />{" "}
                {plan.name} {plan.code && <small>({plan.code})</small>}
              </span>
              <PlanStatus status={plan.status} />
            </li>
          ))}
          {!plans.length && (
            <li className="prop-version-picker__empty">No Plans available</li>
          )}
        </ul>
      )}
    </div>
  );
}
