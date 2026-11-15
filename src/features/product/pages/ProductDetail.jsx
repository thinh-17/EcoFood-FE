import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProduct, getProductVersions, getReferenceProducts, productAction } from "../api/product.api.js";
import { canEditProduct, productDate, productError } from "../lib/product.js";
import { ProductForm } from "./ProductForm.jsx";
import { ProductStatus } from "./ProductStatus.jsx";
import { ProductSummary } from "./ProductSummary.jsx";
import { productFormState, productFromProcess } from "../lib/product.js";

export function ProductDetail({ id, scope, onClose, onNotice }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(null);
  const query = useQuery({ queryKey: ["products", scope, "detail", id], queryFn: ({ signal }) => getProduct(id, signal) });
  const history = useQuery({ queryKey: ["products", scope, "versions", id], queryFn: ({ signal }) => getProductVersions(id, signal) });
  const references = useQuery({ queryKey: ["products", scope, "references"], queryFn: ({ signal }) => getReferenceProducts(signal), enabled: Boolean(query.data && query.data.type !== "STANDALONE") });
  const mutation = useMutation({
    mutationFn: ({ action, payload }) => productAction(id, action, payload),
    onSuccess: (product, variables) => {
      client.setQueryData(["products", scope, "detail", id], product);
      client.invalidateQueries({ queryKey: ["products", scope] });
      setEditing(false); setRejecting(false); setReason(""); setSelectedVersion(null);
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
  if (editing) return <ProductForm product={product} scope={scope} onSaved={(result) => { setEditing(false); onNotice(result.status === "PENDING_REVIEW" ? "Product submitted for review." : "Product draft saved."); }} onCancel={() => { setEditing(false); mutation.reset(); }} />;
  const act = (action, payload) => mutation.mutate({ action, payload });
  return <div className="product-detail">
    {historical && <p className="product-notice">Viewing version {product.version}. This version is read only.<button onClick={() => setSelectedVersion(null)}>Back to latest</button></p>}
    <div className="product-section-heading"><h3>{product.name}</h3><ProductStatus status={product.status} /></div>
    <dl className="product-facts">
      <div><dt>Product ID</dt><dd>{product.id}</dd></div><div><dt>Enterprise ID</dt><dd>{product.enterpriseId}</dd></div>
      <div><dt>Version / Revision</dt><dd>{product.version} / {product.revision}</dd></div>
      <div><dt>Approved at</dt><dd>{productDate(product.approvedAt)}</dd></div>
      {product.approvedBy && <div><dt>Approved by</dt><dd>{product.approvedBy}</dd></div>}
      <div><dt>Created at</dt><dd>{productDate(product.createdAt)}</dd></div><div><dt>Updated at</dt><dd>{productDate(product.updatedAt)}</dd></div>
    </dl>
    {product.rejectionReason && <p className="product-error">Rejection reason: {product.rejectionReason}</p>}
    <ProductSummary form={productFormState(product)} references={references.data ?? []} />
    <h3>Version processes</h3>
    {history.isPending && <p role="status">Loading versions...</p>}
    {history.isError && <p className="product-error" role="alert">{productError(history.error)} <button onClick={() => history.refetch()}>Retry</button></p>}
    {history.data && <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Version</th><th>Name</th><th>Status</th><th>Process elements</th><th>Updated</th></tr></thead><tbody>{history.data.map((version) => <tr key={version.version}><td>{processes.some((process) => process.version === version.version) ? <button aria-label={`View version ${version.version}`} onClick={() => setSelectedVersion(version.version)}>{version.version}</button> : version.version}</td><td>{version.name}</td><td><ProductStatus status={version.status} /></td><td>{processes.some((process) => process.version === version.version) ? "Definition · Costing · Overview" : "—"}</td><td>{productDate(version.updatedAt)}</td></tr>)}</tbody></table></div>}
    {mutation.isError && <p className="product-error" role="alert">{productError(mutation.error)} <button disabled={mutation.isPending} onClick={() => { query.refetch(); history.refetch(); mutation.reset(); }}>Reload product</button></p>}
    {rejecting && <form onSubmit={(event) => { event.preventDefault(); if (reason.trim()) act("reject", { reason: reason.trim() }); }}>
      <label className="product-reject-label">Rejection reason *<textarea required value={reason} disabled={mutation.isPending} onChange={(event) => setReason(event.target.value)} /></label>
      <div className="product-form-actions"><button type="button" disabled={mutation.isPending} onClick={() => setRejecting(false)}>Cancel rejection</button><button className="product-danger" type="submit" disabled={mutation.isPending || !reason.trim()}>Confirm rejection</button></div>
    </form>}
    <div className="product-form-actions">
      <button disabled={mutation.isPending} onClick={onClose}>Close</button>
      {!historical && canEditProduct(product) && <button disabled={mutation.isPending} onClick={() => { mutation.reset(); setEditing(true); }}>Edit product</button>}
      {!historical && product.status === "DRAFT" && <button className="product-primary" disabled={mutation.isPending || !product.pricing} title={!product.pricing ? "Add pricing before submitting" : undefined} onClick={() => act("submit")}>Submit for review</button>}
      {!historical && product.status === "PENDING_REVIEW" && <><button disabled={mutation.isPending || rejecting} onClick={() => setRejecting(true)}>Reject</button><button className="product-primary" disabled={mutation.isPending || rejecting} onClick={() => act("approve")}>Approve</button></>}
      {!historical && product.status === "APPROVED" && <button className="product-primary" disabled={mutation.isPending} onClick={() => act("versions")}>Create new version</button>}
      {mutation.isPending && <span role="status">Updating...</span>}
    </div>
  </div>;
}
