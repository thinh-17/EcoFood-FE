import { DashboardAccessDenied } from "../components/DashboardAccessDenied.jsx";
import { useState } from "react";
import { CoreButton, CoreCard, CorePageHeader, CoreTable } from "@thinh-17/fe-core";
import { useAuthStore } from "../../auth/store/authStore.js";
import { useInvoiceDirectory, useInvoiceTenants } from "../hooks/useInvoiceDashboard.js";
import { InvoiceDetail } from "./InvoiceDetail.jsx";
import { DashboardTenantPicker } from "../components/DashboardTenantPicker.jsx";
import "./InvoiceDashboardPage.css";

const COLUMNS = [
  { accessorKey: "invoiceNumber", header: "Invoice", cell: ({ getValue }) => <button type="button" className="invoice-dashboard__link">{getValue() || "View invoice"}</button> },
  { accessorKey: "propositions", header: "Proposition", cell: ({ row }) =>
    row.original.propositions?.map((p) => p.name ? `${p.name} (${p.id})` : p.id).join(", ") || row.original.propositionId || "—" },
  { accessorKey: "totalAmount", header: "Total amount" },
  { accessorKey: "currency", header: "Currency" },
];
export function InvoiceDashboardPage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  return <InvoiceWorkspace key={token} scope={token} />;
}
function InvoiceWorkspace({ scope }) {
  const [tenantIds, setTenantIds] = useState(null);
  const tenants = useInvoiceTenants(scope);
  const selected = tenantIds ?? (tenants.data?.length ? [tenants.data[0].id] : []);
  if (tenants.isPending) return <p role="status">Loading invoice scope…</p>;
  if (tenants.error?.response?.status === 403) return <DashboardAccessDenied title="Invoice Dashboard" />;
  if (tenants.isError) return <p role="alert">Unable to load invoice scope.</p>;
  if (!tenants.data?.length) return <DashboardAccessDenied title="Invoice Dashboard" />;
  return <section className="eco-module-page invoice-dashboard">
    <CorePageHeader eyebrow="EcoFood Platform" title="Invoice Dashboard" description="View submitted invoices and their details." />
    <div className="invoice-dashboard__tenant">
      <DashboardTenantPicker tenants={tenants.data} selected={selected} onChange={setTenantIds} />
    </div>
    {selected.length ? <InvoiceDirectory key={[...selected].sort().join(",")} scope={scope} tenantIds={selected} />
      : <p role="status">Select at least one tenant to view invoices.</p>}
  </section>;
}
function InvoiceDirectory({ scope, tenantIds }) {
  const [page, setPage] = useState(0);
  const [invoice, setInvoice] = useState(null);
  const query = useInvoiceDirectory(scope, tenantIds, page);
  if (invoice) return <InvoiceDetail scope={scope} tenantId={invoice.tenantId} id={invoice.id} onBack={() => setInvoice(null)} />;
  return <CoreCard>
    {query.isError && <p role="alert">{query.error?.response?.data?.message || "Unable to load invoices."} <CoreButton variant="secondary" onClick={() => query.refetch()}>Retry</CoreButton></p>}
    <CoreTable columns={COLUMNS} data={query.data?.content ?? []} loading={query.isPending}
      page={query.data?.number ?? page} pageSize={query.data?.size ?? 20} totalElements={query.data?.totalElements ?? 0}
      onPageChange={setPage} onRowClick={setInvoice}
      emptyTitle="No invoices found" emptyDescription="No invoices are available in this Tenant scope." />
  </CoreCard>;
}
