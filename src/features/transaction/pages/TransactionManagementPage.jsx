import { useMemo, useState } from "react";
import { CoreButton, CoreCard, CoreModal, CorePageHeader, CoreSelect, CoreTable } from "@thinh-17/fe-core";
import { useTransactionDetail, useTransactions, useTransactionSummary } from "../hooks/useTransactions.js";
import { buildTransactionFilters, formatDate, formatMoney, transactionError } from "../lib/transactionFormat.js";
import { TransactionStatus } from "../components/TransactionStatus.jsx";
import "../transaction.css";

const EMPTY_FILTER = { invoiceId: "", invoiceNumber: "", from: "", to: "", status: "" };
const ITEM_COLUMNS = [
  { accessorKey: "productCode", header: "Mã sản phẩm" },
  { accessorKey: "productName", header: "Tên sản phẩm" },
  { accessorKey: "quantity", header: "Số lượng" },
  { accessorKey: "unitPrice", header: "Đơn giá" },
  { accessorKey: "amount", header: "Thành tiền" },
];

function InvoiceDetail({ id }) {
  const query = useTransactionDetail(id);
  if (query.isPending) return <p role="status">Đang tải chi tiết hóa đơn...</p>;
  if (query.isError) return <div role="alert" className="transaction-error">
    <p>{transactionError(query.error)}</p>
    <CoreButton variant="secondary" onClick={() => query.refetch()}>Thử lại</CoreButton>
  </div>;
  const invoice = query.data;
  const fields = [
    ["Invoice ID", invoice.id], ["Mã hóa đơn", invoice.invoiceNumber],
    ["Tenant", invoice.tenantId], ["POS", invoice.posId],
    ["Distribution Partner", invoice.distributionPartnerId], ["Người gửi", invoice.submittedBy],
    ["Plan", invoice.planId], ["Proposition", invoice.propositionId],
    ["Ngày giao dịch", formatDate(invoice.transactionTime)], ["Tiếp nhận lúc", formatDate(invoice.receivedAt)],
  ];
  return <div className="transaction-detail">
    <div className="transaction-toolbar"><TransactionStatus status={invoice.status} />
      <strong>{formatMoney(invoice.totalAmount, invoice.currency)}</strong></div>
    <dl className="transaction-metadata">{fields.map(([label, value]) => <div key={label}>
      <dt>{label}</dt><dd>{value || "—"}</dd>
    </div>)}</dl>
    <h3>Sản phẩm · {invoice.currency}</h3>
    <CoreTable columns={ITEM_COLUMNS} data={invoice.items || []} emptyTitle="Không có sản phẩm" />
  </div>;
}

export function TransactionManagementPage() {
  const [draft, setDraft] = useState(EMPTY_FILTER);
  const [filters, setFilters] = useState({});
  const [filterError, setFilterError] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [selectedId, setSelectedId] = useState(null);
  const list = useTransactions(filters, page, size);
  const summary = useTransactionSummary(filters);
  const columns = useMemo(() => [
    { accessorKey: "invoiceNumber", header: "Mã hóa đơn" },
    { accessorKey: "id", header: "Invoice ID" },
    { accessorKey: "distributionPartnerId", header: "Distribution Partner" },
    { accessorKey: "transactionTime", header: "Ngày giao dịch", cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: "status", header: "Trạng thái", cell: ({ getValue }) => <TransactionStatus status={getValue()} /> },
    { accessorKey: "totalAmount", header: "Tổng tiền", cell: ({ row }) => formatMoney(row.original.totalAmount, row.original.currency) },
    { id: "detail", header: "Chi tiết", cell: ({ row }) => <CoreButton variant="secondary" size="sm"
      onClick={() => setSelectedId(row.original.id)} aria-label={`Xem hóa đơn ${row.original.invoiceNumber}`}>Xem</CoreButton> },
  ], []);

  function applyFilters(event) {
    event.preventDefault();
    try {
      setFilters(buildTransactionFilters(draft));
      setPage(0);
      setFilterError("");
    } catch (error) {
      setFilterError(error.message);
    }
  }

  function resetFilters() {
    setDraft(EMPTY_FILTER); setFilters({}); setPage(0); setFilterError("");
  }

  function field(key) {
    return { value: draft[key], onChange: (event) => setDraft((old) => ({ ...old, [key]: event.target.value })) };
  }

  return <div className="eco-module-page transaction-page">
    <CorePageHeader eyebrow="EcoFood / UC-015" title="Quản lý giao dịch"
      description="Tra cứu hóa đơn và thống kê trong phạm vi dữ liệu được cấp."
      aside={<CoreButton variant="secondary" disabled={list.isFetching || summary.isFetching}
        onClick={() => { list.refetch(); summary.refetch(); }}>Làm mới</CoreButton>} />

    <CoreCard>
      <h2>Bộ lọc giao dịch</h2>
      <form onSubmit={applyFilters} className="transaction-filter">
        <label>Mã hóa đơn<input className="fe-input" type="search" maxLength={100} placeholder="Tìm theo mã hóa đơn" {...field("invoiceNumber")} /></label>
        <label>Invoice ID<input className="fe-input" type="search" placeholder="24 ký tự hex" {...field("invoiceId")} /></label>
        <label>Từ ngày<input className="fe-input" type="datetime-local" {...field("from")} /></label>
        <label>Đến ngày<input className="fe-input" type="datetime-local" {...field("to")} /></label>
        <label>Trạng thái<CoreSelect value={draft.status} placeholder="Tất cả"
          options={[{ value: "ACCEPTED", label: "ACCEPTED" }]}
          onChange={(status) => setDraft((old) => ({ ...old, status }))} /></label>
        <div className="transaction-actions"><CoreButton type="submit">Áp dụng</CoreButton>
          <CoreButton variant="secondary" onClick={resetFilters}>Xóa bộ lọc</CoreButton></div>
      </form>
      <p className="transaction-hint">Ngày theo giờ địa phương, lọc theo thời điểm giao dịch và bao gồm hai mốc. Thống kê dùng bộ lọc đã áp dụng.</p>
      {filterError && <p role="alert" className="transaction-error">{filterError}</p>}
    </CoreCard>

    <section aria-label="Thống kê giao dịch" className="transaction-statistics" aria-busy={summary.isFetching}>
      {summary.isPending && <p role="status">Đang tải thống kê...</p>}
      {summary.isError && <p role="alert" className="transaction-error">{transactionError(summary.error)}</p>}
      {!summary.isPending && !summary.isError && <>
        <CoreCard><span>Tổng giao dịch</span><strong className="transaction-statistic">{summary.data.totalTransactions}</strong></CoreCard>
        {summary.data.totalsByCurrency.map((total) => <CoreCard key={total.currency}>
          <span>Tổng giá trị · {total.currency}</span><strong className="transaction-statistic">{formatMoney(total.totalAmount, total.currency)}</strong>
          <small>{total.totalTransactions} giao dịch</small>
        </CoreCard>)}
        {summary.data.totalsByCurrency.length === 0 && <CoreCard>Chưa có giá trị giao dịch trong phạm vi tìm kiếm.</CoreCard>}
      </>}
    </section>

    <CoreCard>
      <div className="transaction-toolbar"><h2>Danh sách giao dịch</h2>
        <label>Số dòng mỗi trang<CoreSelect value={String(size)}
          options={[10, 20, 50, 100].map((value) => ({ value: String(value), label: String(value) }))}
          onChange={(value) => { setSize(Number(value)); setPage(0); }} /></label></div>
      {list.isError ? <div role="alert" className="transaction-error"><p>{transactionError(list.error)}</p>
        <CoreButton variant="secondary" onClick={() => list.refetch()}>Thử lại</CoreButton></div>
        : <CoreTable columns={columns} data={list.data?.content || []} loading={list.isFetching}
          page={page} pageSize={size} totalElements={list.data?.totalElements || 0}
          onPageChange={setPage} emptyTitle="Không có giao dịch"
          emptyDescription="Thử thay đổi bộ lọc hoặc kiểm tra dữ liệu đã submit trong tenant này." />}
    </CoreCard>
    <CoreModal isOpen={Boolean(selectedId)} onClose={() => setSelectedId(null)} title="Chi tiết hóa đơn" size="xl">
      {selectedId && <InvoiceDetail key={selectedId} id={selectedId} />}
    </CoreModal>
  </div>;
}
