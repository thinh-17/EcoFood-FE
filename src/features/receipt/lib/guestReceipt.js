const nonNegative = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

export function validateGuestReceipt(data) {
  if (!data || typeof data.invoiceNumber !== "string" || !data.invoiceNumber
      || !Number.isFinite(Date.parse(data.transactionTime))
      || typeof data.distributionPartner !== "string" || !data.distributionPartner
      || !/^[A-Z]{3}$/.test(data.currency) || !nonNegative(data.totalAmount)
      || !Array.isArray(data.items) || !data.items.length
      || data.items.some((item) => !item || typeof item.productName !== "string"
        || typeof item.productCode !== "string" || !nonNegative(item.quantity) || item.quantity === 0
        || !nonNegative(item.unitPrice) || !nonNegative(item.amount))) {
    throw new Error("INVALID_RECEIPT_RESPONSE");
  }
  // Only display the public contract, never unexpected Customer/internal fields.
  return {
    invoiceNumber: data.invoiceNumber, transactionTime: data.transactionTime,
    distributionPartner: data.distributionPartner, currency: data.currency, totalAmount: data.totalAmount,
    items: data.items.map(({ productCode, productName, quantity, unitPrice, amount }) =>
      ({ productCode, productName, quantity, unitPrice, amount })),
  };
}

export function receiptSubtotal(items) {
  let units = 0n;
  let scale = 0;
  for (const { amount } of items) {
    const [mantissa, exponent = "0"] = String(amount).split(/e/i);
    const [whole, fraction = ""] = mantissa.split(".");
    let part = BigInt(whole + fraction);
    let partScale = fraction.length - Number(exponent);
    if (partScale < 0) { part *= 10n ** BigInt(-partScale); partScale = 0; }
    const common = Math.max(scale, partScale);
    units = units * 10n ** BigInt(common - scale) + part * 10n ** BigInt(common - partScale);
    scale = common;
  }
  const text = units.toString().padStart(scale + 1, "0");
  return scale ? `${text.slice(0, -scale)}.${text.slice(-scale)}` : text;
}

export function guestReceiptError(error) {
  const status = error?.response?.status;
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 410) {
    return {
      title: "Hóa đơn không khả dụng",
      message: "Liên kết có thể không hợp lệ, đã hết hạn, bị thu hồi hoặc hóa đơn không còn tồn tại. Vui lòng liên hệ cửa hàng để được hỗ trợ.",
      retry: false,
    };
  }
  if (error?.message === "INVALID_RECEIPT_RESPONSE") {
    return { title: "Chưa thể hiển thị hóa đơn", message: "Nội dung hóa đơn chưa đầy đủ. Vui lòng thử lại hoặc liên hệ cửa hàng.", retry: true };
  }
  return { title: "Không thể kết nối", message: "Chưa thể tải hóa đơn. Kiểm tra kết nối mạng rồi thử lại.", retry: true };
}
