export function formatCustomerDate(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function formatCustomerMoney(value, currency = "VND") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ${currency}`;
  }
}

export function customerApiError(error, fallback) {
  return error?.response?.data?.message || fallback;
}
