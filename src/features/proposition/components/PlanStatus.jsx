import { statusLabel } from "../lib/proposition.js";
import { StatusBadge } from "../../../components/StatusBadge.jsx";

// The Plan equivalent of ProductStatus.jsx — same pill-with-dot shape,
// same status set (DRAFT/PENDING_REVIEW/APPROVED/REJECTED).
export function PlanStatus({ status }) {
  return (
    <StatusBadge status={status} label={statusLabel(status)} />
  );
}
