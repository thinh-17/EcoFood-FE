import { CoreSelect } from "@thinh-17/fe-core";
import { CURRENCIES } from "../constants/currencies.js";

export function CurrencySelect({ value, onChange }) {
  const options = [
    ...(value && !CURRENCIES.some(({ code }) => code === value) ? [{ value, label: value }] : []),
    ...CURRENCIES.map(({ code, name }) => ({ value: code, label: `${code} - ${name}` })),
  ];
  return <CoreSelect searchable value={value} onChange={onChange} options={options} />;
}
