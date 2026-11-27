export const ENTITY_TYPE_OPTIONS = [
  { value: "BUSINESS_DASHBOARD", label: "Business Dashboard" },
  { value: "INVOICE_DASHBOARD", label: "Invoice Dashboard" },
  { value: "CUSTOMER_DASHBOARD", label: "Customer Dashboard" },
];
export function ruleEntityTypes(rule) {
  const legacy = rule.accessEntityType === "ALL_DASHBOARDS"
    ? ENTITY_TYPE_OPTIONS.map((option) => option.value) : rule.accessEntityType ? [rule.accessEntityType] : [];
  return [...new Set(rule.accessEntityTypes ?? legacy)].filter((type) => ENTITY_TYPE_OPTIONS.some((option) => option.value === type));
}
