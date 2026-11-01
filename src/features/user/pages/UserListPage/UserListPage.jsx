import { useMemo, useState } from "react";

import { CoreButton, CoreCard, CoreModal, CorePageHeader, CoreTable, useDisclosure } from "@thinh-17/fe-core";

import { useUserDetail } from "../../hooks/useUserDetail.js";
import { useUserDirectory } from "../../hooks/useUserDirectory.js";
import { UserCreateForm } from "./UserCreateForm.jsx";
import { UserDetailForm } from "./UserDetailForm.jsx";
import "./UserListPage.css";

const PAGE_SIZE = 20;

const COLUMNS = [
  { accessorKey: "firstName", header: "First Name", meta: { sortable: true, sortField: "firstName" } },
  { accessorKey: "lastName", header: "Last Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "relationship", header: "Relationship" },
];

/** Mirrors TenantListPage's directory + row-click detail pattern exactly. */
export function UserListPage() {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ field: "updatedAt", direction: "desc" });
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const { data, isLoading, isError, error } = useUserDirectory({
    page,
    size: PAGE_SIZE,
    sort: `${sort.field},${sort.direction}`,
    search,
    hasSearched,
  });

  const detailModal = useDisclosure(false);
  const createModal = useDisclosure(false);
  const { data: userDetail, isLoading: isDetailLoading, isError: isDetailError } = useUserDetail(selectedUserId);

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

  function handleRowClick(user) {
    setSelectedUserId(user.id);
    detailModal.open();
  }

  return (
    <div className="eco-module-page user-list-page">
      <CorePageHeader
        eyebrow="EcoFood Platform"
        title="Users"
        description="Manage the system's list of users."
        aside={<CoreButton onClick={createModal.open}>+ New User</CoreButton>}
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
          onRowClick={handleRowClick}
          emptyTitle="No users found"
          emptyDescription="Try a different search term."
        />
      </CoreCard>

      <CoreModal isOpen={detailModal.isOpen} onClose={detailModal.close} title="Edit User" size="lg">
        {isDetailLoading && <p>Loading…</p>}

        {isDetailError && <p className="user-list__error">Failed to load user detail.</p>}

        {userDetail && (
          <UserDetailForm key={userDetail.id} user={userDetail} onCancel={detailModal.close} onSaved={detailModal.close} />
        )}
      </CoreModal>

      <CoreModal isOpen={createModal.isOpen} onClose={createModal.close} title="New User" size="lg">
        <UserCreateForm onCancel={createModal.close} onCreated={createModal.close} />
      </CoreModal>
    </div>
  );
}
