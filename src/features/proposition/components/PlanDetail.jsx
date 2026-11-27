import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CoreButton } from "@thinh-17/fe-core";
import {
  approvePlan,
  submitPlan,
  rejectPlan,
  removePlan,
  versionPlan,
} from "../api/proposition.api.js";
import { errorMessage, showDate } from "../lib/proposition.js";
import { PlanForm } from "./PlanForm.jsx";
import { PlanStatus } from "./PlanStatus.jsx";

const MESSAGES = {
  removePlan: "Remove this Draft Plan?",
  versionPlan:
    "Create a new Draft version? The existing approved version stays available until its approved replacement takes effect.",
};

// The Plan equivalent of ProductDetail.jsx — wraps the (now also readOnly-
// capable) PlanForm wizard with the facts PlanForm itself doesn't edit
// (effective period, Distribution Sub-Tenants, Operation, approval info) and
// the lifecycle actions (Submit/Approve/Reject/Remove/Version), rendered in
// the wizard's own footer via extraFooterActions — same status chain and
// action set as Product (DRAFT → PENDING_REVIEW → APPROVED, or REJECTED,
// which — like Product — can be edited back to DRAFT and resubmitted).
export function PlanDetail({ proposition: p, plan, tenantName, onCancel, onSaved, onReload }) {
  const [confirmation, setConfirmation] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [step, setStep] = useState(0);
  const mutation = useMutation({
    mutationFn: ({ action, reason: rejectReason }) =>
      action === "rejectPlan"
        ? rejectPlan(p.id, plan.id, p.revision, rejectReason)
        : { submitPlan, approvePlan, removePlan, versionPlan }[action](
            p.id,
            plan.id,
            p.revision,
          ),
    onSuccess: (result) => {
      setConfirmation(null);
      setRejecting(false);
      setReason("");
      onSaved(result);
    },
  });
  const confirm = (action) => {
    mutation.reset();
    setConfirmation(action);
  };
  // Last PlanForm step (Costing) — mirrors Product's formStep === 4 gate.
  const lastStep = step === 3;
  // Positioned like Product's version-bar "Submit for review": the final,
  // primary footer action, right after Save Plan — not bundled with the
  // other lifecycle actions below (which sit right after Back/Close, where
  // Product's own "Close" sits).
  const submitAction = lastStep && plan.canSubmit && (
    <CoreButton
      loading={mutation.isPending}
      onClick={() => {
        mutation.reset();
        mutation.mutate({ action: "submitPlan" });
      }}
    >
      Submit Plan for Review
    </CoreButton>
  );
  const extraFooterActions = lastStep && (
    <>
      {plan.canApprove && (
        <>
          <CoreButton
            variant="secondary"
            disabled={mutation.isPending || rejecting}
            onClick={() => {
              mutation.reset();
              setRejecting(true);
            }}
          >
            Reject
          </CoreButton>
          <CoreButton
            loading={mutation.isPending}
            disabled={rejecting}
            onClick={() => {
              mutation.reset();
              mutation.mutate({ action: "approvePlan" });
            }}
          >
            Approve Plan
          </CoreButton>
        </>
      )}
      {plan.canCreateVersion && (
        <CoreButton variant="secondary" disabled={mutation.isPending} onClick={() => confirm("versionPlan")}>
          Create New Version
        </CoreButton>
      )}
      {plan.canEdit && (
        <CoreButton variant="secondary" disabled={mutation.isPending} onClick={() => confirm("removePlan")}>
          Remove Draft
        </CoreButton>
      )}
    </>
  );
  return (
    <div className="prop-plan-detail">
      <div className="prop-section-heading">
        <h3>
          {plan.name} {plan.code && <small>({plan.code})</small>}
        </h3>
        <PlanStatus status={plan.status} />
      </div>
      <dl className="prop-facts">
        <div>
          <dt>Distribution Sub-Tenants</dt>
          <dd>{plan.tenantIds.map(tenantName).join(", ")}</dd>
        </div>
        <div>
          <dt>Effective period</dt>
          <dd>
            {showDate(plan.startDate)} – {showDate(plan.endDate)}
          </dd>
        </div>
        <div>
          <dt>Operation</dt>
          <dd>{plan.active ? "Active" : "Not active"}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>
            {plan.version}
            {plan.previousVersionId && " · Revision of an earlier Plan"}
          </dd>
        </div>
      </dl>
      {plan.status === "APPROVED" && !plan.active && (
        <p className="prop-notice">
          This Plan is outside its effective period or has been replaced by a
          newer approved version.
        </p>
      )}
      {plan.approvedAt && (
        <p className="prop-muted">
          Plan approved {showDate(plan.approvedAt)} · {plan.approvedBy}
        </p>
      )}
      {plan.rejectionReason && (
        <p className="prop-error">Rejection reason: {plan.rejectionReason}</p>
      )}
      {rejecting && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (reason.trim())
              mutation.mutate({ action: "rejectPlan", reason: reason.trim() });
          }}
        >
          <label>
            Rejection reason *
            <textarea
              required
              value={reason}
              disabled={mutation.isPending}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="prop-actions">
            <CoreButton
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
            >
              Cancel rejection
            </CoreButton>
            <CoreButton
              loading={mutation.isPending}
              disabled={!reason.trim()}
              onClick={() => mutation.mutate({ action: "rejectPlan", reason: reason.trim() })}
            >
              Confirm rejection
            </CoreButton>
          </div>
        </form>
      )}
      {confirmation && (
        <div className="prop-confirm" role="group" aria-label="Confirm review action">
          <p>
            {MESSAGES[confirmation]} <strong>{plan.name}</strong>
          </p>
          <div className="prop-actions">
            <CoreButton
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </CoreButton>
            <CoreButton
              loading={mutation.isPending}
              onClick={() => mutation.mutate({ action: confirmation })}
            >
              Confirm
            </CoreButton>
          </div>
        </div>
      )}
      {mutation.isError && (
        <FeedbackMessage error={mutation.error}>
          {errorMessage(mutation.error)}
          {mutation.error?.response?.status === 409 && (
            <CoreButton
              variant="secondary"
              size="sm"
              onClick={() => {
                onReload();
                setConfirmation(null);
                mutation.reset();
              }}
            >
              Reload latest revision
            </CoreButton>
          )}
        </FeedbackMessage>
      )}
      <PlanForm
        key={`${plan.id}:${plan.version}`}
        proposition={p}
        plan={plan}
        readOnly={!plan.canEdit}
        onCancel={onCancel}
        onSaved={onSaved}
        onStepChange={setStep}
        extraFooterActions={extraFooterActions}
        submitAction={submitAction}
      />
    </div>
  );
}
