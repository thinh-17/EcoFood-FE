import { useMemo, useState } from "react";

import { CoreButton, CoreCard, CoreModal, CorePageHeader, CoreTable, useDisclosure } from "@thinh-17/fe-core";

import { usePermissionDetail } from "../../hooks/usePermissionDetail.js";
import { usePermissionDirectory } from "../../hooks/usePermissionDirectory.js";
import { PermissionCreateForm } from "./PermissionCreateForm.jsx";
import { PermissionDetailForm } from "./PermissionDetailForm.jsx";
import "./PermissionListPage.css";

const COLUMNS = [{ accessorKey: "name", header: "Name" }];

export function PermissionListPage() {
  const { data, isLoading, isError, error } = usePermissionDirectory();
  const columns = useMemo(() => COLUMNS, []);

  const [selectedPermissionId, setSelectedPermissionId] = useState(null);
  const createModal = useDisclosure(false);
  const editModal = useDisclosure(false);
  const {
    data: permissionDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = usePermissionDetail(selectedPermissionId);

  function handleRowClick(permission) {
    setSelectedPermissionId(permission.id);
    editModal.open();
  }

  return (
    <div className="eco-module-page permission-list-page">
      <CorePageHeader
        eyebrow="EcoFood Platform"
        title="Permission"
        description="Manage functional access permissions."
        aside={<CoreButton onClick={createModal.open}>+ New Permission</CoreButton>}
      />

      {isError && (
        <p className="permission-list__error" role="alert">
          {error?.response?.data?.message || "Failed to load permissions."}
        </p>
      )}

      <CoreCard>
        <CoreTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          onRowClick={handleRowClick}
          emptyTitle="No permissions found"
          emptyDescription="Permissions will appear here once created."
        />
      </CoreCard>

      <CoreModal isOpen={createModal.isOpen} onClose={createModal.close} title="New Permission" size="lg">
        <PermissionCreateForm onCancel={createModal.close} onCreated={createModal.close} />
      </CoreModal>

      <CoreModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Permission" size="lg">
        {isDetailLoading && <p>Loading…</p>}

        {isDetailError && <p className="permission-list__error">Failed to load permission detail.</p>}

        {permissionDetail && (
          <PermissionDetailForm
            key={permissionDetail.id}
            permission={permissionDetail}
            onCancel={editModal.close}
            onSaved={editModal.close}
          />
        )}
      </CoreModal>
    </div>
  );
}
