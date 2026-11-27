import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreCard, CoreModal, CoreTable } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
import { StatusBadge } from "../../../components/StatusBadge.jsx";
import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { invoiceApi } from "../api/invoice.api.js";
import { canReadInvoices, invoiceMoney, invoiceDate, invoiceLines, invoiceError } from "../lib/invoice.lib.js";
import "./invoice.css";

export function InvoiceListPage() {
  const token = useAuthStore((state) => state.internalAccessToken);
  let claims = {};
  try { claims = decodeJwt(token) || {}; } catch { /* The auth route handles invalid sessions. */ }
  return canReadInvoices(claims) ? <InvoiceWorkspace key={token} scope={token} />
    : <section className="invoice-page"><CorePageHeader title="Invoice" />
      <FeedbackMessage tone="warning">You do not have permission to view invoices in this tenant.</FeedbackMessage></section>;
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
    { header: "Invoice ID", accessorKey: "invoiceNumber" },
    { header: "Received time", accessorKey: "receivedAt", cell: ({ getValue }) => invoiceDate(getValue()) },
    { header: "Total amount", accessorKey: "totalAmount", cell: ({ row }) => invoiceMoney(row.original.totalAmount, row.original.currency) },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
    { header: "Payment status", accessorKey: "paymentStatus", cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
    { id: "actions", header: "Details", cell: ({ row }) =>
      <CoreButton size="sm" variant="secondary" onClick={() => setSelected(row.original.id)}>View</CoreButton> },
  ];
  return <section className="invoice-page">
    <CorePageHeader title="Invoice" description="Invoices for the current tenant, newest first."
      aside={<CoreButton variant="secondary" disabled={list.isFetching}
        onClick={() => client.invalidateQueries({ queryKey: root })}>Refresh</CoreButton>} />
    <div className="invoice-toolbar">
      <span>{list.data ? `${list.data.totalElements ?? 0} invoices` : list.isPending ? <CoreLoadingState variant="inline" title="Loading invoices" /> : "Invoices unavailable"}</span>
      <label>Rows per page <select value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(0); }}>
        {[20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </div>
    {list.isError ? <FeedbackMessage error={list.error}>{invoiceError(list.error)}</FeedbackMessage> :
      <CoreCard><CoreTable columns={columns} data={list.data?.content ?? []} loading={list.isPending}
        page={page} pageSize={size} totalElements={list.data?.totalElements ?? 0} onPageChange={setPage}
        emptyTitle="No invoices yet" emptyDescription="Successfully received invoices will appear here." /></CoreCard>}
    <CoreModal isOpen={!!selected} onClose={() => setSelected("")} title="Invoice details" size="lg"
      footer={<CoreButton variant="secondary" onClick={() => setSelected("")}>Close</CoreButton>}>
      {detail.isPending && <CoreLoadingState title="Loading invoice" />}
      {detail.isError && <FeedbackMessage error={detail.error}>{invoiceError(detail.error)}</FeedbackMessage>}
      {detail.data && !detail.isError && <InvoiceDetail invoice={detail.data} />}
    </CoreModal>
  </section>;
}

function InvoiceDetail({ invoice }) {
  const columns = [
    { header: "Plan / Product", accessorKey: "name" },
    { header: "Quantity", accessorKey: "quantity" },
    { header: "Unit price", accessorKey: "unitPrice", cell: ({ getValue }) => invoiceMoney(getValue(), invoice.currency) },
    { header: "Amount", accessorKey: "amount", cell: ({ getValue }) => invoiceMoney(getValue(), invoice.currency) },
  ];
  return <div className="invoice-detail">
    <dl className="invoice-facts">
      <div><dt>Invoice ID</dt><dd>{invoice.invoiceNumber || invoice.id}</dd></div>
      <div><dt>Received time</dt><dd>{invoiceDate(invoice.receivedAt)}</dd></div>
      <div><dt>Transaction time</dt><dd>{invoiceDate(invoice.transactionTime)}</dd></div>
      <div><dt>Status</dt><dd>{invoice.status || "—"}</dd></div>
      <div><dt>Payment status</dt><dd>{invoice.paymentStatus || "—"}</dd></div>
      <div><dt>Total amount</dt><dd>{invoiceMoney(invoice.totalAmount, invoice.currency)}</dd></div>
    </dl>
    <CoreTable columns={columns} data={invoiceLines(invoice)} emptyTitle="No product details available" />
  </div>;
}
