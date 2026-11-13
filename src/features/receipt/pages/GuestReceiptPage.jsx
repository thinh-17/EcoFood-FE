import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CoreButton, CoreCard, CoreEmptyState } from "@thinh-17/fe-core";
import { FiCheckCircle, FiPrinter, FiShoppingBag, FiMessageCircle, FiBookmark } from "react-icons/fi";
import { getGuestReceiptToken } from "../lib/receiptRoute.js";
import { guestReceiptError, receiptSubtotal } from "../lib/guestReceipt.js";
import { useGuestReceipt } from "../hooks/useGuestReceipt.js";
import { formatDate, formatMoney } from "../../transaction/lib/transactionFormat.js";
import "./GuestReceiptPage.css";

function ReceiptContent({ receipt }) {
  return <>
    <header className="guest-receipt__merchant">
      <span className="guest-receipt__store-icon"><FiShoppingBag aria-hidden="true" size={24} /></span>
      <p className="guest-receipt__eyebrow">Đại lý / Cửa hàng</p>
      <h1>{receipt.distributionPartner}</h1>
      <p>Hóa đơn điện tử</p>
    </header>
    <div className="guest-receipt__content">
      <div className="guest-receipt__verified"><FiCheckCircle aria-hidden="true" /> Hóa đơn đã được ghi nhận</div>
      <dl className="guest-receipt__metadata">
        <div><dt>Mã hóa đơn</dt><dd>{receipt.invoiceNumber}</dd></div>
        <div><dt>Ngày giao dịch</dt><dd>{formatDate(receipt.transactionTime)}</dd></div>
        <div><dt>Tiền tệ</dt><dd>{receipt.currency}</dd></div>
        <div><dt>Trạng thái thanh toán</dt><dd>Chưa có thông tin riêng</dd></div>
      </dl>
      <section aria-labelledby="guest-items-title" className="guest-receipt__items">
        <h2 id="guest-items-title">Sản phẩm đã mua <span>{receipt.items.length} dòng</span></h2>
        <ul>{receipt.items.map((item, index) => <li key={`${item.productCode}-${index}`}>
          <h3>{item.productName}</h3>
          <dl className="guest-receipt__item-values">
            <div><dt>Số lượng</dt><dd>{new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 12 }).format(item.quantity)}</dd></div>
            <div><dt>Đơn giá</dt><dd>{formatMoney(item.unitPrice, receipt.currency)}</dd></div>
            <div><dt>Thành tiền</dt><dd>{formatMoney(item.amount, receipt.currency)}</dd></div>
          </dl>
        </li>)}</ul>
      </section>
      <section aria-label="Tổng kết hóa đơn" className="guest-receipt__totals">
        <dl><div><dt>Tạm tính</dt><dd>{formatMoney(receiptSubtotal(receipt.items), receipt.currency)}</dd></div>
          <div className="guest-receipt__grand-total"><dt>Tổng cộng</dt><dd>{formatMoney(receipt.totalAmount, receipt.currency)}</dd></div></dl>
      </section>
      <p className="guest-receipt__thanks">Cảm ơn bạn đã mua hàng!</p>
      <div className="guest-receipt__print"><CoreButton variant="secondary" onClick={() => window.print()}><FiPrinter aria-hidden="true" /> In hóa đơn</CoreButton></div>
    </div>
  </>;
}

export function GuestReceiptPage() {
  const { search } = useLocation();
  const token = getGuestReceiptToken(search);
  const query = useGuestReceipt(token);
  useEffect(() => {
    const title = document.title;
    const language = document.documentElement.lang;
    document.title = "EcoFood · Hóa đơn điện tử";
    document.documentElement.lang = "vi";
    return () => { document.title = title; document.documentElement.lang = language; };
  }, []);

  const error = !token
    ? { title: "Liên kết không hợp lệ", message: "Liên kết hóa đơn thiếu hoặc sai mã truy cập. Vui lòng quét lại QR do cửa hàng cung cấp.", retry: false }
    : query.isError ? guestReceiptError(query.error) : null;
  const receipt = !error && !query.isPending ? query.data : null;

  return <main className="guest-receipt-page">
    <div className="guest-receipt__brand" aria-label="EcoFood">eco<span>food</span><small>DIGITAL RECEIPT</small></div>
    <article className="guest-receipt__paper" aria-busy={Boolean(token && query.isPending)}>
      {error ? <div className="guest-receipt__state" role="alert"><CoreEmptyState title={error.title} description={error.message} />
        {error.retry && <CoreButton onClick={() => query.refetch()} disabled={query.isFetching}>Thử lại</CoreButton>}</div>
        : query.isPending ? <div className="guest-receipt__state" role="status"><span className="guest-receipt__spinner" aria-hidden="true" /><p>Đang tải hóa đơn...</p></div>
          : receipt && <ReceiptContent receipt={receipt} />}
    </article>
    {receipt && <section className="guest-receipt__future" aria-label="Tiện ích sắp ra mắt">
      <CoreCard><FiMessageCircle aria-hidden="true" /><h2>Give Feedback</h2><p>Chia sẻ trải nghiệm mua hàng.</p><span>Sắp ra mắt</span></CoreCard>
      <CoreCard><FiBookmark aria-hidden="true" /><h2>Save Purchase</h2><p>Lưu hóa đơn vào lịch sử mua hàng.</p><span>Sắp ra mắt</span></CoreCard>
    </section>}
    <footer className="guest-receipt__footer">Hóa đơn được chia sẻ qua liên kết riêng. Chỉ chia sẻ với người bạn tin tưởng.</footer>
  </main>;
}
