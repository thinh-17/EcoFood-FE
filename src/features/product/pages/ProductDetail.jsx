import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "../../../constants/routes.js";
import { getProduct, getProductVersions, productAction, productVersionAction } from "../api/product.api.js";
import { canEditProduct, PRODUCT_STATUSES, productDate, productError } from "../lib/product.js";
import { ProductForm } from "./ProductForm.jsx";
import { ProductStatus } from "./ProductStatus.jsx";
import { productFromProcess } from "../lib/product.js";

export function ProductDetail({ id, scope, onClose, onNotice }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(null);
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
      setRejecting(false); setReason(""); setSelectedVersion(null);
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
          productVersion: approvedProcess.version,
          productProcessId: approvedProcess.id,
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
    {product.status === "PENDING_REVIEW" && <><button type="button" disabled={mutation.isPending || rejecting} onClick={() => setRejecting(true)}>Reject</button><button type="button" className="product-primary" disabled={mutation.isPending || rejecting} onClick={() => act("approve")}>Approve</button></>}
    {(latestProduct.status === "PENDING_REVIEW" || latestProduct.status === "APPROVED") && approvedProcess && <button type="button" disabled={mutation.isPending} onClick={createProposition}>Create Proposition</button>}
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
          {!historical && product.status === "DRAFT" && <button className="product-primary" disabled={mutation.isPending} onClick={() => act("submit")}>Submit for review</button>}
          {!historical && product.status === "APPROVED" && <><button className="product-primary" disabled={mutation.isPending} onClick={() => act("versions")}>Create new version</button><small>Creating a new version moves the previous version and its Propositions to Pending Review.</small></>}
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
    <ProductForm
      // Force a remount whenever the displayed version actually changes (new
      // draft from "Create new version", or picking a different version chip)
      // — ProductForm seeds its internal form/savedProduct state from `product`
      // only on mount, so without this it keeps stale state (and a stale
      // revision) across a version change, causing a spurious 409 on save.
      key={`${product.id}-${product.version}`}
      product={product}
      scope={scope}
      readOnly={historical || !canEditProduct(product)}
      onCancel={onClose}
      onSaved={(result) => onNotice(result.status === "PENDING_REVIEW" ? "Product submitted for review." : "Product draft saved.")}
      onStepChange={setFormStep}
      extraFooterActions={extraFooterActions}
    />
  </div>;
}
