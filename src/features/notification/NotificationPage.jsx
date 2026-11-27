import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CoreButton, CorePageHeader } from "@thinh-17/fe-core";
import { useAuthStore } from "../auth/store/authStore.js";
import { decodeJwt } from "../auth/lib/jwt.js";
import { notificationsApi as api } from "./notification.api.js";
import { notificationAccess, notificationEvents, notificationComplaintPath, notificationError, historyParams } from "./notification.js";
import "./NotificationPage.css";

export function NotificationPage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  let claims = {};
  try { claims = decodeJwt(token); } catch { /* Authentication guard handles invalid tokens. */ }
  if (!notificationAccess(claims).read) return <section className="notification-page"><CorePageHeader title="Notifications" /><p role="alert">An Admin role and NOTIFICATION_READ permission are required for this tenant.</p></section>;
  return <NotificationWorkspace key={token} scope={token} />;
}
function NotificationWorkspace({ scope }) {
  const client = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ event: "", status: "", from: "", to: "" }), [page, setPage] = useState(0);
  const root = ["notifications", scope];
  const cap = useQuery({ queryKey: [...root, "capabilities"], queryFn: api.capabilities });
  const rights = cap.data || {};
  const history = useQuery({ queryKey: [...root, "history", filters, page], queryFn: () => api.history(historyParams(filters, page)), enabled: !!rights.read, refetchInterval: 15000 });
  const detail = useQuery({ queryKey: [...root, "detail", selected], queryFn: () => api.detail(selected), enabled: !!selected && !!rights.read, refetchInterval: 15000 });
  const mutation = useMutation({ mutationFn: (row) => api.retry(row.id, !!row.deliveryUncertain), onSuccess: () => client.invalidateQueries({ queryKey: root }) });
  function retry(row) {
    if (!row.deliveryUncertain || window.confirm("SMTP may have accepted this email. Retrying may send a duplicate. Send it again?")) mutation.mutate(row);
  }
  function filter(name, value) { setFilters((previous) => ({ ...previous, [name]: value })); setPage(0); }
  const error = cap.error || mutation.error || history.error || detail.error;
  return <section className="notification-page">
    <CorePageHeader title="Notifications" description="Track automatic complaint email delivery for this tenant." />
    <p>Service complaints notify authorized admins of the invoice tenant. App Platform complaints notify authorized platform admins. Resolution emails are sent automatically to the verified complaint reporter. No notification rules are required.</p>
    <CoreButton variant="secondary" onClick={() => client.invalidateQueries({ queryKey: root })}>Refresh</CoreButton>
    {cap.isPending && <p>Checking permissions...</p>}
    {cap.data && !rights.read && <p role="alert">You have no active notification read permission for this tenant.</p>}
    {error && <p role="alert" className="notification-error">{notificationError(error)}</p>}
    {rights.read && <>
      <h2>Delivery history</h2>
      <div className="notification-filters">
        <label>Event<select value={filters.event} onChange={(e) => filter("event", e.target.value)}><option value="">All</option>{notificationEvents.map((event) => <option key={event}>{event}</option>)}</select></label>
        <label>Status<select value={filters.status} onChange={(e) => filter("status", e.target.value)}><option value="">All</option>{["PENDING", "PROCESSING", "RETRY_PENDING", "SENT", "FAILED"].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>From (local time)<input type="datetime-local" value={filters.from} onChange={(e) => filter("from", e.target.value)} /></label>
        <label>To (local time)<input type="datetime-local" value={filters.to} onChange={(e) => filter("to", e.target.value)} /></label>
      </div>
      <div className="notification-table"><table><thead><tr><th>Event</th><th>Recipient</th><th>Status</th><th>Sent at</th><th>Error</th><th>Actions</th></tr></thead><tbody>
        {(history.data?.content || []).map((row) => <tr key={row.id}><td>{notificationComplaintPath(row) ? <Link to={notificationComplaintPath(row)}>{row.subject || row.type}</Link> : row.type}</td><td>{row.sendTo}</td><td>{row.status}</td><td>{row.sentAt ? new Date(row.sentAt).toLocaleString("en-US") : "-"}</td><td>{row.lastError || "-"}{row.deliveryUncertain && " (SMTP outcome unknown)"}</td><td>
          {notificationComplaintPath(row) && <Link to={notificationComplaintPath(row)}>View complaint</Link>}
          <CoreButton size="sm" variant="secondary" onClick={() => setSelected(row.id)}>Delivery details</CoreButton>{rights.retry && row.type !== "INVOICE_PAID" && row.status === "FAILED" && <CoreButton size="sm" disabled={mutation.isPending} onClick={() => retry(row)}>Retry</CoreButton>}
        </td></tr>)}
      </tbody></table>{history.isPending ? <p>Loading...</p> : !history.data?.content?.length && <p>No matching notifications.</p>}</div>
      <div className="notification-pagination"><CoreButton variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</CoreButton><span>Page {page + 1}</span><CoreButton variant="secondary" disabled={!history.data?.hasNext} onClick={() => setPage(page + 1)}>Next</CoreButton></div>
      {selected && <article className="notification-detail"><CoreButton variant="secondary" onClick={() => setSelected(null)}>Close details</CoreButton>{detail.data && <>
        <h3>{detail.data.subject}</h3><p>From: {detail.data.sendFrom} / To: {detail.data.sendTo}</p><p>Submission: {detail.data.submissionId}</p>
        {notificationComplaintPath(detail.data) && <Link to={notificationComplaintPath(detail.data)}>View complaint</Link>}
        <p>Attempts: {detail.data.totalAttempts}</p><pre>{detail.data.content}</pre>
        <p>Status: {detail.data.status} / Error: {detail.data.lastError || "-"}</p>
      </>}</article>}
    </>}
  </section>;
}
