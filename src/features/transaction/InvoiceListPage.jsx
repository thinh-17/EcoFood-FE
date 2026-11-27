import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreButton, CoreCard, CoreModal, CorePageHeader, CoreTable } from "@thinh-17/fe-core";
import { useAuthStore } from "../auth/store/authStore.js";
import { decodeJwt } from "../auth/lib/jwt.js";
import { invoiceApi } from "./invoice.api.js";
import { canReadInvoices, invoiceMoney, invoiceDate, invoiceLines, invoiceError } from "./invoice.lib.js";
import "./invoice.css";

export function InvoiceListPage() {
  const token = useAuthStore((state) => state.internalAccessToken);
  let claims = {};
  try { claims = decodeJwt(token) || {}; } catch { /* The auth route handles invalid sessions. */ }
  return canReadInvoices(claims) ? <InvoiceWorkspace key={token} scope={token} />
    : <section className="invoice-page"><CorePageHeader title="Invoice" />
      <p role="alert">Bạn chưa có quyền xem hóa đơn trong tenant hiện tại.</p></section>;
}

function InvoiceWorkspace({ scope }) {
  const client = useQueryClient();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [selected, setSelected] = useState("");
  const root = ["tenant-invoices", scope];
  const list = useQuery({ queryKey: [...root, "list", page, size], retry: false,
    queryFn: ({ signal }) => invoiceApi.list(page, size, signal) });
  const detail = useQuery({ queryKey: [...root, "detail", selected], enabled: !!selected, retry: false,
    queryFn: ({ signal }) => invoiceApi.detail(selected, signal) });
  const columns = [
    { header: "Mã hóa đơn", accessorKey: "invoiceNumber" },
    { header: "Tiếp nhận lúc", accessorKey: "receivedAt", cell: ({ getValue }) => invoiceDate(getValue()) },
    { header: "Tổng tiền", accessorKey: "totalAmount", cell: ({ row }) => invoiceMoney(row.original.totalAmount, row.original.currency) },
    { header: "Trạng thái", accessorKey: "status" },
    { header: "Thanh toán", accessorKey: "paymentStatus" },
    { id: "actions", header: "Chi tiết", cell: ({ row }) =>
      <CoreButton size="sm" variant="secondary" onClick={() => setSelected(row.original.id)}>Xem</CoreButton> },
  ];
  return <section className="invoice-page">
    <CorePageHeader title="Invoice" description="Danh sách hóa đơn của tenant hiện tại, mới nhất trước."
      aside={<CoreButton variant="secondary" disabled={list.isFetching}
        onClick={() => client.invalidateQueries({ queryKey: root })}>Làm mới</CoreButton>} />
    <div className="invoice-toolbar">
      <span>{list.data ? `${list.data.totalElements ?? 0} hóa đơn` : "Đang tải danh sách…"}</span>
      <label>Số dòng mỗi trang <select value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(0); }}>
        {[20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </div>
    {list.isError ? <p className="invoice-error" role="alert">{invoiceError(list.error)}</p> :
      <CoreCard><CoreTable columns={columns} data={list.data?.content ?? []} loading={list.isPending}
        page={page} pageSize={size} totalElements={list.data?.totalElements ?? 0} onPageChange={setPage}
        emptyTitle="Chưa có hóa đơn" emptyDescription="Hóa đơn được tiếp nhận thành công sẽ xuất hiện tại đây." /></CoreCard>}
    <CoreModal isOpen={!!selected} onClose={() => setSelected("")} title="Chi tiết hóa đơn" size="lg"
      footer={<CoreButton variant="secondary" onClick={() => setSelected("")}>Đóng</CoreButton>}>
      {detail.isPending && <p role="status">Đang tải hóa đơn…</p>}
      {detail.isError && <p className="invoice-error" role="alert">{invoiceError(detail.error)}</p>}
      {detail.data && !detail.isError && <InvoiceDetail invoice={detail.data} />}
    </CoreModal>
  </section>;
}

function InvoiceDetail({ invoice }) {
  const columns = [
    { header: "Plan / Sản phẩm", accessorKey: "name" },
    { header: "Số lượng", accessorKey: "quantity" },
    { header: "Đơn giá", accessorKey: "unitPrice", cell: ({ getValue }) => invoiceMoney(getValue(), invoice.currency) },
    { header: "Thành tiền", accessorKey: "amount", cell: ({ getValue }) => invoiceMoney(getValue(), invoice.currency) },
  ];
  return <div className="invoice-detail">
    <dl className="invoice-facts">
      <div><dt>Mã hóa đơn</dt><dd>{invoice.invoiceNumber || invoice.id}</dd></div>
      <div><dt>Tiếp nhận lúc</dt><dd>{invoiceDate(invoice.receivedAt)}</dd></div>
      <div><dt>Thời điểm giao dịch</dt><dd>{invoiceDate(invoice.transactionTime)}</dd></div>
      <div><dt>Trạng thái</dt><dd>{invoice.status || "—"}</dd></div>
      <div><dt>Thanh toán</dt><dd>{invoice.paymentStatus || "—"}</dd></div>
      <div><dt>Tổng tiền</dt><dd>{invoiceMoney(invoice.totalAmount, invoice.currency)}</dd></div>
    </dl>
    <CoreTable columns={columns} data={invoiceLines(invoice)} emptyTitle="Chưa có chi tiết sản phẩm" />
  </div>;
}
