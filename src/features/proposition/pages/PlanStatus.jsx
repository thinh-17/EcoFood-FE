import { statusLabel } from "../lib/proposition.js";

// The Plan equivalent of ProductStatus.jsx — same pill-with-dot shape,
// same status set (DRAFT/PENDING_REVIEW/APPROVED/REJECTED).
export function PlanStatus({ status }) {
  return (
    <span className={`prop-status-pill prop-status-pill--${status?.toLowerCase()}`}>
      <span aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
