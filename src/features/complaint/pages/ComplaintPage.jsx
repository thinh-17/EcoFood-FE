import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreCard, CoreSelect, CoreTable } from "@thinh-17/fe-core";
import { CoreButton, CoreFormActions } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
import { StatusBadge } from "../../../components/StatusBadge.jsx";
import { CorePagination as Pagination } from "@thinh-17/fe-core";
import { BackButton } from "../../../components/BackButton.jsx";
import { ComplaintHistory } from "../components/ComplaintHistory.jsx";
import { FiMessageSquare, FiRefreshCw, FiPlus } from "react-icons/fi";
import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { customerApi } from "../../customer/api/customer.api.js";
import { useCustomerProfile } from "../../customer/hooks/useCustomerProfile.js";
import { complaintApi as api } from "../api/complaint.api.js";
import { complaintAccess, complaintStatuses, complaintError, complaintTypes, complaintTypeLabel } from "../lib/complaint.js";
import { customerComplaintRoot } from "../lib/customerComplaintUpdates.js";
import "./ComplaintPage.css";

const transitionLabels = { WAITING_REPORTER: "Request information", IN_PROGRESS: "Resume processing", RESOLVED: "Resolve complaint", CLOSED: "Close complaint" };

export function CustomerCarePage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  const profile = useCustomerProfile();
  return <section className="complaint-page"><CorePageHeader title="Customer Care" description="Submit and track complaints about a service or the app platform." />
    {!token && <FeedbackMessage tone="warning">Please <Link to="/customer/login">sign in as a customer</Link> to continue.</FeedbackMessage>}
    {token && profile.isPending && <CoreLoadingState title="Checking your account" />}
    {profile.error && <FeedbackMessage error={profile.error}>{complaintError(profile.error)}</FeedbackMessage>}
    {profile.data && <Workspace key={token} customer scope={token} tenantId={profile.data.tenantId} />}
  </section>;
}
export function ComplaintManagementPage() {
  const token = useAuthStore((s) => s.internalAccessToken); let claims = {};
  const [params] = useSearchParams();
  try { claims = decodeJwt(token); } catch { /* No authenticated claims. */ }
  if (!complaintAccess(claims).read) return <section className="complaint-page"><CorePageHeader title="Complaint Management" /><FeedbackMessage tone="warning">An authorized admin or assigned handler account with complaint permissions is required.</FeedbackMessage></section>;
  return <section className="complaint-page"><CorePageHeader title={params.get("complaintId") ? "Complaint details" : "Complaint Management"} description="Review and respond to complaints assigned to your workspace." /><Workspace key={token} scope={token} /></section>;
}
function Workspace({ customer = false, scope, tenantId }) {
  const client = useQueryClient(), [params, setParams] = useSearchParams();
  const root = customer ? customerComplaintRoot(scope, tenantId) : ["complaints", scope, false];
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
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
    { accessorKey: "updatedAt", header: "Updated", cell: ({ getValue }) => date(getValue()) },
  ];
  return <>
    {!customer && capabilities.isPending && <CoreLoadingState title="Checking permissions" />}
    {error && <FeedbackMessage error={error}>{complaintError(error)}</FeedbackMessage>}
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
      <Pagination page={page} hasNext={list.data?.hasNext} onPageChange={setPage} disabled={list.isFetching} label="Complaint pagination" />
      </>}
      {selected && <BackButton onClick={() => setSelected("")}>Back to complaints</BackButton>}
      {selected && detail.isPending && <CoreLoadingState title="Loading complaint" />}
      {c && <CoreCard className="complaint-panel complaint-detail">
        <header className="complaint-detail__header">
          <span className="complaint-detail__symbol"><FiMessageSquare size={22} aria-hidden="true" /></span>
          <div className="complaint-detail__title"><span>{complaintTypeLabel(c.complaintType)} complaint</span><h2>{c.subject}</h2></div>
          <StatusBadge status={c.status} />
        </header>
        <dl className="complaint-detail__facts">
          <div className="complaint-detail__identifier"><dt>Complaint ID</dt><dd><code>{c.id}</code></dd></div>
          {!customer && <div><dt>Customer</dt><dd>{detail.data.customerName?.trim() || <span className="complaint-detail__missing">Not provided</span>}</dd></div>}
          <div><dt>Assigned handler</dt><dd>{c.assignedTo ? <code>{c.assignedTo}</code> : <span className="complaint-detail__missing">Admin queue</span>}</dd></div>
          {c.complaintType === "TENANT" && c.invoiceId && <div><dt>Related invoice</dt><dd>{customer ? <Link to={`/customer/invoices/${encodeURIComponent(c.invoiceId)}`}>{c.invoiceId}</Link> : <code>{c.invoiceId}</code>}</dd></div>}
        </dl>
        <section className="complaint-detail__description"><h3>Complaint description</h3><p className="complaint-text">{c.description || "No description provided."}</p></section>
        {customer && c.status === "WAITING_REPORTER" && <section className="complaint-response"><h3>Follow-up</h3><ReplyForm key={`${c.id}/${c.revision}`} busy={mutation.isPending} send={(note) => mutation.mutate(() => api.reply(c.id, { revision: c.revision, note }))} /></section>}
        {!customer && <section className="complaint-response"><h3>Response & resolution</h3><AdminActions key={`${c.id}/${c.revision}`} c={c} handling={detail.data.handling || {}} busy={mutation.isPending} send={(action, data) => mutation.mutate(() => api.action(c.id, action, { revision: c.revision, ...data }))} /></section>}
        <ComplaintHistory items={c.events} />
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
    <BackButton onClick={cancel} disabled={busy}>Back to complaints</BackButton>
    <h2>New complaint</h2><p>You can have up to 3 active complaints at a time. Resolved and closed complaints do not count toward this limit.</p><label>Complaint type<CoreSelect value={type} onChange={(value) => change(setType, value)} options={complaintTypes} /></label>
    {type === "TENANT" && <><label>Your invoice<CoreSelect value={invoiceId} onChange={(value) => change(setInvoice, value)} placeholder="Select an invoice"
      options={(invoices.data?.content ?? []).map((invoice) => ({ value: invoice.id, label: invoice.invoiceNumber }))} /></label>
      {invoices.isPending && <CoreLoadingState title="Loading invoices" />}{invoices.error && <FeedbackMessage error={invoices.error}>{complaintError(invoices.error)}</FeedbackMessage>}{invoices.data && !invoices.data.content.length && <p>You need an invoice to submit a service complaint.</p>}
      <Pagination page={invoicePage} hasNext={invoices.data?.hasNext} onPageChange={setInvoicePage} disabled={invoices.isFetching} label="Invoice selection pagination" />
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
      {(handling.transitions || []).map((status) => <CoreButton key={status} variant="secondary" disabled={busy || !note.trim()} onClick={() => act("transition", { status })}>{transitionLabels[status] || status}</CoreButton>)}
      {handling.requestSupport && <CoreButton variant="secondary" disabled={busy || !note.trim()} onClick={() => act("request-support")}>Request admin support</CoreButton>}
    </div>
    {handling.assign && active && <><label>Assigned to<CoreSelect value={assignedTo} onChange={setAssignedTo} placeholder="Select an authorized handler"
      options={(assignees.data ?? []).map((user) => ({ value: user.id, label: user.name || user.id }))} /></label>{assignees.error && <FeedbackMessage error={assignees.error}>{complaintError(assignees.error)}</FeedbackMessage>}<CoreButton disabled={busy || !note.trim() || !assignedTo} onClick={() => act("assign", { assignedTo })}>Assign</CoreButton></>}
  </div>;
}
function date(value) { return value ? new Date(value).toLocaleString("en-US") : "—"; }
