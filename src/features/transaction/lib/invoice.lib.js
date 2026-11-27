export const canReadInvoices = (claims = {}) =>
  Array.isArray(claims.permissions) && claims.permissions.includes("TRANSACTION_READ");

export function invoiceMoney(value, currency) {
  if (value == null || !currency) return "—";
  try { return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(value); }
  catch { return `${value} ${currency}`; }
}

export function invoiceDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-US");
}

export function invoiceLines(invoice) {
  if (invoice.planLines?.length) return invoice.planLines.map((line) => ({
    id: line.lineId, name: line.planName || line.planId, quantity: line.quantity,
    unitPrice: line.unitPrice, amount: line.amount,
  }));
  return (invoice.items ?? []).map((item, index) => ({
    id: String(index), name: item.productName || item.productCode,
    quantity: item.quantity, unitPrice: item.unitPrice, amount: item.amount,
  }));
}

export function invoiceError(error) {
  if (error?.response?.status === 401) return "Your session has expired. Please sign in again.";
  if (error?.response?.status === 403) return "You do not have permission to view invoices in this tenant.";
  if (error?.response?.status === 404) return "Invoice not found in the current tenant.";
  return error?.response?.data?.message || "Unable to load invoices. Please try again.";
}
