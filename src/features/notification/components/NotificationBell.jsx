import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FiBell, FiCheckCircle, FiAlertCircle, FiClock, FiRefreshCw, FiX } from "react-icons/fi";
import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { notificationAccess, notificationError } from "../lib/notification.js";
import { StatusBadge } from "../../../components/StatusBadge.jsx";
import { useNotificationHistory } from "../hooks/useNotificationHistory.js";
import { NotificationDetailDialog } from "./NotificationDetailDialog.jsx";
import { recentNotifications } from "../lib/recentNotifications.js";
import "./NotificationPopup.css";

export function NotificationBell() {
  const token = useAuthStore((state) => state.internalAccessToken);
  let claims = {};
  try { claims = decodeJwt(token) || {}; } catch { /* Existing auth guard handles the session. */ }
  return notificationAccess(claims).read ? <AuthorizedBell /> : null;
}

function AuthorizedBell() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();
  const client = useQueryClient();
  const container = useRef(null), bell = useRef(null), popup = useRef(null);
  const { root, capabilities, history } = useNotificationHistory({ enabled: open, secondary: true });
  const rights = capabilities.data || {};
  function close(restore = true) { setOpen(false); if (restore) bell.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    popup.current?.querySelector("button")?.focus();
    function pointer(event) { if (!event.target.closest?.("[data-core-feedback]") && !container.current?.contains(event.target)) setOpen(false); }
    function keyboard(event) {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); bell.current?.focus(); }
      if (event.key !== "Tab") return;
      const items = [...popup.current.querySelectorAll('button:not(:disabled), a[href]')];
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    }
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", keyboard, true);
    return () => { document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", keyboard, true); };
  }, [open]);
  const error = capabilities.error || history.error;
  const recent = recentNotifications(history.data?.content);
  return <div className="eco-notification-anchor" ref={container}>
    <button ref={bell} type="button" className="eco-notification-bell" title="Notifications" aria-label="Notifications"
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? "notification-popup" : undefined} onClick={() => setOpen((value) => !value)}><FiBell size={19} /></button>
    {open && <section ref={popup} id="notification-popup" className="eco-notification-popup" role="dialog" aria-label="Recent notifications">
      <header className="eco-notification-popup__header"><div><h2>Notifications</h2><p>Recent notifications</p></div>
        <button type="button" aria-label="Refresh notifications" title="Refresh" disabled={capabilities.isFetching || history.isFetching}
          onClick={() => client.invalidateQueries({ queryKey: root })}><FiRefreshCw size={16} /></button>
        <button type="button" aria-label="Close notifications" title="Close" onClick={() => close()}><FiX size={18} /></button>
      </header>
      <div className="eco-notification-popup__list">
        {(capabilities.isPending || (rights.read && history.isPending)) && <CoreLoadingState title="Loading notifications" />}
        {error && <FeedbackMessage error={error}><FiAlertCircle /><p>{notificationError(error)}</p><button type="button" onClick={() => client.invalidateQueries({ queryKey: root })}>Try again</button></FeedbackMessage>}
        {!error && capabilities.isSuccess && !rights.read && <FeedbackMessage>You do not have notification access in this tenant.</FeedbackMessage>}
        {!error && rights.read && history.isSuccess && !recent.length && <div className="eco-notification-state"><FiBell size={24} /><p>No notifications yet.</p></div>}
        {!error && rights.read && recent.map((row) => {
          const Icon = row.status === "SENT" ? FiCheckCircle : row.status === "FAILED" ? FiAlertCircle : FiClock;
          const timestamp = row.sentAt || row.createdAt;
          return <button type="button" key={row.id} className="eco-notification-item" onClick={() => { setSelected(row.id); close(); }}>
            <Icon size={18} aria-hidden="true" className={`eco-notification-item__icon eco-notification-item__icon--${row.status?.toLowerCase()}`} />
            <span className="eco-notification-item__body"><strong>{row.subject || row.type}</strong><small>{row.type}</small>
              {row.content && <span className="eco-notification-item__preview">{row.content}</span>}
              {row.sendTo && <small>{row.sendTo}</small>}
              <span className="eco-notification-item__meta"><StatusBadge status={row.status} />{timestamp && <time dateTime={timestamp}>{new Date(timestamp).toLocaleString()}</time>}</span>
            </span>
          </button>;
        })}
      </div>
      <footer><button type="button" onClick={() => { close(false); navigate("/notifications"); }}>View all notifications</button></footer>
    </section>}
    {selected && rights.read && <NotificationDetailDialog id={selected} root={root} onClose={() => { setSelected(null); bell.current?.focus(); }} />}
  </div>;
}
