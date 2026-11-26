import { DashboardAccessDenied } from "../components/DashboardAccessDenied.jsx";
import { useState } from "react";
import { CoreButton, CoreCard, CorePageHeader, CoreSelect, CoreTable } from "@thinh-17/fe-core";
import { useAuthStore } from "../../auth/store/authStore.js";
import { useInvoiceDirectory, useInvoiceTenants } from "../hooks/useInvoiceDashboard.js";
import { InvoiceDetail } from "./InvoiceDetail.jsx";
import { invoiceDate } from "../lib/invoiceDashboard.js";
import "./InvoiceDashboardPage.css";

const COLUMNS = [
  { accessorKey: "invoiceNumber", header: "Invoice", cell: ({ getValue }) => <button type="button" className="invoice-dashboard__link">{getValue() || "View invoice"}</button> },
  { accessorKey: "transactionTime", header: "Transaction date", cell: ({ getValue }) => invoiceDate(getValue()) },
  { accessorKey: "propositionId", header: "Proposition" },
  { accessorKey: "totalAmount", header: "Total amount" },
  { accessorKey: "currency", header: "Currency" },
  { accessorKey: "status", header: "Status" },
];
export function InvoiceDashboardPage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  return <InvoiceWorkspace key={token} scope={token} />;
}
function InvoiceWorkspace({ scope }) {
  const [tenantId, setTenantId] = useState("");
  const tenants = useInvoiceTenants(scope);
  const selected = tenantId || tenants.data?.[0]?.id;
  if (tenants.isPending) return <p role="status">Loading invoice scope…</p>;
  if (tenants.error?.response?.status === 403) return <DashboardAccessDenied title="Invoice Dashboard" />;
  if (tenants.isError) return <p role="alert">Unable to load invoice scope.</p>;
  if (!tenants.data?.length) return <DashboardAccessDenied title="Invoice Dashboard" />;
  return <section className="eco-module-page invoice-dashboard">
    <CorePageHeader eyebrow="EcoFood Platform" title="Invoice Dashboard" description="View submitted invoices and their details." />
    <label className="fe-field invoice-dashboard__tenant">Tenant
      <CoreSelect value={selected} onChange={setTenantId} options={tenants.data.map((t) => ({ value: t.id, label: t.name }))} />
    </label>
    <InvoiceDirectory key={selected} scope={scope} tenantId={selected} />
  </section>;
}
function InvoiceDirectory({ scope, tenantId }) {
  const [page, setPage] = useState(0);
  const [id, setId] = useState(null);
  const query = useInvoiceDirectory(scope, tenantId, page);
  if (id) return <InvoiceDetail scope={scope} tenantId={tenantId} id={id} onBack={() => setId(null)} />;
  return <CoreCard>
    {query.isError && <p role="alert">{query.error?.response?.data?.message || "Unable to load invoices."} <CoreButton variant="secondary" onClick={() => query.refetch()}>Retry</CoreButton></p>}
    <CoreTable columns={COLUMNS} data={query.data?.content ?? []} loading={query.isPending}
      page={query.data?.number ?? page} pageSize={query.data?.size ?? 20} totalElements={query.data?.totalElements ?? 0}
      onPageChange={setPage} onRowClick={(row) => setId(row.id)}
      emptyTitle="No invoices found" emptyDescription="No invoices are available in this Tenant scope." />
  </CoreCard>;
}
