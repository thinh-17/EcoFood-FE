import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CoreButton } from "@thinh-17/fe-core";
import {
  approvePlan,
  submitPlan,
  removePlan,
  versionPlan,
  submitProposition,
  approveProposition,
} from "../api/proposition.api.js";
import {
  errorMessage,
  money,
  showDate,
  statusLabel,
} from "../lib/proposition.js";
import { MetricsTable } from "./PropositionFields.jsx";
import { PlanSaleOrchestrator } from "../../orchestrator/pages/PlanSaleOrchestrator.jsx";

const MESSAGES = {
  submitProposition:
    "Submit this Proposition for review? Its definition becomes read-only.",
  approveProposition:
    "Approve this Proposition? Approved Plans can operate within their effective dates.",
  submitPlan:
    "Submit this Plan for review? Its configuration becomes read-only.",
  approvePlan:
    "Approve this Plan? It can operate only when the Proposition is also approved.",
  removePlan: "Remove this Draft Plan?",
  versionPlan:
    "Create a new Draft version? The existing approved version stays available until its approved replacement takes effect.",
};
export function PropositionDetail({
  proposition: p,
  options,
  onBack,
  onEdit,
  onPlan,
  onSaved,
  onReload,
}) {
  const [confirmation, setConfirmation] = useState(null);
  const mutation = useMutation({
    mutationFn: ({ action, plan }) => {
      if (action === "submitProposition")
        return submitProposition(p.id, p.revision);
      if (action === "approveProposition")
        return approveProposition(p.id, p.revision);
      return { submitPlan, approvePlan, removePlan, versionPlan }[action](
        p.id,
        plan.id,
        p.revision,
      );
    },
    onSuccess: (result) => {
      setConfirmation(null);
      onSaved(result);
    },
  });
  const confirm = (action, plan) => {
    mutation.reset();
    setConfirmation({ action, plan });
  };
  const d = p.definition,
    source = p.sourceProcess?.definition?.processElementAttribute?.[0];
  const tenantName = (id) =>
    [
      ...(options?.brands ?? []),
      ...(options?.distributionPartners ?? []),
      ...p.eligibleTenants,
    ].find((t) => t.id === id)?.name ?? id;
  return (
    <>
      <div className="prop-actions">
        <CoreButton variant="secondary" onClick={onBack}>
          Back to Propositions
        </CoreButton>
        {p.canEdit && (
          <CoreButton onClick={onEdit}>Edit Proposition</CoreButton>
        )}
        {p.canSubmit && (
          <CoreButton
            disabled={mutation.isPending}
            onClick={() => confirm("submitProposition")}
          >
            Submit Proposition for Review
          </CoreButton>
        )}
        {p.canApprove && (
          <CoreButton
            disabled={mutation.isPending}
            onClick={() => confirm("approveProposition")}
          >
            Approve Proposition
          </CoreButton>
        )}
      </div>
      <section className="prop-panel">
        <div className="prop-section-heading">
          <div>
            <h2>{d.name}</h2>
            <p className="prop-muted">
              {p.enterpriseName} · Revision {p.revision}
            </p>
          </div>
          <span className="prop-status">{statusLabel(p.status)}</span>
        </div>
        <p>{d.description || "No description."}</p>
        <dl className="prop-facts">
          <div>
            <dt>Approved source product</dt>
            <dd>
              {source?.productName ?? p.productId} · v{p.productVersion}
            </dd>
          </div>
          <div>
            <dt>ProductProcess</dt>
            <dd>{p.productProcessId}</dd>
          </div>
          {d.brandId && (
            <div>
              <dt>Brand</dt>
              <dd>{tenantName(d.brandId)}</dd>
            </div>
          )}
          <div>
            <dt>Distribution partners</dt>
            <dd>{d.distributionPartnerIds.map(tenantName).join(", ")}</dd>
          </div>
          <div>
            <dt>Countries of Sale</dt>
            <dd>{d.regionIds.join(", ")}</dd>
          </div>
          <div>
            <dt>Target year</dt>
            <dd>{d.targetYear ?? "—"}</dd>
          </div>
          <div>
            <dt>Current revenue</dt>
            <dd>{money(d.currentRevenue, d.currency)}</dd>
          </div>
          <div>
            <dt>Effective period</dt>
            <dd>
              {showDate(d.startDate)} – {showDate(d.endDate)}
            </dd>
          </div>
          <div>
            <dt>Permitted customization</dt>
            <dd>{d.allowedOverrides.join(", ") || "None"}</dd>
          </div>
        </dl>
        {p.approvedAt && (
          <p className="prop-muted">
            Proposition approved {showDate(p.approvedAt)} · {p.approvedBy}
          </p>
        )}
        <details>
          <summary>Approved source definition</summary>
          <dl className="prop-facts">
            <div>
              <dt>Code</dt>
              <dd>{source?.code ?? "—"}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{source?.category ?? "—"}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{source?.description ?? "—"}</dd>
            </div>
          </dl>
          <p className="prop-muted">
            This source version is fixed. Plan customization preserves the
            approved ProductProcess.
          </p>
        </details>
      </section>
      <section className="prop-panel">
        <h2>Expected quarterly revenue</h2>
        <p>
          Expected revenue:{" "}
          <strong>{money(d.expectRevenue, d.currency)}</strong>
        </p>
        <MetricsTable value={d.expectMetrics} currency={d.currency} />
        <dl className="prop-facts">
          {["enterprise", "platform", "distribution"].map((kind) => (
            <div key={kind}>
              <dt>{kind === "distribution" ? "Partner" : kind} profit share</dt>
              <dd>
                {d[kind + "ProfitShare"] == null
                  ? "—"
                  : d[kind + "ProfitShare"] + "%"}
              </dd>
            </div>
          ))}
        </dl>
        <h3>Actual indicators</h3>
        <MetricsTable value={p.actualMetrics} currency={d.currency} />
        {d.partnerMetrics.map((item) => (
          <details key={item.tenantId}>
            <summary>
              {tenantName(item.tenantId)} · Expected revenue{" "}
              {money(item.expectRevenue, d.currency)}
            </summary>
            <MetricsTable value={item.expectMetrics} currency={d.currency} />
          </details>
        ))}
      </section>
      <section className="prop-panel">
        <div className="prop-section-heading">
          <div>
            <h2>Plans & market configuration</h2>
            <p className="prop-muted">
              Propositions and Plans are reviewed separately: Draft → Pending
              Review → Approved. Both must be approved for a Plan to operate.
            </p>
          </div>
          {p.canManagePlans && (
            <CoreButton onClick={() => onPlan(null)}>Add Plan</CoreButton>
          )}
        </div>
        {!p.plans.length && (
          <p className="prop-empty">No Plans in your data scope.</p>
        )}
        {p.plans.map((plan) => (
          <article className="prop-plan" key={plan.id}>
            <div className="prop-section-heading">
              <h3>
                {plan.name} {plan.code && <small>({plan.code})</small>}
              </h3>
              <span
                className={
                  "prop-status " +
                  (plan.status === "APPROVED" ? "prop-approved" : "")
                }
              >
                {statusLabel(plan.status)}
              </span>
            </div>
            <p>{plan.description}</p>
            <dl className="prop-facts">
              <div>
                <dt>Country of Sale</dt>
                <dd>{plan.regionIds.join(", ")}</dd>
              </div>
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
            </dl>
            {plan.status === "APPROVED" && !plan.active && (
              <p className="prop-notice">
                {p.status !== "APPROVED"
                  ? "Plan approved — waiting for Proposition approval before it can operate."
                  : "This Plan is outside its effective period or has been replaced by a newer approved version."}
              </p>
            )}
            <p className="prop-muted">
              Version {plan.version}
              {plan.previousVersionId && " · Revision of an earlier Plan"}
            </p>
            {plan.productOverrides && (
              <dl className="prop-facts">
                {Object.entries(plan.productOverrides)
                  .filter(([, value]) => value != null)
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>Product {key}</dt>
                      <dd>
                        {key === "recipe" ? (
                          <>
                            <strong>{value.name || "Plan recipe"}</strong>
                            <ol>
                              {(value.steps ?? []).map((s) => (
                                <li key={s.order}>
                                  {s.name} · {s.durationMinutes} min
                                  {s.description && " — " + s.description}
                                </li>
                              ))}
                            </ol>
                          </>
                        ) : (
                          value || "(empty)"
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
            {plan.marketConfiguration ? (
              <div className="prop-preview">
                {[
                  ["Sale price", "salePrice"],
                  ["Tax amount", "taxAmount"],
                  ["Additional fees", "surcharge"],
                  ["Total price", "totalPrice"],
                ].map(([label, key]) => (
                  <div key={key}>
                    {label}
                    <strong>
                      {money(
                        plan.marketConfiguration[key],
                        plan.marketConfiguration.currency,
                      )}
                    </strong>
                  </div>
                ))}
                <div>
                  Tax rate<strong>{plan.marketConfiguration.taxRate}%</strong>
                </div>
              </div>
            ) : (
              <p className="prop-muted">
                Market pricing has not been configured.
              </p>
            )}
            {plan.approvedAt && (
              <p className="prop-muted">
                Plan approved {showDate(plan.approvedAt)} · {plan.approvedBy}
              </p>
            )}
            <div className="prop-actions">
              {plan.canEdit && (
                <>
                  <CoreButton
                    variant="secondary"
                    disabled={mutation.isPending}
                    onClick={() => onPlan(plan)}
                  >
                    Edit Draft
                  </CoreButton>
                  <CoreButton
                    variant="secondary"
                    disabled={mutation.isPending}
                    onClick={() => confirm("removePlan", plan)}
                  >
                    Remove Draft
                  </CoreButton>
                </>
              )}
              {plan.canSubmit && (
                <CoreButton
                  disabled={mutation.isPending}
                  onClick={() => confirm("submitPlan", plan)}
                >
                  Submit Plan for Review
                </CoreButton>
              )}
              {plan.canApprove && (
                <CoreButton
                  disabled={mutation.isPending}
                  onClick={() => confirm("approvePlan", plan)}
                >
                  Approve Plan
                </CoreButton>
              )}
              {plan.canCreateVersion && (
                <CoreButton
                  variant="secondary"
                  disabled={mutation.isPending}
                  onClick={() => confirm("versionPlan", plan)}
                >
                  Create New Version
                </CoreButton>
              )}
            </div>
            <PlanSaleOrchestrator proposition={p} plan={plan} />
          </article>
        ))}
        {confirmation && (
          <div
            className="prop-confirm"
            role="group"
            aria-label="Confirm review action"
          >
            <p>
              {MESSAGES[confirmation.action]}{" "}
              <strong>{confirmation.plan?.name ?? d.name}</strong>
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
                onClick={() => mutation.mutate(confirmation)}
              >
                Confirm
              </CoreButton>
            </div>
          </div>
        )}
        {mutation.isError && (
          <p role="alert" className="prop-error">
            {errorMessage(mutation.error)}
            {mutation.error?.response?.status === 409 && (
              <button
                onClick={() => {
                  onReload();
                  setConfirmation(null);
                  mutation.reset();
                }}
              >
                Reload latest revision
              </button>
            )}
          </p>
        )}
      </section>
    </>
  );
}
