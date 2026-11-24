import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CorePageHeader } from "@thinh-17/fe-core";
import { FiMessageSquare, FiRefreshCw, FiPlus } from "react-icons/fi";
import { useAuthStore } from "../auth/store/authStore.js";
import { decodeJwt } from "../auth/lib/jwt.js";
import { customerApi } from "../customer/customer.api.js";
import { complaintApi as api } from "./complaint.api.js";
import { complaintAccess, complaintStatuses, complaintTransitions, complaintError } from "./complaint.js";
import "./ComplaintPage.css";

export function CustomerCarePage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  const profile = useQuery({ queryKey: ["customer", token, "profile"], queryFn: customerApi.profile, enabled: !!token, retry: false });
  return <main className="complaint-page"><CorePageHeader title="Customer Care" description="Gửi và theo dõi phàn nàn về Tenant hoặc hệ sinh thái EcoFood." />
    <nav><Link to="/customer">Hồ sơ & Invoice</Link></nav>
    {!token && <p role="alert">Vui lòng <Link to="/customer/login">đăng nhập Customer</Link> để tiếp tục.</p>}
    {token && profile.isPending && <p role="status">Đang kiểm tra tài khoản…</p>}
    {profile.error && <p role="alert">{complaintError(profile.error)}</p>}
    {profile.data && <Workspace key={token} customer scope={token} />}
  </main>;
}
export function ComplaintManagementPage() {
  const token = useAuthStore((s) => s.internalAccessToken); let claims = {};
  try { claims = decodeJwt(token); } catch { /* No authenticated claims. */ }
  if (!complaintAccess(claims).read) return <section className="complaint-page"><CorePageHeader title="Complaint Management" /><p role="alert">Cần Tenant Admin hoặc Ecosystem Admin và permission COMPLAINT_READ.</p></section>;
  return <section className="complaint-page"><CorePageHeader title="Complaint Management" description="Tiếp nhận và xử lý Complaint trong phạm vi được cấp quyền." /><Workspace key={token} scope={token} /></section>;
}
function Workspace({ customer = false, scope }) {
  const client = useQueryClient(), [params] = useSearchParams();
  const root = ["complaints", scope, customer];
  const [status, setStatus] = useState(""), [type, setType] = useState(""), [page, setPage] = useState(0);
  const [selected, setSelected] = useState(""), [creating, setCreating] = useState(customer && !!params.get("invoiceId"));
  const capabilities = useQuery({ queryKey: [...root, "capabilities"], queryFn: api.capabilities, enabled: !customer, retry: false });
  const allowed = customer || !!capabilities.data;
  const list = useQuery({ queryKey: [...root, "list", status, type, page], queryFn: () => api.list(customer, { status: status || undefined, type: customer ? undefined : type || undefined, page, size: 20 }), enabled: allowed, retry: false });
  const detail = useQuery({ queryKey: [...root, "detail", selected], queryFn: () => api.detail(customer, selected), enabled: allowed && !!selected, retry: false });
  const mutation = useMutation({ mutationFn: (work) => work(), onSuccess: () => client.invalidateQueries({ queryKey: root }) });
  const c = customer ? detail.data : detail.data?.complaint;
  const error = capabilities.error || list.error || detail.error || mutation.error;
  async function create(data) { try { const row = await mutation.mutateAsync(() => api.create(data)); setSelected(row.id); setCreating(false); } catch { /* Preserve form for retry. */ } }
  function filter(setter, value) { setter(value); setPage(0); }
  return <>
    {!customer && capabilities.isPending && <p role="status">Đang kiểm tra quyền…</p>}
    {error && <p role="alert">{complaintError(error)}</p>}
    {allowed && <>
      <div className="complaint-toolbar">
        {customer && <button onClick={() => setCreating(!creating)}><FiPlus /> Tạo Complaint</button>}
        <label>Trạng thái<select value={status} onChange={(e) => filter(setStatus, e.target.value)}><option value="">Tất cả</option>{complaintStatuses.map((s) => <option key={s}>{s}</option>)}</select></label>
        {!customer && <label>Loại Complaint<select value={type} onChange={(e) => filter(setType, e.target.value)}><option value="">Tất cả trong phạm vi</option>{capabilities.data.types.map((t) => <option key={t}>{t}</option>)}</select></label>}
        <button onClick={() => client.invalidateQueries({ queryKey: root })}><FiRefreshCw /> Tải lại</button>
      </div>
      {creating && customer && <CreateForm initialInvoice={params.get("invoiceId") || ""} busy={mutation.isPending} save={create} cancel={() => setCreating(false)} />}
      <div className="complaint-panel complaint-table"><table><thead><tr><th>Tiêu đề</th><th>Loại</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead><tbody>{(list.data?.content || []).map((row) => <tr key={row.id}><td><button onClick={() => { setSelected(row.id); mutation.reset(); }}>{row.subject}</button></td><td>{row.complaintType}</td><td>{row.status}</td><td>{date(row.updatedAt)}</td></tr>)}</tbody></table>
        {list.isPending && <p role="status">Đang tải Complaint…</p>}{list.data && !list.data.content.length && <p>Chưa có Complaint phù hợp.</p>}
      </div>
      <div className="complaint-toolbar"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page + 1}</span><button disabled={!list.data?.hasNext} onClick={() => setPage(page + 1)}>Sau</button></div>
      {selected && detail.isPending && <p role="status">Đang tải chi tiết…</p>}
      {c && <article className="complaint-panel"><button onClick={() => setSelected("")}>Đóng chi tiết</button><h2><FiMessageSquare /> {c.subject}</h2>
        <p>{c.complaintType} · {c.status} · Revision {c.revision}</p><p className="complaint-text">{c.description}</p>
        {c.invoiceId && <p>Invoice: {customer ? <Link to={`/customer/invoices/${encodeURIComponent(c.invoiceId)}`}>{c.invoiceId}</Link> : detail.data.invoiceNumber || "Không còn khả dụng"}</p>}
        {!customer && detail.data.customerName && <p>Customer: {detail.data.customerName}</p>}
        <p>Người phụ trách: {c.assignedTo || "Chưa phân công"}</p>
        {customer && c.status === "WAITING_REPORTER" && <ReplyForm key={`${c.id}/${c.revision}`} busy={mutation.isPending} send={(note) => mutation.mutate(() => api.reply(c.id, { revision: c.revision, note }))} />}
        {!customer && capabilities.data.manage && <AdminActions key={`${c.id}/${c.revision}`} c={c} assign={capabilities.data.assign} busy={mutation.isPending} send={(action, data) => mutation.mutate(() => api.action(c.id, action, { revision: c.revision, ...data }))} />}
        <h3>Lịch sử xử lý</h3><ol className="complaint-events">{(c.events || []).map((event) => <li key={event.id}><strong>{event.eventType}</strong> · {date(event.createdAt)}<p>{event.previousStatus || "—"} → {event.newStatus}</p><p className="complaint-text">{event.note}</p></li>)}</ol>
      </article>}
    </>}
  </>;
}
function CreateForm({ initialInvoice, busy, save, cancel }) {
  const token = useAuthStore((s) => s.internalAccessToken), requestId = useRef(crypto.randomUUID());
  const [type, setType] = useState(initialInvoice ? "TENANT" : "ECOSYSTEM"), [invoiceId, setInvoice] = useState(initialInvoice), [invoicePage, setInvoicePage] = useState(0);
  const [subject, setSubject] = useState(""), [description, setDescription] = useState("");
  const invoices = useQuery({ queryKey: ["customer", token, "invoices", invoicePage], queryFn: () => customerApi.invoices(invoicePage), enabled: type === "TENANT", retry: false });
  function change(setter, value) { setter(value); requestId.current = crypto.randomUUID(); }
  return <form className="complaint-panel complaint-form" onSubmit={(e) => { e.preventDefault(); save({ complaintType: type, invoiceId: type === "TENANT" ? invoiceId : null, subject, description, requestId: requestId.current }); }}>
    <h2>Tạo Complaint</h2><label>Loại Complaint<select value={type} onChange={(e) => change(setType, e.target.value)}><option>ECOSYSTEM</option><option>TENANT</option></select></label>
    {type === "TENANT" && <><label>Invoice thuộc sở hữu<select required value={invoiceId} onChange={(e) => change(setInvoice, e.target.value)}><option value="">Chọn Invoice</option>{(invoices.data?.content || []).map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber}</option>)}</select></label>
      {invoices.isPending && <p role="status">Đang tải Invoice…</p>}{invoices.error && <p role="alert">{complaintError(invoices.error)}</p>}{invoices.data && !invoices.data.content.length && <p>Chưa có Invoice sở hữu. Liên kết hóa đơn qua UC-021 trước khi phàn nàn về Tenant.</p>}
      <div className="complaint-toolbar"><button type="button" disabled={!invoicePage} onClick={() => setInvoicePage(invoicePage - 1)}>Invoice trước</button><button type="button" disabled={!invoices.data?.hasNext} onClick={() => setInvoicePage(invoicePage + 1)}>Invoice sau</button></div>
    </>}
    <label>Tiêu đề<input required maxLength={200} value={subject} onChange={(e) => change(setSubject, e.target.value)} /></label>
    <label>Nội dung<textarea required maxLength={10000} rows={5} value={description} onChange={(e) => change(setDescription, e.target.value)} /></label>
    <div className="complaint-toolbar"><button type="submit" disabled={busy || (type === "TENANT" && !invoiceId)}>Gửi Complaint</button><button type="button" onClick={cancel}>Hủy</button></div>
  </form>;
}
function ReplyForm({ busy, send }) {
  const [note, setNote] = useState("");
  return <form className="complaint-form" onSubmit={(e) => { e.preventDefault(); send(note); }}><label>Bổ sung thông tin<textarea required maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} /></label><button type="submit" disabled={busy}>Gửi bổ sung</button></form>;
}
function AdminActions({ c, assign, busy, send }) {
  const token = useAuthStore((s) => s.internalAccessToken);
  const [note, setNote] = useState(""), [assignedTo, setAssignedTo] = useState("");
  const active = !["RESOLVED", "CLOSED"].includes(c.status);
  const assignees = useQuery({ queryKey: ["complaint-assignees", token, c.complaintType], queryFn: () => api.assignees(c.complaintType), enabled: assign && active, retry: false });
  if (c.status === "CLOSED") return <p>Complaint đã đóng. Lịch sử được giữ nguyên.</p>;
  function act(action, values = {}) { if (note.trim()) send(action, { note, ...values }); }
  return <div className="complaint-form"><label>Phản hồi / kết quả<textarea required maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
    <div className="complaint-toolbar">{c.status === "SUBMITTED" && <button disabled={busy || !note.trim()} onClick={() => act("accept")}>Tiếp nhận</button>}
      {["IN_PROGRESS", "WAITING_REPORTER"].includes(c.status) && <button disabled={busy || !note.trim()} onClick={() => act("respond")}>Ghi phản hồi</button>}
      {complaintTransitions(c.status).map((status) => <button key={status} disabled={busy || !note.trim()} onClick={() => act("transition", { status })}>{status}</button>)}
    </div>
    {assign && active && <><label>Người phụ trách<select aria-label="Người phụ trách" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}><option value="">Chọn Admin hợp lệ</option>{(assignees.data || []).map((u) => <option key={u.id} value={u.id}>{u.name || u.id}</option>)}</select></label>{assignees.error && <p role="alert">{complaintError(assignees.error)}</p>}<button disabled={busy || !note.trim() || !assignedTo} onClick={() => act("assign", { assignedTo })}>Phân công</button></>}
  </div>;
}
function date(value) { return value ? new Date(value).toLocaleString("vi-VN") : "—"; }
