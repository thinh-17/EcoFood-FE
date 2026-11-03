import { useMemo, useState } from "react";

import { CoreButton, CoreCard, CoreModal, CorePageHeader, CoreTable, useDisclosure } from "@thinh-17/fe-core";

import { useRoleDetail } from "../../hooks/useRoleDetail.js";
import { useRoleDirectory } from "../../hooks/useRoleDirectory.js";
import { RoleCreateForm } from "./RoleCreateForm.jsx";
import { RoleDetailForm } from "./RoleDetailForm.jsx";
import "./RoleListPage.css";

const COLUMNS = [{ accessorKey: "name", header: "Name" }];

export function RoleListPage() {
  const { data, isLoading, isError, error } = useRoleDirectory();
  const columns = useMemo(() => COLUMNS, []);

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const createModal = useDisclosure(false);
  const editModal = useDisclosure(false);
  const { data: roleDetail, isLoading: isDetailLoading, isError: isDetailError } = useRoleDetail(selectedRoleId);

  function handleRowClick(role) {
    setSelectedRoleId(role.id);
    editModal.open();
  }

  return (
    <div className="eco-module-page role-list-page">
      <CorePageHeader
        eyebrow="EcoFood Platform"
        title="Roles"
        description="Manage roles and permission groups."
        aside={<CoreButton onClick={createModal.open}>+ New Role</CoreButton>}
      />

      {isError && (
        <p className="role-list__error" role="alert">
          {error?.response?.data?.message || "Failed to load roles."}
        </p>
      )}

      <CoreCard>
        <CoreTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          onRowClick={handleRowClick}
          emptyTitle="No roles found"
          emptyDescription="Roles will appear here once created."
        />
      </CoreCard>

      <CoreModal isOpen={createModal.isOpen} onClose={createModal.close} title="New Role" size="lg">
        <RoleCreateForm onCancel={createModal.close} onCreated={createModal.close} />
      </CoreModal>

      <CoreModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Role" size="lg">
        {isDetailLoading && <p>Loading…</p>}

        {isDetailError && <p className="role-list__error">Failed to load role detail.</p>}

        {roleDetail && (
          <RoleDetailForm key={roleDetail.id} role={roleDetail} onCancel={editModal.close} onSaved={editModal.close} />
        )}
      </CoreModal>
    </div>
  );
}
