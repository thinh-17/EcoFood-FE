import { CoreToggle } from "@thinh-17/fe-core";
import { DATA_TYPES } from "../lib/planSale.js";

// Mirrors DCMP's own field-list table: Key and Short Name read as plain
// underlined text (no box) when not editable, Data Type as plain text with
// no underline at all, Description as the one shaded, pencil-icon cell, and
// Required as a toggle. `editableFields` names which columns (if any)
// become real inputs for this list — e.g. ["required"] for Invoice Holder
// (only its Required toggle is interactive) or every column for Additional
// Info (fully inline-editable, including adding/removing rows).
// `requiredEditableKeys` additionally opens up just the Required toggle for
// specific rows by key, even when "required" isn't in editableFields — Item
// Plan's planId/quantity must stay fixed, but actualPrice's Required flag
// genuinely changes submit-transaction behavior (BatchSalePlanResolver's
// fallback-to-Plan-price rule), so it needs to stay changeable.
export function SaleConfigurationFieldTable({
  fields,
  editableFields = [],
  requiredEditableKeys = [],
  lockedKeys = [],
  onChange,
  onRemove,
  onCreate,
}) {
  const isLocked = (field) => lockedKeys.includes(field.key);
  const canEdit = (column, field) => !isLocked(field) && !!onChange && editableFields.includes(column);
  const canEditRequired = (field) => !isLocked(field) && (canEdit("required", field) || (!!onChange && requiredEditableKeys.includes(field.key)));

  function update(index, patch) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  return (
    <div className="sale-field-table">
      <div className="sale-field-table__row sale-field-table__row--head">
        <span>Key</span>
        <span>Data Type</span>
        <span>Description</span>
        <span>Short Name</span>
        <span>Required</span>
        {onRemove && <span />}
      </div>
      {fields.map((f, index) => (
        // Never key this row by f.key: when "key" is the editable column
        // (Additional Info), typing into it changed this row's own React
        // key every keystroke, remounting the row and dropping focus after
        // one character — the field's key effectively never got finished,
        // so it stayed blank and silently never made it into the preview.
        <div className="sale-field-table__row" key={index}>
          {canEdit("key", f) ? (
            <input
              className="fe-input"
              value={f.key}
              placeholder="key"
              onChange={(event) => update(index, { key: event.target.value })}
            />
          ) : (
            <span className="sale-field-table__underline">{f.key}</span>
          )}
          {canEdit("dataType", f) ? (
            <select
              className="fe-input"
              value={f.dataType}
              onChange={(event) => update(index, { dataType: event.target.value })}
            >
              {DATA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          ) : (
            <span className="sale-field-table__plain">{f.dataType}</span>
          )}
          {canEdit("description", f) ? (
            <input
              className="fe-input sale-field-table__description-input"
              value={f.description}
              placeholder="description"
              onChange={(event) => update(index, { description: event.target.value })}
            />
          ) : (
            <span className="sale-field-table__description">
              {f.description}
              <span className="sale-field-table__pencil" aria-hidden="true">
                ✎
              </span>
            </span>
          )}
          {canEdit("shortName", f) ? (
            <input
              className="fe-input"
              value={f.shortName}
              placeholder="short name"
              onChange={(event) => update(index, { shortName: event.target.value })}
            />
          ) : (
            <span className="sale-field-table__underline">{f.shortName}</span>
          )}
          <CoreToggle
            checked={f.required}
            disabled={!canEditRequired(f)}
            onChange={canEditRequired(f) ? (checked) => update(index, { required: checked }) : undefined}
          />
          {onRemove && !isLocked(f) && (
            <button
              type="button"
              className="sale-field-table__remove"
              aria-label={`Remove field ${f.key || index + 1}`}
              onClick={() => onRemove(index)}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {!fields.length && <p className="sale-muted">No fields yet.</p>}
      {onCreate && (
        <button type="button" className="sale-field-table__add" onClick={onCreate}>
          + Create field
        </button>
      )}
    </div>
  );
}
