import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CorePageHeader } from "@thinh-17/fe-core";
import { useAuthStore } from "../auth/store/authStore.js";
import { decodeJwt } from "../auth/lib/jwt.js";
import { notificationsApi as api } from "./notification.api.js";
import { notificationAccess, emptyRule, notificationError, historyParams } from "./notification.js";
import "./NotificationPage.css";

export function NotificationPage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  let claims = {};
  try { claims = decodeJwt(token); } catch { /* Authentication guard handles invalid tokens. */ }
  const allowed = notificationAccess(claims);
  if (!allowed.read && !allowed.manage) return <section className="notification-page"><CorePageHeader title="Notifications" /><p role="alert">Cần role Admin và permission Notification của Tenant hiện tại.</p></section>;
  return <NotificationWorkspace key={token} scope={token} />;
}
function NotificationWorkspace({ scope }) {
  const client = useQueryClient();
  const [tab, setTab] = useState("history"), [editing, setEditing] = useState(null), [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ event: "", status: "", from: "", to: "" }), [page, setPage] = useState(0);
  const root = ["notifications", scope];
  const cap = useQuery({ queryKey: [...root, "capabilities"], queryFn: api.capabilities });
  const rights = cap.data || {};
  const activeTab = !rights.read && rights.manage ? "configuration" : tab;
  const rules = useQuery({ queryKey: [...root, "rules"], queryFn: api.rules, enabled: !!rights.manage });
  const options = useQuery({ queryKey: [...root, "options"], queryFn: api.options, enabled: !!rights.manage });
  const history = useQuery({ queryKey: [...root, "history", filters, page], queryFn: () => api.history(historyParams(filters, page)), enabled: !!rights.read && activeTab === "history", refetchInterval: 15000 });
  const detail = useQuery({ queryKey: [...root, "detail", selected], queryFn: () => api.detail(selected), enabled: !!selected && !!rights.read, refetchInterval: 15000 });
  const mutation = useMutation({ mutationFn: (action) => action(), onSuccess: () => client.invalidateQueries({ queryKey: root }) });
  async function save(rule) {
    try { await mutation.mutateAsync(() => api.save(rule)); setEditing(null); } catch { /* Error remains visible with entered values. */ }
  }
  function retry(row) {
    const acknowledged = !row.deliveryUncertain || window.confirm("SMTP có thể đã nhận Email. Retry có nguy cơ gửi trùng. Bạn xác nhận gửi lại?");
    if (acknowledged) mutation.mutate(() => api.retry(row.id, !!row.deliveryUncertain));
  }
  function filter(name, value) { setFilters((previous) => ({ ...previous, [name]: value })); setPage(0); }
  const error = cap.error || mutation.error || (activeTab === "configuration" ? rules.error || options.error : history.error || detail.error);
  return <section className="notification-page">
    <CorePageHeader title="Notifications" description="Cấu hình thông báo và theo dõi Email của Tenant hiện tại." />
    <div className="notification-tabs" role="tablist" aria-label="Notification management">
      {rights.read && <button role="tab" aria-selected={activeTab === "history"} onClick={() => setTab("history")}>Lịch sử gửi</button>}
      {rights.manage && <button role="tab" aria-selected={activeTab === "configuration"} onClick={() => setTab("configuration")}>Cấu hình</button>}
      <button onClick={() => client.invalidateQueries({ queryKey: root })}>Tải lại</button>
    </div>
    {cap.isPending && <p>Đang kiểm tra quyền…</p>}
    {cap.data && !rights.read && !rights.manage && <p role="alert">Không có permission Notification đang có hiệu lực trong Tenant này.</p>}
    {error && <p role="alert" className="notification-error">{notificationError(error)}</p>}
    {activeTab === "configuration" && rights.manage && <>
      <p>INVOICE_PAID chỉ gửi khi SEND_EMAIL_NOTIFICATION đã được bật trong cấu hình Orchestrator tại thời điểm bán và có rule enabled.</p>
      <button disabled={mutation.isPending} onClick={() => setEditing(emptyRule())}>Tạo rule</button>
      {editing && options.data && <RuleEditor key={editing.id || "new"} rule={editing} options={options.data} busy={mutation.isPending} onSave={save} onCancel={() => setEditing(null)} />}
      <div className="notification-table"><table><thead><tr><th>Tên</th><th>Sự kiện</th><th>Trạng thái</th><th>Phiên bản</th><th>Thao tác</th></tr></thead><tbody>
        {(rules.data || []).map((rule) => <tr key={rule.id}><td>{rule.name}</td><td>{rule.eventType}</td><td>{rule.enabled ? "Enabled" : "Disabled"}</td><td>{rule.revision}</td><td>
          <button disabled={mutation.isPending} onClick={() => mutation.mutate(async () => { const loaded = await api.rule(rule.id); setEditing(loaded); })}>Xem / sửa</button>
          <button disabled={mutation.isPending} onClick={() => mutation.mutate(() => api.enable(rule))}>{rule.enabled ? "Tắt" : "Bật"}</button>
        </td></tr>)}
      </tbody></table>{rules.isPending ? <p>Đang tải…</p> : !rules.data?.length && <p>Chưa có rule. Hệ thống không tự tạo người nhận mặc định.</p>}</div>
    </>}
    {activeTab === "history" && rights.read && <>
      <div className="notification-filters">
        <label>Sự kiện<select value={filters.event} onChange={(e) => filter("event", e.target.value)}><option value="">Tất cả</option>{["INVOICE_PAID", "COMPLAINT_CREATED", "COMPLAINT_RESOLVED"].map((event) => <option key={event}>{event}</option>)}</select></label>
        <label>Trạng thái<select value={filters.status} onChange={(e) => filter("status", e.target.value)}><option value="">Tất cả</option>{["PENDING", "PROCESSING", "RETRY_PENDING", "SENT", "FAILED"].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Từ (giờ máy)<input type="datetime-local" value={filters.from} onChange={(e) => filter("from", e.target.value)} /></label>
        <label>Đến (giờ máy)<input type="datetime-local" value={filters.to} onChange={(e) => filter("to", e.target.value)} /></label>
      </div>
      <div className="notification-table"><table><thead><tr><th>Sự kiện</th><th>Người nhận</th><th>Trạng thái</th><th>Đã gửi lúc</th><th>Lỗi</th><th>Thao tác</th></tr></thead><tbody>
        {(history.data?.content || []).map((row) => <tr key={row.id}><td>{row.type}</td><td>{row.sendTo}</td><td>{row.status}</td><td>{row.sentAt ? new Date(row.sentAt).toLocaleString("vi-VN") : "—"}</td><td>{row.lastError || "—"}{row.deliveryUncertain && " (chưa rõ kết quả SMTP)"}</td><td>
          <button onClick={() => setSelected(row.id)}>Chi tiết</button>{rights.retry && row.status === "FAILED" && <button disabled={mutation.isPending} onClick={() => retry(row)}>Retry</button>}
        </td></tr>)}
      </tbody></table>{history.isPending ? <p>Đang tải…</p> : !history.data?.content?.length && <p>Không có thông báo phù hợp.</p>}</div>
      <div className="notification-pagination"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page + 1}</span><button disabled={!history.data?.hasNext} onClick={() => setPage(page + 1)}>Sau</button></div>
      {selected && <article className="notification-detail"><button onClick={() => setSelected(null)}>Đóng chi tiết</button>{detail.data && <>
        <h3>{detail.data.subject}</h3><p>Từ: {detail.data.sendFrom} · Đến: {detail.data.sendTo}</p><p>Submission: {detail.data.submissionId}</p>
        <p>Rule: {detail.data.ruleId}, revision {detail.data.ruleRevision} · Số lần thử: {detail.data.totalAttempts}</p><pre>{detail.data.content}</pre>
        <p>Trạng thái: {detail.data.status} · Lỗi: {detail.data.lastError || "—"}</p>
      </>}</article>}
    </>}
  </section>;
}
function RuleEditor({ rule, options, busy, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({ ...rule, recipients: { ...emptyRule().recipients, ...rule.recipients } }));
  const field = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));
  const recipient = (name, value) => setForm((previous) => ({ ...previous, recipients: { ...previous.recipients, [name]: value } }));
  const choices = [
    ["userIds", "Người dùng thuộc Tenant", (options.users || []).map((u) => [u.id, u.email || `${u.id} (thiếu Email)`])],
    ["roles", "Role", (options.roles || []).map((r) => [r, r])],
    ["permissions", "Permission", (options.permissions || []).map((p) => [p, p])],
    ["emails", "Email ngoài hệ thống đã phê duyệt", (options.approvedEmails || []).map((e) => [e, e])],
  ];
  return <form className="notification-editor" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
    <h3>{rule.id ? "Chi tiết / cập nhật rule" : "Rule mới"}</h3>
    <label>Tên<input required maxLength={150} value={form.name} onChange={(e) => field("name", e.target.value)} /></label>
    <label>Sự kiện<select value={form.eventType} onChange={(e) => {
      const eventType = e.target.value;
      setForm((previous) => ({ ...previous, eventType, recipients: { ...previous.recipients,
        invoiceCustomer: eventType === "INVOICE_PAID" && previous.recipients.invoiceCustomer,
        complaintCustomer: eventType === "COMPLAINT_RESOLVED" && !!previous.recipients.complaintCustomer } }));
    }}>{options.events.map((event) => <option key={event}>{event}</option>)}</select></label>
    <label className="notification-check"><input type="checkbox" checked={form.enabled} onChange={(e) => field("enabled", e.target.checked)} />Enabled</label>
    <p>Kênh: EMAIL. Các nguồn người nhận được hợp nhất và loại trùng địa chỉ.</p>
    {choices.map(([key, label, items]) => {
      const values = new Map(items); (form.recipients[key] || []).forEach((v) => { if (!values.has(v)) values.set(v, `${v} (cần kiểm tra lại)`); });
      return <label key={key}>{label}<select multiple value={form.recipients[key] || []} onChange={(e) => recipient(key, Array.from(e.target.selectedOptions, (o) => o.value))}>{Array.from(values, ([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>;
    })}
    <label className="notification-check"><input type="checkbox" checked={form.recipients.invoiceCustomer} onChange={(e) => recipient("invoiceCustomer", e.target.checked)} />Customer từ invoiceHolder đã xác minh (không lấy người Submit/POS)</label>
    {form.eventType.startsWith("COMPLAINT_") && <><label className="notification-check"><input type="checkbox" disabled={form.eventType !== "COMPLAINT_RESOLVED"} checked={!!form.recipients.complaintCustomer} onChange={(e) => recipient("complaintCustomer", e.target.checked)} />Customer đã gửi Complaint (chỉ COMPLAINT_RESOLVED)</label><p>COMPLAINT_CREATED: chọn Admin hợp lệ của tuyến. COMPLAINT_RESOLVED: chỉ chọn Customer đã gửi Complaint; bỏ các nguồn nhận khác. Placeholder phải phù hợp với sự kiện đang chọn.</p></>}
    <label>Tiêu đề<input required maxLength={200} value={form.subject} onChange={(e) => field("subject", e.target.value)} /></label>
    <label>Nội dung văn bản<textarea required maxLength={10000} rows={6} value={form.content} onChange={(e) => field("content", e.target.value)} /></label>
    <p>Placeholder hỗ trợ: {(options.placeholders || []).map((p) => `{${p}}`).join(", ")}</p>
    <div><button type="submit" disabled={busy}>Lưu</button><button type="button" disabled={busy} onClick={onCancel}>Hủy</button></div>
  </form>;
}
