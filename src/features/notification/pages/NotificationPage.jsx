import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CoreTable } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
import { StatusBadge } from "../../../components/StatusBadge.jsx";
import { CorePagination as Pagination } from "@thinh-17/fe-core";
import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { notificationsApi as api } from "../api/notification.api.js";
import { notificationAccess, notificationEvents, notificationComplaintPath, notificationError } from "../lib/notification.js";
import { useNotificationHistory, emptyNotificationFilters } from "../hooks/useNotificationHistory.js";
import { NotificationDetailDialog } from "../components/NotificationDetailDialog.jsx";
import "./NotificationPage.css";

export function NotificationPage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  const tenantId = useAuthStore((s) => s.tenantId);
  let claims = {};
  try { claims = decodeJwt(token); } catch { /* Authentication guard handles invalid tokens. */ }
  if (!notificationAccess(claims).read) return <section className="notification-page"><CorePageHeader title="Notifications" /><FeedbackMessage tone="warning">An Admin role and NOTIFICATION_READ permission are required for this tenant.</FeedbackMessage></section>;
  return <NotificationWorkspace key={`${tenantId}:${token}`} />;
}
function NotificationWorkspace() {
  const client = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(emptyNotificationFilters), [page, setPage] = useState(0);
  const { root, capabilities: cap, history } = useNotificationHistory({ filters, page });
  const rights = cap.data || {};
  const mutation = useMutation({ mutationFn: (row) => api.retry(row.id, !!row.deliveryUncertain), onSuccess: () => client.invalidateQueries({ queryKey: root }) });
  function retry(row) {
    if (!row.deliveryUncertain || window.confirm("SMTP may have accepted this email. Retrying may send a duplicate. Send it again?")) mutation.mutate(row);
  }
  function filter(name, value) { setFilters((previous) => ({ ...previous, [name]: value })); setPage(0); }
  const error = cap.error || mutation.error || history.error;
  const columns = [
    { header: "Event", accessorKey: "type", cell: ({ row }) => notificationComplaintPath(row.original)
      ? <Link to={notificationComplaintPath(row.original)}>{row.original.subject || row.original.type}</Link> : row.original.type },
    { header: "Recipient", accessorKey: "sendTo" },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
    { header: "Sent at", accessorKey: "sentAt", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleString("en-US") : "—" },
    { header: "Error", accessorKey: "lastError", cell: ({ row }) => <span>{row.original.lastError || "—"}{row.original.deliveryUncertain && " (SMTP outcome unknown)"}</span> },
    { header: "Actions", id: "actions", cell: ({ row: { original: row } }) => <div className="notification-row-actions">
      {notificationComplaintPath(row) && <Link to={notificationComplaintPath(row)}>View complaint</Link>}
      <CoreButton size="sm" variant="secondary" onClick={() => setSelected(row.id)}>Delivery details</CoreButton>
      {rights.retry && row.type !== "INVOICE_PAID" && row.status === "FAILED" && <CoreButton size="sm" disabled={mutation.isPending} onClick={() => retry(row)}>Retry</CoreButton>}
    </div> },
  ];
  return <section className="notification-page">
    <CorePageHeader title="Notifications" description="Track automatic complaint email delivery for this tenant."
      aside={<CoreButton variant="secondary" onClick={() => client.invalidateQueries({ queryKey: root })}>Refresh</CoreButton>} />
    <p className="notification-description">Service complaints notify authorized admins of the invoice tenant. App Platform complaints notify authorized platform admins. Resolution emails are sent automatically to the verified complaint reporter. No notification rules are required.</p>
    {cap.isPending && <p role="status">Checking permissions...</p>}
    {cap.data && !rights.read && <FeedbackMessage tone="warning">You have no active notification read permission for this tenant.</FeedbackMessage>}
    {error && <FeedbackMessage error={error}>{notificationError(error)}</FeedbackMessage>}
    {rights.read && <>
      <div className="notification-filters">
        <label>Event<select value={filters.event} onChange={(e) => filter("event", e.target.value)}><option value="">All</option>{notificationEvents.map((event) => <option key={event}>{event}</option>)}</select></label>
        <label>Status<select value={filters.status} onChange={(e) => filter("status", e.target.value)}><option value="">All</option>{["PENDING", "PROCESSING", "RETRY_PENDING", "SENT", "FAILED"].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>From (local time)<input type="datetime-local" value={filters.from} onChange={(e) => filter("from", e.target.value)} /></label>
        <label>To (local time)<input type="datetime-local" value={filters.to} onChange={(e) => filter("to", e.target.value)} /></label>
      </div>
      <CoreTable columns={columns} data={history.data?.content || []} loading={history.isPending} emptyTitle="No matching notifications." />
      <Pagination page={page} hasNext={history.data?.hasNext} onPageChange={setPage} disabled={history.isFetching} label="Notification pagination" />
      {selected && <NotificationDetailDialog id={selected} root={root} onClose={() => setSelected(null)} />}
    </>}
  </section>;
}
