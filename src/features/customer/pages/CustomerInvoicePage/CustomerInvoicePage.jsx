import { useState } from "react";
import { Link } from "react-router-dom";
import { FiInbox, FiArrowRight } from "react-icons/fi";
import { CoreButton, CoreCard, CoreEmptyState, CorePageHeader } from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";
import { useCustomerInvoices } from "../../hooks/useCustomerPortal.js";
import { customerApiError, formatCustomerDate, formatCustomerMoney } from "../../lib/customerFormat.js";
import "./CustomerInvoicePage.css";

export function CustomerInvoicePage() {
  const [page, setPage] = useState(0);
  const { data, isPending, isError, error } = useCustomerInvoices(page);
  const invoices = data?.content ?? [];

  return (
    <div className="customer-invoices">
      <CorePageHeader eyebrow="EcoFood / Customer" title="Lịch sử hóa đơn" description="Các giao dịch thuộc tài khoản của bạn trong tenant đang đăng nhập." />
      <CoreCard>
        {isPending && <p role="status">Đang tải hóa đơn...</p>}
        {isError && <p role="alert" className="customer-invoices__error">{customerApiError(error, "Không thể tải lịch sử hóa đơn.")}</p>}
        {!isPending && !isError && invoices.length === 0 && <CoreEmptyState icon={FiInbox} title="Chưa có hóa đơn" description="Khi có giao dịch được ghi nhận, hóa đơn sẽ hiển thị tại đây." />}
        {!isPending && !isError && invoices.length > 0 && <>
          <div className="customer-invoices__table-scroll">
            <table className="customer-invoices__table">
              <thead><tr><th>Mã hóa đơn</th><th>Ngày mua</th><th>Điểm bán</th><th>Trạng thái</th><th className="customer-invoices__amount">Tổng tiền</th><th aria-label="Chi tiết" /></tr></thead>
              <tbody>{invoices.map((invoice) => <tr key={invoice.id}>
                <td><strong>{invoice.invoiceCode}</strong></td>
                <td>{formatCustomerDate(invoice.saleDate)}</td>
                <td>{invoice.distributionPartnerName || "—"}</td>
                <td>{invoice.status || "—"}</td>
                <td className="customer-invoices__amount">{formatCustomerMoney(invoice.totalAmount, invoice.currency)}</td>
                <td><Link to={`${ROUTES.CUSTOMER_INVOICES}/${invoice.id}`} aria-label={`Xem hóa đơn ${invoice.invoiceCode}`}><FiArrowRight /></Link></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="customer-invoices__pagination">
            <span>Trang {data.page + 1} / {Math.max(data.totalPages, 1)} · {data.totalElements} hóa đơn</span>
            <div><CoreButton variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((x) => x - 1)}>Trước</CoreButton>{" "}
            <CoreButton variant="secondary" size="sm" disabled={page + 1 >= data.totalPages} onClick={() => setPage((x) => x + 1)}>Sau</CoreButton></div>
          </div>
        </>}
      </CoreCard>
    </div>
  );
}
