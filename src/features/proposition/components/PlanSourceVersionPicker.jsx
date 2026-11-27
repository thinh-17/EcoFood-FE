import { CoreLoadingState } from "@thinh-17/fe-core";
import { useState } from "react";
import { ProductStatus } from "../../product/components/ProductStatus.jsx";

// CoreSelect renders a native <select>, which can only show plain text
// options — no colored status pill. This is a small custom listbox instead
// (same open/close/click-outside pattern as ProductSuggestionInput) so each
// row can show the real ProductStatus badge, same colors as the Product
// directory. Any status is selectable here — approval is only enforced
// later, at submit/approve time, not at pick time.
export function PlanSourceVersionPicker({ value, versions, loading, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const current = versions.find((v) => v.version === value);
  const productName = (v) => v.definition?.processElementAttribute?.[0]?.productName ?? "Unnamed";
  return (
    <div
      className="prop-version-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="prop-version-picker__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {loading ? (
          <CoreLoadingState variant="inline" title="Loading versions" />
        ) : current ? (
          <>
            <span>
              v{current.version} · {productName(current)}
            </span>
            <ProductStatus status={current.status} />
          </>
        ) : (
          <span>Select a product version</span>
        )}
        <span className="prop-version-picker__chevron" aria-hidden="true">▾</span>
      </button>
      {open && !disabled && (
        <ul className="prop-version-picker__options" role="listbox">
          {versions.map((v) => (
            <li
              key={v.version}
              role="option"
              aria-selected={v.version === value}
              className={v.version === value ? "is-selected" : ""}
              onPointerDown={(event) => {
                event.preventDefault();
                onChange(v.version);
                setOpen(false);
              }}
            >
              <span>
                v{v.version} · {productName(v)}
              </span>
              <ProductStatus status={v.status} />
            </li>
          ))}
          {!versions.length && <li className="prop-version-picker__empty">No versions found</li>}
        </ul>
      )}
    </div>
  );
}
