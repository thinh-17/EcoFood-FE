import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreButton, CoreCard, CoreFormActions, CorePageHeader, CoreSelect, CoreTable } from "@thinh-17/fe-core";
import { FiMessageSquare, FiRefreshCw, FiPlus } from "react-icons/fi";
import { useAuthStore } from "../auth/store/authStore.js";
import { decodeJwt } from "../auth/lib/jwt.js";
import { customerApi } from "../customer/customer.api.js";
import { useCustomerProfile } from "../customer/hooks/useCustomerProfile.js";
import { complaintApi as api } from "./complaint.api.js";
import { complaintAccess, complaintStatuses, complaintError, complaintTypes, complaintTypeLabel } from "./complaint.js";
import "./ComplaintPage.css";

export function CustomerCarePage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  const profile = useCustomerProfile();
  return <section className="complaint-page"><CorePageHeader title="Customer Care" description="Submit and track complaints about a service or the app platform." />
    {!token && <p role="alert">Please <Link to="/customer/login">sign in as a customer</Link> to continue.</p>}
    {token && profile.isPending && <p role="status">Checking your account…</p>}
    {profile.error && <p role="alert">{complaintError(profile.error)}</p>}
    {profile.data && <Workspace key={token} customer scope={token} />}
  </section>;
}
export function ComplaintManagementPage() {
  const token = useAuthStore((s) => s.internalAccessToken); let claims = {};
  const [params] = useSearchParams();
  try { claims = decodeJwt(token); } catch { /* No authenticated claims. */ }
  if (!complaintAccess(claims).read) return <section className="complaint-page"><CorePageHeader title="Complaint Management" /><p role="alert">An authorized admin or assigned handler account with complaint permissions is required.</p></section>;
  return <section className="complaint-page"><CorePageHeader title={params.get("complaintId") ? "Complaint details" : "Complaint Management"} description="Review and respond to complaints assigned to your workspace." /><Workspace key={token} scope={token} /></section>;
}
function Workspace({ customer = false, scope }) {
  const client = useQueryClient(), [params, setParams] = useSearchParams();
  const root = ["complaints", scope, customer];
  const [status, setStatus] = useState(""), [type, setType] = useState(""), [page, setPage] = useState(0);
  const selected = params.get("complaintId") || "";
  function setSelected(id) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (id) next.set("complaintId", id); else next.delete("complaintId");
      return next;
    });
  }
  const [creating, setCreating] = useState(customer && !!params.get("invoiceId"));
  const capabilities = useQuery({ queryKey: [...root, "capabilities"], queryFn: api.capabilities, enabled: !customer, retry: false });
  const allowed = customer || !!capabilities.data;
  const list = useQuery({ queryKey: [...root, "list", status, type, page], queryFn: () => api.list(customer, { status: status || undefined, type: customer ? undefined : type || undefined, page, size: 20 }), enabled: allowed && !selected, retry: false });
  const detail = useQuery({ queryKey: [...root, "detail", selected], queryFn: () => api.detail(customer, selected), enabled: allowed && !!selected, retry: false });
  const mutation = useMutation({ mutationFn: (work) => work(), onSuccess: () => client.invalidateQueries({ queryKey: root }) });
  const c = customer ? detail.data : detail.data?.complaint;
  const error = capabilities.error || (selected ? detail.error : list.error) || mutation.error;
  async function create(data) { try { const row = await mutation.mutateAsync(() => api.create(data)); setSelected(row.id); setCreating(false); } catch { /* Preserve form for retry. */ } }
  function filter(setter, value) { setter(value); setPage(0); }
  const columns = [
    { accessorKey: "id", header: "Complaint ID" },
    { accessorKey: "invoiceId", header: "Invoice ID", cell: ({ row }) => row.original.complaintType === "TENANT" ? row.original.invoiceId : "—" },
    { accessorKey: "subject", header: "Subject", cell: ({ row }) => <CoreButton size="sm" variant="secondary"
      onClick={() => { setSelected(row.original.id); mutation.reset(); }}>{row.original.subject}</CoreButton> },
    { accessorKey: "complaintType", header: "Type", cell: ({ getValue }) => complaintTypeLabel(getValue()) },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "updatedAt", header: "Updated", cell: ({ getValue }) => date(getValue()) },
  ];
  return <>
    {!customer && capabilities.isPending && <p role="status">Checking permissions…</p>}
    {error && <p role="alert">{complaintError(error)}</p>}
    {allowed && <>
      {!selected && <>
      <div className="complaint-toolbar">
        {customer && <CoreButton onClick={() => setCreating(!creating)}><FiPlus /> New complaint</CoreButton>}
        <label>Status<CoreSelect value={status} onChange={(value) => filter(setStatus, value)} placeholder="All"
          options={complaintStatuses.map((value) => ({ value, label: value }))} /></label>
        {!customer && <label>Complaint type<CoreSelect value={type} onChange={(value) => filter(setType, value)} placeholder="All available types"
          options={capabilities.data.types.map((value) => ({ value, label: complaintTypeLabel(value) }))} /></label>}
        <CoreButton variant="secondary" onClick={() => client.invalidateQueries({ queryKey: root })}><FiRefreshCw /> Refresh</CoreButton>
      </div>
      {creating && customer && <CreateForm initialInvoice={params.get("invoiceId") || ""} busy={mutation.isPending} save={create} cancel={() => setCreating(false)} />}
      <CoreCard className="complaint-panel"><CoreTable columns={columns} data={list.data?.content ?? []}
        loading={list.isPending} emptyTitle="No matching complaints." /></CoreCard>
      <div className="complaint-toolbar"><CoreButton variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</CoreButton><span>Page {page + 1}</span><CoreButton variant="secondary" disabled={!list.data?.hasNext} onClick={() => setPage(page + 1)}>Next</CoreButton></div>
      </>}
      {selected && <CoreButton variant="secondary" onClick={() => setSelected("")}>Back to complaints</CoreButton>}
      {selected && detail.isPending && <p role="status">Loading complaint…</p>}
      {c && <CoreCard className="complaint-panel"><h2><FiMessageSquare /> {c.subject}</h2>
        <p>Complaint ID: {c.id}</p><p>{complaintTypeLabel(c.complaintType)} · {c.status}</p><p className="complaint-text">{c.description}</p>
        {c.complaintType === "TENANT" && c.invoiceId && <p>Invoice ID: {customer ? <Link to={`/customer/invoices/${encodeURIComponent(c.invoiceId)}`}>{c.invoiceId}</Link> : c.invoiceId}</p>}
        {!customer && detail.data.customerName && <p>Customer: {detail.data.customerName}</p>}
        <p>Assigned to: {c.assignedTo || "Admin queue"}</p>
        {customer && c.status === "WAITING_REPORTER" && <ReplyForm key={`${c.id}/${c.revision}`} busy={mutation.isPending} send={(note) => mutation.mutate(() => api.reply(c.id, { revision: c.revision, note }))} />}
        {!customer && <AdminActions key={`${c.id}/${c.revision}`} c={c} handling={detail.data.handling || {}} busy={mutation.isPending} send={(action, data) => mutation.mutate(() => api.action(c.id, action, { revision: c.revision, ...data }))} />}
        <h3>Activity history</h3><ol className="complaint-events">{(c.events || []).map((event) => <li key={event.id}><strong>{event.eventType}</strong> · {date(event.createdAt)}<p>{event.previousStatus || "—"} → {event.newStatus}</p><p className="complaint-text">{event.note}</p></li>)}</ol>
      </CoreCard>}
    </>}
  </>;
}
function CreateForm({ initialInvoice, busy, save, cancel }) {
  const token = useAuthStore((s) => s.internalAccessToken), requestId = useRef(crypto.randomUUID());
  const [type, setType] = useState(initialInvoice ? "TENANT" : "ECOSYSTEM"), [invoiceId, setInvoice] = useState(initialInvoice), [invoicePage, setInvoicePage] = useState(0);
  const [subject, setSubject] = useState(""), [description, setDescription] = useState("");
  const invoices = useQuery({ queryKey: ["customer", token, "invoices", invoicePage], queryFn: () => customerApi.invoices(invoicePage), enabled: type === "TENANT", retry: false });
  function change(setter, value) { setter(value); requestId.current = crypto.randomUUID(); }
  return <CoreCard className="complaint-panel"><form className="complaint-form" onSubmit={(e) => { e.preventDefault(); if (type === "TENANT" && !invoiceId) return; save({ complaintType: type, invoiceId: type === "TENANT" ? invoiceId : null, subject, description, requestId: requestId.current }); }}>
    <h2>New complaint</h2><p>You can submit up to 3 complaints in total for this account.</p><label>Complaint type<CoreSelect value={type} onChange={(value) => change(setType, value)} options={complaintTypes} /></label>
    {type === "TENANT" && <><label>Your invoice<CoreSelect value={invoiceId} onChange={(value) => change(setInvoice, value)} placeholder="Select an invoice"
      options={(invoices.data?.content ?? []).map((invoice) => ({ value: invoice.id, label: invoice.invoiceNumber }))} /></label>
      {invoices.isPending && <p role="status">Loading invoices…</p>}{invoices.error && <p role="alert">{complaintError(invoices.error)}</p>}{invoices.data && !invoices.data.content.length && <p>You need an invoice to submit a service complaint.</p>}
      <div className="complaint-toolbar"><CoreButton variant="secondary" disabled={!invoicePage} onClick={() => setInvoicePage(invoicePage - 1)}>Previous invoices</CoreButton><CoreButton variant="secondary" disabled={!invoices.data?.hasNext} onClick={() => setInvoicePage(invoicePage + 1)}>Next invoices</CoreButton></div>
    </>}
    <label>Subject<input className="fe-input" required maxLength={200} value={subject} onChange={(e) => change(setSubject, e.target.value)} /></label>
    <label>Description<textarea className="fe-input" required maxLength={10000} rows={5} value={description} onChange={(e) => change(setDescription, e.target.value)} /></label>
    <div className="complaint-toolbar"><CoreFormActions cancelLabel="Cancel" onCancel={cancel} confirmLabel="Submit complaint"
      confirmType="submit" confirmLoading={busy} confirmDisabled={type === "TENANT" && !invoiceId} /></div>
  </form></CoreCard>;
}
function ReplyForm({ busy, send }) {
  const [note, setNote] = useState("");
  return <form className="complaint-form" onSubmit={(e) => { e.preventDefault(); send(note); }}><label>Additional information<textarea className="fe-input" required maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} /></label><CoreButton type="submit" loading={busy}>Send reply</CoreButton></form>;
}
function AdminActions({ c, handling, busy, send }) {
  const token = useAuthStore((s) => s.internalAccessToken);
  const [note, setNote] = useState(""), [assignedTo, setAssignedTo] = useState("");
  const active = !["RESOLVED", "CLOSED"].includes(c.status);
  const assignees = useQuery({ queryKey: ["complaint-assignees", token, c.complaintType], queryFn: () => api.assignees(c.complaintType), enabled: !!handling.assign && active, retry: false });
  if (c.status === "CLOSED") return <p>This complaint is closed. Its activity history is retained.</p>;
  if (!handling.accept && !handling.respond && !handling.assign && !handling.requestSupport && !handling.transitions?.length) return <p>This complaint is read-only. Only the assigned handler can respond or update its status.</p>;
  function act(action, values = {}) { if (note.trim()) send(action, { note, ...values }); }
  return <div className="complaint-form"><label>Response / outcome<textarea className="fe-input" required maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
    <div className="complaint-toolbar">{handling.accept && <CoreButton disabled={busy || !note.trim()} onClick={() => act("accept")}>Accept</CoreButton>}
      {handling.respond && <CoreButton disabled={busy || !note.trim()} onClick={() => act("respond")}>Send response</CoreButton>}
      {(handling.transitions || []).map((status) => <CoreButton key={status} variant="secondary" disabled={busy || !note.trim()} onClick={() => act("transition", { status })}>{status}</CoreButton>)}
      {handling.requestSupport && <CoreButton variant="secondary" disabled={busy || !note.trim()} onClick={() => act("request-support")}>Request admin support</CoreButton>}
    </div>
    {handling.assign && active && <><label>Assigned to<CoreSelect value={assignedTo} onChange={setAssignedTo} placeholder="Select an authorized handler"
      options={(assignees.data ?? []).map((user) => ({ value: user.id, label: user.name || user.id }))} /></label>{assignees.error && <p role="alert">{complaintError(assignees.error)}</p>}<CoreButton disabled={busy || !note.trim() || !assignedTo} onClick={() => act("assign", { assignedTo })}>Assign</CoreButton></>}
  </div>;
}
function date(value) { return value ? new Date(value).toLocaleString("en-US") : "—"; }
