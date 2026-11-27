import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CoreModal } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { StatusBadge } from "../../../components/StatusBadge.jsx";
import { notificationsApi as api } from "../api/notification.api.js";
import { notificationComplaintPath, notificationError } from "../lib/notification.js";
import "./NotificationPopup.css";

export function NotificationDetailDialog({ id, root, onClose }) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const detail = useQuery({ queryKey: [...root, "detail", id], queryFn: () => api.detail(id),
    enabled: !!id, refetchInterval: 15000, staleTime: 10000 });
  useEffect(() => {
    if (!id) return;
    const previous = document.activeElement;
    const dialog = document.querySelector(".notification-detail-dialog");
    dialog?.querySelector("button")?.focus();
    function keydown(event) {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const items = [...dialog.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')].filter((item) => item.getClientRects().length);
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    }
    document.addEventListener("keydown", keydown, true);
    return () => { document.removeEventListener("keydown", keydown, true); if (previous?.isConnected) previous.focus(); };
  }, [id]);
  const row = detail.data;
  return <CoreModal isOpen={!!id} title="Notification details" size="lg" onClose={onClose} className="notification-detail-dialog"
    footer={<CoreButton variant="secondary" onClick={onClose}>Close</CoreButton>}>
    {detail.isPending && <CoreLoadingState title="Loading notification details" />}
    {detail.isError && <FeedbackMessage error={detail.error}><p>{notificationError(detail.error)}</p><CoreButton variant="secondary" onClick={() => detail.refetch()}>Retry</CoreButton></FeedbackMessage>}
    {row && !detail.isError && <article className="notification-detail">
      <h3>{row.subject || row.type}</h3>
      <dl className="notification-detail-grid">
        <div><dt>Sender</dt><dd>{row.sendFrom || "—"}</dd></div>
        <div><dt>Recipient</dt><dd>{row.sendTo || "—"}</dd></div>
        <div><dt>Event</dt><dd>{row.type || "—"}</dd></div>
        <div><dt>Submission ID</dt><dd>{row.submissionId || "—"}</dd></div>
        <div><dt>Delivery status</dt><dd><StatusBadge status={row.status} /></dd></div>
        <div><dt>Retry attempts</dt><dd>{row.totalAttempts ?? "—"}</dd></div>
        <div><dt>Error</dt><dd>{row.lastError || "—"}{row.deliveryUncertain && " (SMTP outcome unknown)"}</dd></div>
      </dl>
      <h4>Email content</h4><pre>{row.content || "—"}</pre>
      {notificationComplaintPath(row) && <Link to={notificationComplaintPath(row)} onClick={onClose}>View complaint</Link>}
    </article>}
  </CoreModal>;
}
