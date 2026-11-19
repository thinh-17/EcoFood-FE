import { CURRENCIES } from "../constants/currencies.js";

export function CurrencySelect({ value, onChange, ...props }) {
  return <select {...props} value={value} onChange={(event) => onChange(event.target.value)}>
    {value && !CURRENCIES.some(({ code }) => code === value) && <option value={value}>{value}</option>}
    {CURRENCIES.map(({ code, name }) => <option key={code} value={code}>{code} - {name}</option>)}
  </select>;
}
