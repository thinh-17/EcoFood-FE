import { FiArrowRight, FiCheck, FiCheckCircle, FiClock, FiEdit3, FiMessageSquare, FiPlus, FiUserCheck } from "react-icons/fi";
import { StatusBadge } from "../../../components/StatusBadge.jsx";
import { CoreTimeline } from "@thinh-17/fe-core";
import { historyNote } from "../lib/complaintHistory.js";

const events = {
  CREATED: { label: "Complaint submitted", icon: FiPlus },
  ACCEPTED: { label: "Complaint accepted", icon: FiCheck },
  ASSIGNED: { label: "Handler assigned", icon: FiUserCheck },
  REASSIGNED: { label: "Handler reassigned", icon: FiUserCheck },
  ADMIN_REPLIED: { label: "Administrator replied", icon: FiMessageSquare },
  REPORTER_REPLIED: { label: "Customer replied", icon: FiMessageSquare },
  CUSTOMER_REPLIED: { label: "Customer replied", icon: FiMessageSquare },
  RESOLVED: { label: "Complaint resolved", icon: FiCheckCircle, tone: "success" },
  CLOSED: { label: "Complaint closed", icon: FiCheckCircle },
};
const readable = (value) => value?.toLowerCase().replaceAll("_", " ").replace(/^./, (char) => char.toUpperCase()) || "Activity recorded";

export function ComplaintHistory({ items = [] }) {
  return <section className="complaint-history" aria-label="Activity history">
    <div className="complaint-history__heading"><h3>Activity history</h3><span>{items.length} {items.length === 1 ? "event" : "events"}</span></div>
    <CoreTimeline label="Complaint activity" items={items.map((event) => {
        const definition = events[event.eventType] || { label: readable(event.eventType), icon: event.previousStatus === event.newStatus ? FiEdit3 : FiClock };
        const Icon = definition.icon;
        const note = historyNote(event.note);
        return { id: event.id, title: definition.label, tone: definition.tone,
          icon: <Icon size={16} aria-hidden="true" />,
          meta: event.createdAt && <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</time>,
          content: <>
            <div className="complaint-history__transition" aria-label="Status history">
              {event.previousStatus && event.previousStatus !== event.newStatus && <><StatusBadge status={event.previousStatus} /><FiArrowRight size={14} aria-hidden="true" /></>}
              {event.newStatus && <StatusBadge status={event.newStatus} />}
              {event.previousStatus && event.previousStatus === event.newStatus && <span className="complaint-history__unchanged">Status unchanged</span>}
            </div>
            {note.assignee && <div className="complaint-history__assignee"><span>Assigned handler</span><span title={note.previousAssignee}>{note.previousAssignee}</span><FiArrowRight size={13} aria-hidden="true" /><span title={note.assignee}>{note.assignee}</span></div>}
            {note.note && <p className="complaint-history__note">{note.note}</p>}
          </>,
        };
      })} />
  </section>;
}
