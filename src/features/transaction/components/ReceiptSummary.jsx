import { formatDate, formatMoney } from "../lib/transactionFormat.js";

export function ReceiptSummary({ payment, detail }) {
  const invoice = detail || payment.payload;
  return <section className="receipt-summary" aria-label="Thông tin hóa đơn đã thanh toán">
    <dl className="transaction-metadata">
      <div><dt>Mã hóa đơn</dt><dd>{payment.response.invoiceNumber}</dd></div>
      <div><dt>Ngày giao dịch</dt><dd>{formatDate(invoice.transactionTime)}</dd></div>
      <div><dt>Distribution Partner</dt><dd>{detail?.distributionPartner || "Chưa tải được thông tin đối tác"}</dd></div>
      <div><dt>Trạng thái thanh toán</dt><dd>Đã ghi nhận · {payment.response.status}</dd></div>
    </dl>
    <div className="transaction-table-scroll"><table className="transaction-items-table">
      <thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
      <tbody>{invoice.items.map((item, index) => <tr key={`${item.productCode}-${index}`}>
        <td>{item.productName}<small className="transaction-code">{item.productCode}</small></td>
        <td>{item.quantity}</td><td>{formatMoney(item.unitPrice, invoice.currency)}</td>
        <td>{formatMoney(item.amount, invoice.currency)}</td>
      </tr>)}</tbody>
    </table></div>
    <p className="receipt-total">Tổng thanh toán: <strong>{formatMoney(invoice.totalAmount, invoice.currency)}</strong></p>
  </section>;
}
