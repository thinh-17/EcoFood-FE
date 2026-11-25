import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CoreCard, CorePageHeader, CoreTable } from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";
import { useTenantDirectory } from "../../hooks/useTenantDirectory.js";
import "./TenantListPage.css";

const PAGE_SIZE = 20;

const COLUMNS = [
  { accessorKey: "tenantName", header: "Tenant Name", meta: { sortable: true, sortField: "tenantName" } },
  { accessorKey: "partnerTypeCode", header: "Partner Type" },
  { accessorKey: "tenantType", header: "Tenant Type" },
  { accessorKey: "domainUrl", header: "Domain" },
];

export function TenantListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ field: "updatedAt", direction: "desc" });
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data, isLoading, isError, error } = useTenantDirectory({
    page,
    size: PAGE_SIZE,
    sort: `${sort.field},${sort.direction}`,
    search,
    hasSearched,
  });

  const columns = useMemo(() => COLUMNS, []);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setHasSearched(true);
    setPage(0);
  }

  function handleSortChange(nextSort) {
    setSort(nextSort);
    setPage(0);
  }

  function handleRowClick(tenant) {
    navigate(`${ROUTES.TENANT}/${tenant.id}`);
  }

  return (
    <div className="eco-module-page tenant-list-page">
      <CorePageHeader
        eyebrow="EcoFood Platform"
        title="Tenant"
        description="Manage the list of tenants in the ecosystem."
      />

      {isError && (
        <p className="tenant-list__error" role="alert">
          {error?.response?.data?.message || "Failed to load tenants."}
        </p>
      )}

      <CoreCard>
        <input
          type="search"
          className="fe-input tenant-list__search"
          placeholder="Search tenants by name..."
          value={search}
          onChange={handleSearchChange}
        />

        <CoreTable
          columns={columns}
          data={data?.content ?? []}
          loading={isLoading}
          page={data?.page ?? page}
          pageSize={data?.size ?? PAGE_SIZE}
          totalElements={data?.totalElements ?? 0}
          sort={sort}
          onSortChange={handleSortChange}
          onPageChange={setPage}
          onRowClick={handleRowClick}
          emptyTitle="No tenants found"
          emptyDescription="Try a different search term."
        />
      </CoreCard>
    </div>
  );
}
