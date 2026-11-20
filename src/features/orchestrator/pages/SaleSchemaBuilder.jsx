import { useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import {
  TYPES,
  TRANSACTION_FIELDS,
  ITEM_FIELDS,
  field,
  changeType,
} from "../lib/planSale.js";

export function SaleSchemaBuilder({
  fields,
  onChange,
  disabled,
  path = "payload",
  depth = 0,
  allowAdd = true,
}) {
  const required =
    path === "payload"
      ? TRANSACTION_FIELDS
      : path === "payload.items[]"
        ? ITEM_FIELDS
        : {};
  const update = (index, value) =>
    onChange(fields.map((f, i) => (i === index ? value : f)));
  return (
    <div className="sale-schema">
      {fields.map((value, index) => {
        const locked = Object.hasOwn(required, value.name);
        const fixedGroup =
          path === "payload" &&
          ["customer", "additionalInfo"].includes(value.name);
        return (
          <fieldset
            key={index}
            className="sale-schema-field"
            disabled={disabled}
          >
            <legend>
              {value.name || `New field ${index + 1}`}
              {locked && " · Transaction field"}
            </legend>
            <div className="sale-field-heading">
              <label>
                Field name
                <input
                  required
                  readOnly={locked || fixedGroup}
                  maxLength={100}
                  value={value.name ?? ""}
                  onChange={(e) =>
                    update(index, { ...value, name: e.target.value })
                  }
                />
              </label>
              <label>
                Type
                <select
                  disabled={locked || fixedGroup}
                  value={value.type}
                  onChange={(e) =>
                    update(index, changeType(value, e.target.value))
                  }
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="sale-check">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={!!value.required}
                  onChange={(e) =>
                    update(index, { ...value, required: e.target.checked })
                  }
                />
                Required
              </label>
              {!locked && !fixedGroup && (
                <button
                  type="button"
                  aria-label={`Remove ${value.name || "field"}`}
                  onClick={() => onChange(fields.filter((_, i) => i !== index))}
                >
                  <FiTrash2 />
                </button>
              )}
            </div>
            <Rules
              key={`${index}:${value.name}`}
              value={value}
              onChange={(v) => update(index, v)}
              disabled={disabled}
              path={`${path}.${value.name}`}
              depth={depth}
              lockedItem={path === "payload" && value.name === "items"}
            />
          </fieldset>
        );
      })}
      {allowAdd && !disabled && depth < 7 && fields.length < 100 && (
        <button
          type="button"
          className="sale-add"
          onClick={() => onChange([...fields, field()])}
        >
          <FiPlus /> Add field
        </button>
      )}
    </div>
  );
}
function Rules({ value, onChange, disabled, path, depth, lockedItem = false }) {
  const set = (key, v) => onChange({ ...value, [key]: v });
  return (
    <>
      <div className="sale-rule-grid">
        <label>
          Description
          <input
            value={value.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <DefaultEditor
          key={value.type}
          value={value.defaultValue}
          onChange={(v) => set("defaultValue", v)}
        />
        {value.type === "NUMBER" &&
          ["min", "max"].map((key) => (
            <label key={key}>
              {key === "min" ? "Minimum" : "Maximum"}
              <input
                type="number"
                step="any"
                value={value[key] ?? ""}
                onChange={(e) =>
                  set(
                    key,
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </label>
          ))}
        {value.type === "STRING" && (
          <label>
            Format
            <select
              value={value.format ?? ""}
              onChange={(e) => set("format", e.target.value || null)}
            >
              <option value="">None</option>
              <option value="EMAIL">Email</option>
            </select>
          </label>
        )}
      </div>
      {value.type === "OBJECT" && (
        <SaleSchemaBuilder
          fields={value.fields ?? []}
          onChange={(v) => set("fields", v)}
          disabled={disabled}
          path={path}
          depth={depth + 1}
        />
      )}
      {value.type === "ARRAY" && (
        <div className="sale-array">
          <label>
            Array item type
            <select
              disabled={lockedItem}
              value={value.items?.type ?? "STRING"}
              onChange={(e) =>
                set("items", changeType(value.items ?? {}, e.target.value))
              }
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          {depth < 8 && (
            <Rules
              value={value.items ?? { type: "STRING" }}
              onChange={(v) => set("items", v)}
              disabled={disabled}
              path={`${path}[]`}
              depth={depth + 1}
            />
          )}
        </div>
      )}
    </>
  );
}
function DefaultEditor({ value, onChange }) {
  const serialized = value == null ? "" : JSON.stringify(value);
  const [draft, setDraft] = useState({ saved: serialized, text: serialized });
  if (draft.saved !== serialized)
    setDraft({ saved: serialized, text: serialized });
  return (
    <label>
      Default value (JSON)
      <input
        value={draft.text}
        placeholder={'e.g. "VND", 0, true'}
        onChange={(e) => {
          setDraft({ saved: serialized, text: e.target.value });
          try {
            const next =
              e.target.value === "" ? null : JSON.parse(e.target.value);
            e.target.setCustomValidity("");
            onChange(next);
          } catch {
            e.target.setCustomValidity(
              "Enter a valid JSON value; strings need double quotes.",
            );
          }
        }}
      />
    </label>
  );
}
