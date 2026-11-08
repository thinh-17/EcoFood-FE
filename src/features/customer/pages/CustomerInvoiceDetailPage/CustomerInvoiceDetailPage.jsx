import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiInbox } from "react-icons/fi";
import { CoreCard, CoreEmptyState, CorePageHeader } from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";
import { useCustomerInvoiceDetail } from "../../hooks/useCustomerPortal.js";
import { customerApiError, formatCustomerDate, formatCustomerMoney } from "../../lib/customerFormat.js";
import "./CustomerInvoiceDetailPage.css";

export function CustomerInvoiceDetailPage() {
  const { invoiceId } = useParams();
  const { data: invoice, isPending, isError, error } = useCustomerInvoiceDetail(invoiceId);

  if (isPending) return <p role="status">Đang tải chi tiết hóa đơn...</p>;
  if (isError) return <div className="customer-invoice-detail">
    <Link to={ROUTES.CUSTOMER_INVOICES} className="customer-invoice-detail__back"><FiArrowLeft /> Quay lại hóa đơn</Link>
    <CoreEmptyState icon={FiInbox} title="Không thể xem hóa đơn" description={customerApiError(error, "Hóa đơn không tồn tại hoặc không thuộc tài khoản của bạn.")} />
  </div>;

  return <div className="customer-invoice-detail">
    <Link to={ROUTES.CUSTOMER_INVOICES} className="customer-invoice-detail__back"><FiArrowLeft /> Quay lại hóa đơn</Link>
    <CorePageHeader eyebrow="EcoFood / Customer / Invoice" title={`Hóa đơn ${invoice.invoiceCode}`} description="Chi tiết giao dịch của bạn." />
    <CoreCard title="Thông tin hóa đơn">
      <dl className="customer-invoice-detail__info">
        <div><dt>Ngày mua</dt><dd>{formatCustomerDate(invoice.saleDate)}</dd></div>
        <div><dt>Điểm bán</dt><dd>{invoice.distributionPartnerName || "—"}</dd></div>
        <div><dt>Trạng thái</dt><dd>{invoice.status || "—"}</dd></div>
        <div><dt>Tổng tiền</dt><dd>{formatCustomerMoney(invoice.totalAmount, invoice.currency)}</dd></div>
      </dl>
      <h3>Sản phẩm đã mua</h3>
      <div className="customer-invoice-detail__scroll"><table className="customer-invoice-detail__table">
        <thead><tr><th>Tên sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
        <tbody>{(invoice.items || []).map((item, idx) => <tr key={`${item.productId || idx}-${idx}`}>
          <td>{item.productName}</td><td>{item.quantity}</td><td>{formatCustomerMoney(item.unitPrice, invoice.currency)}</td><td>{formatCustomerMoney(item.lineTotal, invoice.currency)}</td>
        </tr>)}</tbody>
      </table></div>
    </CoreCard>
  </div>;
}
