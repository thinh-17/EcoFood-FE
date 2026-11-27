import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { CoreSelect, CoreTable } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
import { FiFilter, FiMoreHorizontal, FiPlus, FiSearch } from "react-icons/fi";
import { ROUTES } from "../../../constants/routes.js";
import { useAuthStore } from "../../auth/store/authStore.js";
import { useCurrentRoles } from "../../auth/hooks/useCurrentRoles.js";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";
import { listProducts } from "../api/product.api.js";
import { canManageProducts, canViewProducts, PRODUCT_STATUSES, PRODUCT_TYPES, productDate, productError } from "../lib/product.js";
import { ProductStatus } from "../components/ProductStatus.jsx";
import "./ProductListPage.css";

const PAGE_SIZE = 20;

export function ProductListPage() {
  const scope = useAuthStore((state) => state.tenantId);
  const roles = useCurrentRoles();
  if (!canViewProducts(roles)) return <section className="product-page"><CorePageHeader title="Products" description="An Enterprise Admin or Product Manager role is required to manage products." /></section>;
  return <ProductDirectory key={scope} scope={scope} canManage={canManageProducts(roles)} />;
}

function ProductDirectory({ scope, canManage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Create/detail pages navigate back here carrying a notice via location.state
  // (see ProductCreatePage/ProductDetailPage) — copy it into local state once
  // so dismissing it doesn't make it reappear on a later back/forward visit
  // to this exact history entry.
  const [notice, setNotice] = useState(location.state?.notice ?? "");
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: {} });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
    { accessorKey: "name", header: "Product name", cell: ({ row }) => <button className="product-name" onClick={() => navigate(`${ROUTES.PRODUCTS}/${row.original.id}`)}>{row.original.name}</button> },
    { accessorKey: "type", header: "Product type", cell: ({ getValue }) => <span className={`product-type product-type--${getValue()?.toLowerCase()}`}>{PRODUCT_TYPES[getValue()] ?? getValue()}</span> },
    { accessorKey: "category", header: "Category", cell: ({ getValue }) => getValue() || "—" },
    { accessorKey: "version", header: "Version" },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ProductStatus status={getValue()} /> },
    { accessorKey: "approvedAt", header: "Approved date", cell: ({ getValue }) => productDate(getValue()) },
    { id: "actions", header: "Actions", cell: ({ row }) => <button className="product-more" aria-label={`View details and actions for ${row.original.name}`} title="Details and actions" onClick={() => navigate(`${ROUTES.PRODUCTS}/${row.original.id}`)}><FiMoreHorizontal /></button> },
  ], [navigate]);
  return <section className="product-page" aria-label="Products">
    <CorePageHeader title="Products" description="Manage product catalog, versions and lifecycle."
      aside={canManage && <button className="product-primary" onClick={() => navigate(ROUTES.PRODUCT_NEW)}><FiPlus />Create Product</button>} />
      <div className="product-toolbar">
        <label className="product-search"><span className="product-sr-only">Search products</span><input type="search" placeholder="Search name or code..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} /><FiSearch aria-hidden="true" /></label>
        <button className={type || status ? "product-filter-active" : ""} aria-expanded={filtersOpen} aria-controls="product-filters" onClick={() => setFiltersOpen(!filtersOpen)}><FiFilter />Filter{type || status ? " (active)" : ""}</button>
      </div>
    {filtersOpen && <div className="product-filters" id="product-filters">
      <label>Product type<CoreSelect value={type} onChange={(value) => { setType(value); setPage(0); }} options={[{ value: "", label: "All types" }, ...Object.entries(PRODUCT_TYPES).map(([value, label]) => ({ value, label }))]} /></label>
      <label>Status<CoreSelect value={status} onChange={(value) => { setStatus(value); setPage(0); }} options={[{ value: "", label: "All statuses" }, ...Object.entries(PRODUCT_STATUSES).map(([value, label]) => ({ value, label }))]} /></label>
      <button onClick={() => { setType(""); setStatus(""); setSearch(""); setPage(0); }}>Clear filters</button>
    </div>}
    {notice && <div className="product-notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
    {query.isError && <FeedbackMessage error={query.error}>{productError(query.error)} <button onClick={() => query.refetch()}>Retry</button></FeedbackMessage>}
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
