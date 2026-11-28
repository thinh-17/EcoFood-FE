import { CoreButton, CoreCard, CoreTable, CoreTabs } from "@thinh-17/fe-core";
import { useState } from "react";
import { useInvoiceDetail } from "../hooks/useInvoiceDashboard.js";
import { invoiceDate } from "../lib/invoiceDashboard.js";
const ITEM_COLUMNS = [
  { accessorKey: "productCode", header: "Product code" }, { accessorKey: "productName", header: "Product name" },
  { accessorKey: "quantity", header: "Quantity" }, { accessorKey: "unitPrice", header: "Unit price" }, { accessorKey: "amount", header: "Amount" },
];
const PLAN_COLUMNS = [
  { accessorKey: "planName", header: "Plan" }, { accessorKey: "planId", header: "Plan ID" },
  { accessorKey: "quantity", header: "Quantity" }, { accessorKey: "unitPrice", header: "Unit price" }, { accessorKey: "amount", header: "Amount" },
];
const TABS = [{ id: "overview", label: "Overview" }, { id: "items", label: "Invoice items" }];
export function InvoiceDetail({ scope, tenantId, id, onBack }) {
  const query = useInvoiceDetail(scope, tenantId, id);
  const [tab, setTab] = useState("overview");
  const detail = query.data, invoice = detail?.invoice;
  const fields = detail ? [
    ["Invoice ID", invoice.id], ["Tenant", detail.tenantCode],
    ["Received at", invoiceDate(detail.receivedAt)],
    ["Total amount", invoice.totalAmount], ["Currency", invoice.currency],
    ["Proposition", detail.propositions?.map((p) => p.name ? `${p.name} (${p.id})` : p.id).join(", ") || invoice.propositionId],
    ["POS", detail.posId], ["Distribution partner", detail.distributionPartnerId], ["Submitted by", detail.submittedBy],
  ] : [];
  return <>
    <div className="invoice-dashboard__actions"><CoreButton variant="secondary" onClick={onBack}>Back to Invoices</CoreButton></div>
    {query.isPending && <p role="status">Loading invoice details…</p>}
    {query.isError && <p role="alert">{query.error?.response?.data?.message || "Unable to load this invoice."}</p>}
    {detail && <CoreCard>
      <h2>Invoice {invoice.id}</h2>
      <CoreTabs className="invoice-dashboard__tabs" tabs={TABS} activeId={tab} onChange={setTab} />
      {tab === "overview" && <dl className="invoice-dashboard__details">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl>}
      {tab === "items" && <CoreTable columns={detail.planLines?.length ? PLAN_COLUMNS : ITEM_COLUMNS}
        data={detail.planLines?.length ? detail.planLines : detail.items ?? []} emptyTitle="No invoice items" />}
    </CoreCard>}
  </>;
}
