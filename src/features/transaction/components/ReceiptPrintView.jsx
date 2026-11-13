import { createPortal } from "react-dom";
import { ReceiptQRCode } from "./ReceiptQRCode.jsx";
import { ReceiptSummary } from "./ReceiptSummary.jsx";
import { formatDate } from "../lib/transactionFormat.js";

export function ReceiptPrintView({ payment, detail, receipt, qr }) {
  return createPortal(<article className="receipt-print-root" aria-hidden="true">
    <h1>EcoFood · Hóa đơn thanh toán</h1>
    <ReceiptSummary payment={payment} detail={detail} />
    <div className="receipt-print-qr"><ReceiptQRCode qr={qr} size={288} /></div>
    <p>Quét QR để xem Digital Receipt. Link hết hạn: {formatDate(receipt.expiresAt)}</p>
    <p className="receipt-print-url">{receipt.receiptUrl}</p>
  </article>, document.body);
}
