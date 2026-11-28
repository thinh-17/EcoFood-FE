import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreCard, CoreModal, CoreTable } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { invoiceDashboardApi as invoiceApi } from "../../dashboard/api/invoiceDashboard.api.js";
import { useInvoiceTenants } from "../../dashboard/hooks/useInvoiceDashboard.js";
import { DashboardTenantPicker } from "../../dashboard/components/DashboardTenantPicker.jsx";
import { canAccessManager } from "../../dashboard/lib/dashboardAccess.js";
import { DashboardAccessDenied, DashboardNoAccess } from "../../dashboard/components/DashboardAccessDenied.jsx";
import { invoiceMoney, invoiceDate, invoiceLines, invoiceError } from "../lib/invoice.lib.js";
import { invoiceTenantSelection, invoicePropositions, invoiceDetailView } from "../lib/invoiceDashboardAdapter.js";
import "./invoice.css";

export function InvoiceListPage() {
  const token = useAuthStore((state) => state.internalAccessToken);
  let claims = {};
  try { claims = decodeJwt(token) || {}; } catch { /* The auth route handles invalid sessions. */ }
  return canAccessManager(claims.roles) ? <InvoiceWorkspace key={token} scope={token} />
    : <section className="invoice-page"><CorePageHeader title="Invoice" />
      <FeedbackMessage tone="warning">You do not have permission to view invoices in this tenant.</FeedbackMessage></section>;
}

function InvoiceWorkspace({ scope }) {
  const client = useQueryClient();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [selected, setSelected] = useState(null);
  const [tenantIds, setTenantIds] = useState(null);
  const tenants = useInvoiceTenants(scope);
  const firstAccessible = tenants.data?.find((tenant) => tenant.accessible !== false);
  const chosen = tenantIds ?? (firstAccessible ? [firstAccessible.id] : []);
  const selection = invoiceTenantSelection(chosen);
  const root = ["invoice-dashboard", scope];
  const list = useQuery({ queryKey: [...root, "list", selection, page, size], retry: false,
    enabled: tenants.isSuccess && !!selection,
    queryFn: () => invoiceApi.list({ tenantIds: selection, page, size }) });
  const detail = useQuery({ queryKey: [...root, "detail", selected?.tenantId, selected?.id], enabled: !!selected, retry: false,
    queryFn: () => invoiceApi.detail(selected.id, selected.tenantId).then(invoiceDetailView) });
  function changeTenants(ids) { setTenantIds(ids); setPage(0); setSelected(null); }
  if (tenants.isPending) return <CoreLoadingState title="Loading invoice tenant scope" />;
  if (tenants.error?.response?.status === 403 || tenants.isSuccess && !firstAccessible)
    return <DashboardAccessDenied title="Invoice" />;
  if (tenants.isError || !tenants.data?.length) return <section className="invoice-page"><CorePageHeader title="Invoice" />
    <FeedbackMessage tone="warning" error={tenants.error}>{tenants.isError ? invoiceError(tenants.error) : "You do not have permission to access this dashboard."}</FeedbackMessage></section>;
  const columns = [
    { header: "Invoice ID", accessorKey: "id" },
    { header: "Received time", accessorKey: "receivedAt", cell: ({ getValue }) => invoiceDate(getValue()) },
    { header: "Proposition", accessorKey: "propositions", cell: ({ row }) => invoicePropositions(row.original) },
    { header: "Total amount", accessorKey: "totalAmount", cell: ({ row }) => invoiceMoney(row.original.totalAmount, row.original.currency) },
    { id: "actions", header: "Details", cell: ({ row }) =>
      <CoreButton size="sm" variant="secondary" onClick={() => setSelected(row.original)}>View</CoreButton> },
  ];
  return <section className="invoice-page">
    <CorePageHeader title="Invoice" description="Invoices for authorized tenants, newest first."
      aside={<CoreButton variant="secondary" disabled={list.isFetching}
        onClick={() => client.invalidateQueries({ queryKey: root })}>Refresh</CoreButton>} />
    <div className="invoice-tenant-filter"><DashboardTenantPicker tenants={tenants.data} selected={chosen} onChange={changeTenants} /></div>
    {!selection && <p role="status">Select at least one tenant to view invoices.</p>}
    {selection && <>
    <div className="invoice-toolbar">
      <span>{list.data ? `${list.data.totalElements ?? 0} invoices` : list.isPending ? <CoreLoadingState variant="inline" title="Loading invoices" /> : "Invoices unavailable"}</span>
      <label>Rows per page <select value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(0); }}>
        {[20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </div>
    {list.error?.response?.status === 403 ? <DashboardNoAccess /> : list.isError ? <FeedbackMessage error={list.error}>{invoiceError(list.error)}</FeedbackMessage> :
      <CoreCard><CoreTable columns={columns} data={list.data?.content ?? []} loading={list.isPending}
        page={page} pageSize={size} totalElements={list.data?.totalElements ?? 0} onPageChange={setPage}
        emptyTitle="No invoices yet" emptyDescription="Successfully received invoices will appear here." /></CoreCard>}
    </>}
    <CoreModal isOpen={!!selected} onClose={() => setSelected(null)} title="Invoice details" size="lg"
      footer={<CoreButton variant="secondary" onClick={() => setSelected(null)}>Close</CoreButton>}>
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
      <div><dt>Invoice ID</dt><dd>{invoice.id}</dd></div>
      <div><dt>Received time</dt><dd>{invoiceDate(invoice.receivedAt)}</dd></div>
      <div><dt>Tenant</dt><dd>{invoice.tenantCode || "—"}</dd></div>
      <div><dt>Proposition</dt><dd>{invoicePropositions(invoice)}</dd></div>
      <div><dt>Total amount</dt><dd>{invoiceMoney(invoice.totalAmount, invoice.currency)}</dd></div>
    </dl>
    <CoreTable columns={columns} data={invoiceLines(invoice)} emptyTitle="No product details available" />
  </div>;
}
