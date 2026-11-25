import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreButton, CoreModal, CoreToggle } from "@thinh-17/fe-core";
import { ROUTES } from "../../../constants/routes.js";
import { getPendingPlanApprovals, getProduct, getProductVersions, productAction, productVersionAction } from "../api/product.api.js";
import { canEditProduct, PRODUCT_STATUSES, productDate, productError } from "../lib/product.js";
import { ProductForm } from "./ProductForm.jsx";
import { ProductStatus } from "./ProductStatus.jsx";
import { productFromProcess } from "../lib/product.js";

export function ProductDetail({ id, scope, canManage = true, onClose, onNotice }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(null);
  // Populated only once "Approve" finds Plans bound to this version that
  // are still Pending Review — null means the popup is closed.
  const [approvalModal, setApprovalModal] = useState(null);
  const [checkingApprovals, setCheckingApprovals] = useState(false);
  const [approvalsError, setApprovalsError] = useState(null);
  // Close/Reject/Approve only make sense once you've reached the Submit step
  // of the (now always-shown) wizard below — mirrored here since ProductForm
  // owns the step state internally.
  const [formStep, setFormStep] = useState(0);
  const query = useQuery({ queryKey: ["products", scope, "detail", id], queryFn: ({ signal }) => getProduct(id, signal) });
  const history = useQuery({ queryKey: ["products", scope, "versions", id], queryFn: ({ signal }) => getProductVersions(id, signal) });
  const mutation = useMutation({
    mutationFn: ({ action, payload, version }) =>
      (action === "approve" || action === "reject")
        ? productVersionAction(id, version, action, payload)
        : productAction(id, action, payload),
    onSuccess: (product, variables) => {
      client.setQueryData(["products", scope, "detail", id], product);
      client.invalidateQueries({ queryKey: ["products", scope] });
      if (variables.action === "versions") client.invalidateQueries({ queryKey: ["propositions"] });
      setRejecting(false); setReason(""); setSelectedVersion(null); setApprovalModal(null);
      onNotice(variables.action === "versions" ? "New draft version created." : "Product updated successfully.");
    },
  });
  if (query.isPending) return <p className="product-state" role="status">Loading product...</p>;
  if (query.isError) return <div className="product-error" role="alert">{productError(query.error)} <button onClick={() => query.refetch()}>Retry</button></div>;
  const latestProduct = query.data;
  const processes = latestProduct.productProcess ?? [];
  const selectedProcess = processes.find((process) => process.version === selectedVersion);
  const historical = selectedProcess && selectedProcess.version !== latestProduct.version;
  const product = selectedProcess ? productFromProcess(latestProduct, selectedProcess) : latestProduct;
  const act = (action, payload) => mutation.mutate({ action, payload, version: product.version });
  // Approving a Product never silently touches a Plan: before the actual
  // approve call, check whether any Plan bound to this version is Pending
  // Review; if so, show a toggle list and send Confirm as ONE combined
  // action (approve + the chosen approvePlanIds). Cancel aborts the whole
  // thing — the Product itself is not approved either.
  const startApprove = async () => {
    setApprovalsError(null);
    setCheckingApprovals(true);
    try {
      const candidates = await getPendingPlanApprovals(id, product.version);
      if (candidates.length === 0) act("approve");
      else setApprovalModal({ candidates, selected: new Set() });
    } catch (error) {
      setApprovalsError(productError(error));
    } finally {
      setCheckingApprovals(false);
    }
  };
  const toggleCandidate = (planId) =>
    setApprovalModal((modal) => {
      if (!modal) return modal;
      const selected = new Set(modal.selected);
      if (selected.has(planId)) selected.delete(planId);
      else selected.add(planId);
      return { ...modal, selected };
    });
  const confirmApprove = () => act("approve", { approvePlanIds: Array.from(approvalModal.selected) });
  // A Proposition can only ever source an APPROVED ProductProcess (server
  // enforces this at creation) — so "Create Proposition" always targets
  // whichever version currently holds APPROVED, never the version you
  // happen to be viewing (which may be the newer PENDING_REVIEW draft).
  const approvedProcess = processes.find((process) => process.status === "APPROVED");
  const createProposition = () =>
    navigate(ROUTES.PROPOSITIONS, {
      state: {
        createFromSource: {
          productId: latestProduct.id,
          name: approvedProcess.definition?.processElementAttribute?.[0]?.productName ?? latestProduct.name,
        },
      },
    });
  // Close/Reject/Approve/Create Proposition render in ProductForm's own
  // footer, right after Back, and only at the Submit step (formStep === 4,
  // the last step now that Pricing was removed from the wizard).
  // Approve/Reject are version-targeted — any PENDING_REVIEW version can be
  // approved/rejected, not just the latest (approving an older version
  // demotes whichever other version currently holds APPROVED, server-side)
  // — so this is no longer gated by `!historical`.
  const extraFooterActions = formStep === 4 && <>
    <button type="button" disabled={mutation.isPending} onClick={onClose}>Close</button>
    {canManage && product.status === "PENDING_REVIEW" && <><button type="button" disabled={mutation.isPending || rejecting} onClick={() => setRejecting(true)}>Reject</button><button type="button" className="product-primary" disabled={mutation.isPending || rejecting || checkingApprovals} onClick={startApprove}>{checkingApprovals ? "Checking..." : "Approve"}</button></>}
    {canManage && (latestProduct.status === "PENDING_REVIEW" || latestProduct.status === "APPROVED") && approvedProcess && <button type="button" disabled={mutation.isPending} onClick={createProposition}>Create Proposition</button>}
  </>;
  return <div className="product-detail">
    <div className="product-section-heading"><h3>{product.name}</h3><ProductStatus status={product.status} /></div>
    <div className="product-version-bar">
      <div className="product-version-bar__top">
        <div className="product-version-chips">
          {history.isPending && <p role="status">Loading versions...</p>}
          {history.isError && <p className="product-error" role="alert">{productError(history.error)} <button onClick={() => history.refetch()}>Retry</button></p>}
          {history.data && history.data.map((version) => {
            const selectable = processes.some((process) => process.version === version.version);
            const isCurrent = version.version === product.version;
            return <button
              key={version.version}
              type="button"
              className={`product-status product-status--${version.status?.toLowerCase()} ${isCurrent ? "is-current" : ""}`}
              disabled={!selectable}
              aria-label={`View version ${version.version}`}
              onClick={() => setSelectedVersion(version.version)}
            ><span aria-hidden="true" />v{version.version} · {PRODUCT_STATUSES[version.status] ?? version.status}</button>;
          })}
        </div>
        <div className="product-version-bar__actions">
          {canManage && !historical && product.status === "DRAFT" && <button className="product-primary" disabled={mutation.isPending} onClick={() => act("submit")}>Submit for review</button>}
          {canManage && !historical && product.status === "APPROVED" && <><button className="product-primary" disabled={mutation.isPending} onClick={() => act("versions")}>Create new version</button><small>Creating a new version moves the previous version and its Propositions to Pending Review.</small></>}
          {mutation.isPending && <span role="status">Updating...</span>}
        </div>
      </div>
      <dl className="product-facts">
        <div><dt>Product ID</dt><dd>{product.id}</dd></div><div><dt>Enterprise</dt><dd>{product.enterpriseName || product.enterpriseId}</dd></div>
        <div><dt>Approved at</dt><dd>{productDate(product.approvedAt)}</dd></div>
        {product.approvedBy && <div><dt>Approved by</dt><dd>{product.approvedBy}</dd></div>}
        <div><dt>Created at</dt><dd>{productDate(product.createdAt)}</dd></div><div><dt>Updated at</dt><dd>{productDate(product.updatedAt)}</dd></div>
      </dl>
      {product.rejectionReason && <p className="product-error">Rejection reason: {product.rejectionReason}</p>}
      {rejecting && <form onSubmit={(event) => { event.preventDefault(); if (reason.trim()) act("reject", { reason: reason.trim() }); }}>
        <label className="product-reject-label">Rejection reason *<textarea required value={reason} disabled={mutation.isPending} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="product-form-actions"><button type="button" disabled={mutation.isPending} onClick={() => setRejecting(false)}>Cancel rejection</button><button className="product-danger" type="submit" disabled={mutation.isPending || !reason.trim()}>Confirm rejection</button></div>
      </form>}
    </div>
    {mutation.isError && <p className="product-error" role="alert">{productError(mutation.error)} <button disabled={mutation.isPending} onClick={() => { query.refetch(); history.refetch(); mutation.reset(); }}>Reload product</button></p>}
    {approvalsError && <p className="product-error" role="alert">{approvalsError}</p>}
    <CoreModal
      isOpen={!!approvalModal}
      onClose={() => setApprovalModal(null)}
      title="Approve linked Plans too?"
      size="lg"
      footer={<>
        <CoreButton variant="secondary" disabled={mutation.isPending} onClick={() => setApprovalModal(null)}>Cancel</CoreButton>
        <CoreButton loading={mutation.isPending} onClick={confirmApprove}>Approve</CoreButton>
      </>}
    >
      <p>These Plans are linked to this Product version and still Pending Review. Turn on any you want to Approve along with it.</p>
      <table className="product-table">
        <thead><tr><th>Proposition</th><th>Plan</th><th>Approve</th></tr></thead>
        <tbody>
          {approvalModal?.candidates.map((candidate) => (
            <tr key={candidate.planId}>
              <td>{candidate.propositionName ?? candidate.propositionId}</td>
              <td>{candidate.planName ?? candidate.planCode}</td>
              <td><CoreToggle checked={approvalModal.selected.has(candidate.planId)} onChange={() => toggleCandidate(candidate.planId)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </CoreModal>
    <ProductForm
      // Force a remount whenever the displayed version actually changes (new
      // draft from "Create new version", or picking a different version chip)
      // — ProductForm seeds its internal form/savedProduct state from `product`
      // only on mount, so without this it keeps stale state (and a stale
      // revision) across a version change, causing a spurious 409 on save.
      key={`${product.id}-${product.version}`}
      product={product}
      scope={scope}
      readOnly={!canManage || historical || !canEditProduct(product)}
      onCancel={onClose}
      onSaved={(result) => onNotice(result.status === "PENDING_REVIEW" ? "Product submitted for review." : "Product draft saved.")}
      onStepChange={setFormStep}
      extraFooterActions={extraFooterActions}
    />
  </div>;
}
