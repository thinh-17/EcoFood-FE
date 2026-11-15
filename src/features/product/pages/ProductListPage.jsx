import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CorePageHeader } from "@thinh-17/fe-core";
import { FiChevronLeft, FiChevronRight, FiFilter, FiMoreHorizontal, FiPlus, FiSearch } from "react-icons/fi";
import { useAuthStore } from "../../auth/store/authStore.js";
import { useCurrentRoles } from "../../auth/hooks/useCurrentRoles.js";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";
import { listProducts } from "../api/product.api.js";
import { canManageProducts, PRODUCT_STATUSES, PRODUCT_TYPES, productDate, productError } from "../lib/product.js";
import { ProductForm } from "./ProductForm.jsx";
import { ProductDetail } from "./ProductDetail.jsx";
import { ProductStatus } from "./ProductStatus.jsx";
import "./ProductListPage.css";

export function ProductListPage() {
  const scope = useAuthStore((state) => state.tenantId);
  const roles = useCurrentRoles();
  if (!canManageProducts(roles)) return <section className="product-page"><CorePageHeader title="Products" description="An Enterprise Admin or Product Manager role is required to manage products." /></section>;
  return <ProductDirectory key={scope} scope={scope} />;
}

function ProductDirectory({ scope }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState("");
  // Debounce the search and page together so a new term always starts at page zero.
  const params = useDebouncedValue(JSON.stringify({ page, size: 10, search: search.trim() || undefined, type: type || undefined, status: status || undefined }), 300);
  const query = useQuery({ queryKey: ["products", scope, "list", params], queryFn: ({ signal }) => listProducts(JSON.parse(params), signal) });
  const data = query.data;
  const rows = data?.content ?? [];
  const currentPage = data?.number ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const total = data?.totalElements ?? 0;
  const pendingFilters = params !== JSON.stringify({ page, size: 10, search: search.trim() || undefined, type: type || undefined, status: status || undefined });
  const busy = query.isFetching || pendingFilters;
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => Math.max(0, Math.min(currentPage - 2, totalPages - 5)) + index);
  function openProduct(id) { setSelectedId(id); setNotice(""); }
  if (creating) return <section className="product-page product-surface">
    <CorePageHeader title="Create Product" description="Define your product, calculate costs and submit for review." />
    <ProductForm scope={scope} onCancel={() => setCreating(false)} onSaved={(product) => { setCreating(false); setNotice(product.status === "PENDING_REVIEW" ? "Product submitted for review." : "Product draft saved."); }} />
  </section>;
  if (selectedId) return <section className="product-page product-surface">
    <CorePageHeader title="Product details" description="Review product definition, costing and version processes." />
    <ProductDetail key={selectedId} id={selectedId} scope={scope} onClose={() => setSelectedId(null)} onNotice={setNotice} />
  </section>;
  return <section className="product-page" aria-label="Products">
    <header className="product-header">
      <div><h1>Products</h1><p>Manage product catalog, versions and lifecycle.</p></div>
      <div className="product-toolbar">
        <label className="product-search"><span className="product-sr-only">Search products</span><input type="search" placeholder="Search name or code..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} /><FiSearch aria-hidden="true" /></label>
        <button className={type || status ? "product-filter-active" : ""} aria-expanded={filtersOpen} aria-controls="product-filters" onClick={() => setFiltersOpen(!filtersOpen)}><FiFilter />Filter{type || status ? " (active)" : ""}</button>
        <button className="product-primary" onClick={() => { setCreating(true); setNotice(""); }}><FiPlus />Create Product</button>
      </div>
    </header>
    {filtersOpen && <div className="product-filters" id="product-filters">
      <label>Product type<select value={type} onChange={(event) => { setType(event.target.value); setPage(0); }}><option value="">All types</option>{Object.entries(PRODUCT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="">All statuses</option>{Object.entries(PRODUCT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button onClick={() => { setType(""); setStatus(""); setSearch(""); setPage(0); }}>Clear filters</button>
    </div>}
    {notice && <div className="product-notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
    {query.isError && <div className="product-error" role="alert">{productError(query.error)} <button onClick={() => query.refetch()}>Retry</button></div>}
    <div className="product-table-wrap" aria-busy={busy}>
      <table className="product-table"><thead><tr><th>Product code</th><th>Product name</th><th>Product type</th><th>Category</th><th>Version</th><th>Status</th><th>Approved date</th><th>Actions</th></tr></thead>
        <tbody>{!query.isError && rows.map((product) => <tr key={product.id}>
          <td><span className="product-id" title={product.id}>{product.code || product.id}</span></td>
          <td><button className="product-name" onClick={() => openProduct(product.id)}>{product.name}</button></td>
          <td><span className={`product-type product-type--${product.type?.toLowerCase()}`}>{PRODUCT_TYPES[product.type] ?? product.type}</span></td>
          <td>{product.category || "—"}</td><td>{product.version}</td><td><ProductStatus status={product.status} /></td><td>{productDate(product.approvedAt)}</td>
          <td><button className="product-more" aria-label={`View details and actions for ${product.name}`} title="Details and actions" onClick={() => openProduct(product.id)}><FiMoreHorizontal /></button></td>
        </tr>)}</tbody>
      </table>
      {query.isPending && <div className="product-state" role="status">Loading products...</div>}
      {!query.isPending && !query.isError && !rows.length && <div className="product-state"><strong>No products found</strong><p>{search || type || status ? "Try another search or clear your filters." : "Create your first product to start building your catalog."}</p></div>}
    </div>
    <footer className="product-footer"><span>{busy ? "Loading products..." : query.isError ? "Unable to load products" : `Showing ${rows.length ? currentPage * 10 + 1 : 0} - ${currentPage * 10 + rows.length} of ${total} products`}</span>
      <nav className="product-pagination" aria-label="Product pagination"><button aria-label="Previous page" disabled={busy || query.isError || currentPage === 0} onClick={() => setPage(currentPage - 1)}><FiChevronLeft /></button>{pageNumbers.map((number) => <button key={number} aria-label={`Page ${number + 1}`} aria-current={number === currentPage ? "page" : undefined} disabled={busy || query.isError} onClick={() => setPage(number)}>{number + 1}</button>)}<button aria-label="Next page" disabled={busy || query.isError || currentPage + 1 >= totalPages} onClick={() => setPage(currentPage + 1)}><FiChevronRight /></button></nav>
    </footer>
  </section>;
}
