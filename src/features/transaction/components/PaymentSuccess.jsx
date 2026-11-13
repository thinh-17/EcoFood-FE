import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CoreButton, CoreCard } from "@thinh-17/fe-core";
import { createReceiptQr } from "../lib/receiptQr.js";
import { receiptError } from "../lib/receiptFlow.js";
import { formatDate } from "../lib/transactionFormat.js";
import { ReceiptQRCode } from "./ReceiptQRCode.jsx";
import { ReceiptSummary } from "./ReceiptSummary.jsx";
import { ReceiptPrintView } from "./ReceiptPrintView.jsx";

export function PaymentSuccess({ session }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const { payment } = session;
  const [copyMessage, setCopyMessage] = useState("");
  const [expired, setExpired] = useState(false);
  const linkInput = useRef(null);
  const expiresAt = state.receipt?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    let timer;
    function checkExpiry() {
      const remaining = Date.parse(expiresAt) - Date.now();
      if (remaining <= 0) setExpired(true);
      else timer = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
    }
    checkExpiry();
    return () => clearTimeout(timer);
  }, [expiresAt]);
  const qrResult = useMemo(() => {
    if (!state.receipt) return {};
    try { return { qr: createReceiptQr(state.receipt.receiptUrl) }; }
    catch { return { error: "Không thể tạo QR từ URL này. Invoice đã được lưu; không cần submit lại." }; }
  }, [state.receipt]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(state.receipt.receiptUrl);
      setCopyMessage("Đã sao chép Receipt URL.");
    } catch {
      linkInput.current?.focus(); linkInput.current?.select();
      setCopyMessage("Trình duyệt không cho phép sao chép tự động. Link đã được chọn để bạn sao chép thủ công.");
    }
  }

  function printReceipt() {
    if (Date.parse(expiresAt) <= Date.now()) { setExpired(true); return; }
    window.print();
  }

  return <section className="payment-success" aria-label="Kết quả thanh toán">
    <CoreCard>
      <div className="transaction-success" role="status"><h2>Thanh toán thành công</h2>
        <p>Invoice đã được tiếp nhận và lưu. Việc tạo lại QR không tạo giao dịch mới.</p></div>
      <ReceiptSummary payment={payment} detail={state.detail} />
      <p className="transaction-hint">Invoice ID: {payment.response.id} · Tiếp nhận lúc: {formatDate(payment.response.receivedAt)}</p>
      {payment.replay && <p>Payload gửi lại đã được backend tiếp nhận.</p>}
    </CoreCard>
    <CoreCard>
      <h2>Digital Receipt</h2>
      {(state.status === "idle" || state.status === "loading") && <p role="status">
        {state.stage === "issue" ? "Đang phát hành Receipt URL..." : "Đang tải nội dung hóa đơn..."}</p>}
      {state.status === "error" && <div className="transaction-error" role="alert">
        <p>{receiptError(state.error)}</p><p>Invoice vẫn được giữ nguyên. Thử lại chỉ gọi Receipt API.</p>
        <CoreButton variant="secondary" onClick={() => session.ensure()}>Retry Receipt</CoreButton>
      </div>}
      {qrResult.error && <p role="alert" className="transaction-error">{qrResult.error}</p>}
      {state.receipt && <div className="receipt-access">
        {qrResult.qr && <div className="receipt-qr-panel"><ReceiptQRCode qr={qrResult.qr} />
          <p>Quét để xem Digital Receipt</p></div>}
        <div className="receipt-link-panel">
          <label>Receipt URL<textarea ref={linkInput} className="fe-input receipt-url" readOnly value={state.receipt.receiptUrl} /></label>
          <p className="transaction-hint">Hết hạn: {formatDate(expiresAt)}</p>
          {expired && <p role="alert" className="transaction-error">Receipt URL đã hết hạn. Không dùng QR này để giao hóa đơn.</p>}
          <div className="transaction-actions receipt-no-print">
            <CoreButton variant="secondary" disabled={expired} onClick={copyLink}>Copy Link</CoreButton>
            {!expired && <a className="receipt-open-link" href={state.receipt.receiptUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Mở Digital Receipt</a>}
            <CoreButton disabled={!qrResult.qr || !state.detail || expired} onClick={printReceipt}>Print Receipt</CoreButton>
          </div>
          <p role="status" className="transaction-hint">{copyMessage}</p>
          {!state.detail && <p className="transaction-hint">Cần tải đủ thông tin đối tác và sản phẩm trước khi in.</p>}
        </div>
      </div>}
    </CoreCard>
    {state.detail && state.receipt && qrResult.qr && <ReceiptPrintView payment={payment} detail={state.detail} receipt={state.receipt} qr={qrResult.qr} />}
  </section>;
}
