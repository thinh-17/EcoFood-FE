import { historyNote } from "./complaintHistory.js";

const labels = { ACCEPTED: "Complaint accepted", ASSIGNED: "Handler assigned", ADMIN_REPLIED: "New response", RESOLVED: "Complaint resolved", CLOSED: "Complaint closed", SUPPORT_REQUESTED: "Support requested" };

export function customerComplaintUpdates(complaints = []) {
  return complaints.flatMap(complaint => (complaint.events || []).flatMap(event => {
    const title = labels[event.eventType] || (event.eventType === "STATUS_CHANGED" ? event.newStatus === "WAITING_REPORTER" ? "More information requested" : "Complaint status updated" : null);
    if (!title || !event.id || !complaint.id) return [];
    const team = complaint.complaintType === "TENANT" ? "Service team" : "EcoFood platform team";
    return [{ id: `${complaint.id}/${event.id}`, complaintId: complaint.id, subject: complaint.subject, title, team,
      status: event.newStatus, createdAt: event.createdAt, note: historyNote(event.note || "").note }];
  })).sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

export const customerComplaintRoot = (token, tenantId) => ["complaints", token, true, tenantId];
