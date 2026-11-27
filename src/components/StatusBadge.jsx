import { CoreStatusBadge } from "@thinh-17/fe-core";

const tones = {
  SENT: "success", SUCCESS: "success", APPROVED: "success", RESOLVED: "success", PAID: "success",
  FAILED: "error", FAILURE: "error", REJECTED: "error",
  PENDING: "warning", RETRY_PENDING: "warning", PENDING_REVIEW: "warning", WAITING_REPORTER: "warning",
  PROCESSING: "info", IN_PROGRESS: "info", SUBMITTED: "info",
};
const labels = { SUBMITTED: "Submitted", IN_PROGRESS: "In progress", WAITING_REPORTER: "Awaiting customer", RESOLVED: "Resolved", CLOSED: "Closed" };
export function StatusBadge({ status, label }) {
  return <CoreStatusBadge className="eco-status" tone={tones[status] || "neutral"} title={status} label={label || labels[status] || status || "—"} />;
}
