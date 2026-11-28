export function invoiceTenantSelection(ids) {
  return [...new Set(ids)].sort().join(",");
}

export function invoicePropositions(invoice) {
  return invoice.propositions?.map((p) => p.name ? `${p.name} (${p.id})` : p.id).join(", ") || invoice.propositionId || "—";
}

export function invoiceDetailView(detail) {
  return { ...detail.invoice, ...detail };
}
