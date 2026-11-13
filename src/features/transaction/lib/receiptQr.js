import QRCode from "qrcode";
import { validateReceiptUrl } from "./receiptFlow.js";

export function createReceiptQr(receiptUrl) {
  validateReceiptUrl(receiptUrl);
  // Encode the ORIGINAL string, without reserializing/normalizing the URL.
  const qr = QRCode.create(receiptUrl, { errorCorrectionLevel: "M" });
  const margin = 4;
  const size = qr.modules.size;
  const modules = qr.modules.data;
  const commands = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules[row * size + col]) commands.push(`M${col + margin},${row + margin}h1v1h-1z`);
    }
  }
  return { size, modules, margin, viewSize: size + margin * 2, path: commands.join("") };
}
