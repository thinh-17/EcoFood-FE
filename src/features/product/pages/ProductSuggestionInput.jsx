import { useId, useState } from "react";

export function ProductSuggestionInput({ value, onChange, label, suggestions, listLabel, placeholder, className = "" }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(-1);
  const options = suggestions.filter((option) => option.toLowerCase().includes(filter.toLowerCase()));
  function select(option) { onChange(option); setOpen(false); setActive(-1); }
  return <div className={`product-suggestion ${className}`} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1); }
  }}>
    <label htmlFor={id}>{label}</label>
    <div className="product-suggestion-control">
    <input id={id} role="combobox" autoComplete="off" aria-autocomplete="list"
      aria-expanded={open && options.length > 0} aria-controls={`${id}-options`}
      aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
      value={value} placeholder={placeholder}
      onFocus={() => { setFilter(""); setOpen(true); setActive(-1); }} onClick={() => { if (!open) { setFilter(""); setOpen(true); setActive(-1); } }}
      onChange={(event) => { onChange(event.target.value); setFilter(event.target.value); setOpen(true); setActive(-1); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); setOpen(false); setActive(-1); }
        if (["ArrowDown", "ArrowUp"].includes(event.key) && options.length) {
          event.preventDefault(); setOpen(true);
          setActive((index) => index < 0 ? (event.key === "ArrowDown" ? 0 : options.length - 1) : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
        }
        if (event.key === "Enter" && open && active >= 0) { event.preventDefault(); select(options[active]); }
      }} />
      <span className="product-suggestion-arrow" aria-hidden="true">{"\u25be"}</span>
    </div>
    {open && options.length > 0 && <ul id={`${id}-options`} className="product-suggestion-options" role="listbox" aria-label={listLabel}>
      {options.map((option, index) => <li key={option} id={`${id}-option-${index}`} role="option" aria-selected={active === index}
        onPointerDown={(event) => { event.preventDefault(); if (!event.currentTarget.closest("fieldset")?.disabled) select(option); }}>{option}</li>)}
    </ul>}
  </div>;
}
