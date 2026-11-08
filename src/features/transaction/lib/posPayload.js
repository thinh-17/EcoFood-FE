// Decimal arithmetic without binary floating point (no additional dependency).
// Simulator precision: up to 6 decimal places and 12 digits per input.
function decimal(value) {
  const text = String(value).trim();
  if (!/^\d{1,12}(\.\d{1,6})?$/.test(text))
    throw new Error("Số lượng/đơn giá cần là số không âm, tối đa 12 chữ số nguyên và 6 số lẻ.");
  const [whole, fraction = ""] = text.split(".");
  return { units: BigInt(whole + fraction), scale: fraction.length };
}

function textDecimal(units, scale) {
  const padded = units.toString().padStart(scale + 1, "0");
  return scale ? `${padded.slice(0, -scale)}.${padded.slice(-scale)}` : padded;
}

// Ensure JSON numbers serialize back to the SAME decimal value.
function jsonNumber(units, scale) {
  const text = textDecimal(units, scale);
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error("Giá trị quá lớn để gửi chính xác.");
  const [mantissa, exponent = "0"] = String(value).split(/e/i);
  const [whole, fraction = ""] = mantissa.split(".");
  let encoded = BigInt(whole + fraction);
  let encodedScale = fraction.length - Number(exponent);
  if (encodedScale < 0) { encoded *= 10n ** BigInt(-encodedScale); encodedScale = 0; }
  const common = Math.max(scale, encodedScale);
  if (encoded * 10n ** BigInt(common - encodedScale) !== units * 10n ** BigInt(common - scale))
    throw new Error("Giá trị quá lớn để gửi chính xác. Giảm số lượng hoặc đơn giá.");
  return value;
}

export function calculateCart(lines) {
  let totalUnits = 0n;
  let totalScale = 0;
  const items = lines.map((line) => {
    if (!line.productCode.trim() || line.productCode.trim().length > 100
        || !line.productName.trim() || line.productName.trim().length > 255)
      throw new Error("Cần mã sản phẩm (tối đa 100 ký tự) và tên (tối đa 255 ký tự).");
    const quantity = decimal(line.quantity);
    const price = decimal(line.unitPrice);
    if (quantity.units <= 0n) throw new Error("Số lượng phải lớn hơn 0.");
    const units = quantity.units * price.units;
    const scale = quantity.scale + price.scale;
    const common = Math.max(totalScale, scale);
    totalUnits = totalUnits * 10n ** BigInt(common - totalScale) + units * 10n ** BigInt(common - scale);
    totalScale = common;
    return {
      productCode: line.productCode.trim(), productName: line.productName.trim(),
      quantity: jsonNumber(quantity.units, quantity.scale),
      unitPrice: jsonNumber(price.units, price.scale), amount: jsonNumber(units, scale),
    };
  });
  return { items, totalAmount: jsonNumber(totalUnits, totalScale) };
}

export function buildPosPayload({ invoiceNumber, transactionTime, currency, lines }, mode = "valid") {
  if (!invoiceNumber.trim() || invoiceNumber.trim().length > 100) throw new Error("Mã hóa đơn bắt buộc, tối đa 100 ký tự.");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Tiền tệ cần 3 chữ cái in hoa, ví dụ VND.");
  if (!lines.length || lines.length > 1000) throw new Error("Cần từ 1 đến 1000 dòng sản phẩm.");
  const date = new Date(transactionTime);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) throw new Error("Ngày giao dịch phải hợp lệ và không ở tương lai.");
  const cart = calculateCart(lines);
  const payload = { invoiceNumber: invoiceNumber.trim(), transactionTime: date.toISOString(), currency, ...cart };
  if (mode === "wrong-total") payload.totalAmount = payload.totalAmount === 0 ? 1 : 0;
  else if (mode === "zero-quantity") payload.items[0].quantity = 0;
  else if (mode !== "valid") throw new Error("Chế độ kiểm thử không hợp lệ.");
  return payload;
}

export function newInvoiceNumber() {
  return `INV-${crypto.randomUUID()}`;
}

export function localDateTime() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
