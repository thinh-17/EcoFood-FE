import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CorePageHeader, CoreTable } from "@thinh-17/fe-core";
import { FiFilter, FiMoreHorizontal, FiPlus, FiSearch } from "react-icons/fi";
import { useAuthStore } from "../../auth/store/authStore.js";
import { useCurrentRoles } from "../../auth/hooks/useCurrentRoles.js";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";
import { listProducts } from "../api/product.api.js";
import { canManageProducts, PRODUCT_STATUSES, PRODUCT_TYPES, productDate, productError } from "../lib/product.js";
import { ProductForm } from "./ProductForm.jsx";
import { ProductDetail } from "./ProductDetail.jsx";
import { ProductStatus } from "./ProductStatus.jsx";
import "./ProductListPage.css";

const PAGE_SIZE = 20;

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
  const params = useDebouncedValue(JSON.stringify({ page, size: PAGE_SIZE, search: search.trim() || undefined, type: type || undefined, status: status || undefined }), 300);
  const query = useQuery({ queryKey: ["products", scope, "list", params], queryFn: ({ signal }) => listProducts(JSON.parse(params), signal) });
  const data = query.data;
  const rows = data?.content ?? [];
  const currentPage = data?.number ?? data?.page ?? page;
  const total = data?.totalElements ?? 0;
  const pendingFilters = params !== JSON.stringify({ page, size: PAGE_SIZE, search: search.trim() || undefined, type: type || undefined, status: status || undefined });
  const busy = query.isFetching || pendingFilters;
  const columns = useMemo(() => [
    { accessorKey: "code", header: "Product code", cell: ({ row }) => <span className="product-id" title={row.original.id}>{row.original.code || row.original.id}</span> },
    { accessorKey: "name", header: "Product name", cell: ({ row }) => <button className="product-name" onClick={() => { setSelectedId(row.original.id); setNotice(""); }}>{row.original.name}</button> },
    { accessorKey: "type", header: "Product type", cell: ({ getValue }) => <span className={`product-type product-type--${getValue()?.toLowerCase()}`}>{PRODUCT_TYPES[getValue()] ?? getValue()}</span> },
    { accessorKey: "category", header: "Category", cell: ({ getValue }) => getValue() || "—" },
    { accessorKey: "version", header: "Version" },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ProductStatus status={getValue()} /> },
    { accessorKey: "approvedAt", header: "Approved date", cell: ({ getValue }) => productDate(getValue()) },
    { id: "actions", header: "Actions", cell: ({ row }) => <button className="product-more" aria-label={`View details and actions for ${row.original.name}`} title="Details and actions" onClick={() => { setSelectedId(row.original.id); setNotice(""); }}><FiMoreHorizontal /></button> },
  ], []);
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
    <fieldset className="product-directory-table" disabled={busy || query.isError} aria-busy={busy}>
      <CoreTable
        columns={columns}
        data={query.isError ? [] : rows}
        loading={busy}
        page={currentPage}
        pageSize={data?.size ?? PAGE_SIZE}
        totalElements={total}
        onPageChange={(nextPage) => { if (!busy && !query.isError) setPage(nextPage); }}
        emptyTitle={query.isError ? "Unable to load products" : "No products found"}
        emptyDescription={query.isError ? "Retry to load the product list." : search || type || status ? "Try another search or clear your filters." : "Create your first product to start building your catalog."}
      />
    </fieldset>
  </section>;
}
