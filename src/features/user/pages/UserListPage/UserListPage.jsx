import { useMemo, useState } from "react";

import { CoreCard, CorePageHeader, CoreTable } from "@thinh-17/fe-core";

import { useUserDirectory } from "../../hooks/useUserDirectory.js";
import "./UserListPage.css";

const PAGE_SIZE = 20;

const COLUMNS = [
  { accessorKey: "firstName", header: "First Name", meta: { sortable: true, sortField: "firstName" } },
  { accessorKey: "lastName", header: "Last Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "relationship", header: "Relationship" },
];

/**
 * Mirrors TenantListPage's directory pattern exactly (same page/size/sort/
 * search state shape, same CoreTable wiring) — GET /api/v1/users/directory
 * doesn't exist on the backend yet, so this will 404 until that endpoint is
 * built following the same pagination + regex-search strategy as
 * TenantService.listTenantDirectory.
 */
export function UserListPage() {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ field: "updatedAt", direction: "desc" });
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data, isLoading, isError, error } = useUserDirectory({
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

  return (
    <div className="eco-module-page user-list-page">
      <CorePageHeader
        eyebrow="EcoFood Platform"
        title="Users"
        description="Manage the system's list of users."
      />

      {isError && (
        <p className="user-list__error" role="alert">
          {error?.response?.data?.message || "Failed to load users."}
        </p>
      )}

      <CoreCard>
        <input
          type="search"
          className="fe-input user-list__search"
          placeholder="Search users by name..."
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
          emptyTitle="No users found"
          emptyDescription="Try a different search term."
        />
      </CoreCard>
    </div>
  );
}
