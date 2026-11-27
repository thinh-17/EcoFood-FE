import { FeedbackMessage } from "../../../../components/FeedbackMessage.jsx";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { CoreCard, CoreModal, CoreTable, useDisclosure } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";

import { ROUTES } from "../../../../constants/routes.js";
import { usePermissionDirectory } from "../../hooks/usePermissionDirectory.js";
import { PermissionCreateForm } from "../../components/PermissionCreateForm.jsx";
import "./PermissionListPage.css";

const COLUMNS = [{ accessorKey: "name", header: "Name" }];

export function PermissionListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = usePermissionDirectory();
  const columns = useMemo(() => COLUMNS, []);

  const createModal = useDisclosure(false);

  function handleRowClick(permission) {
    navigate(`${ROUTES.PERMISSIONS}/${permission.id}`);
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
        <FeedbackMessage error={error}>
          {error?.response?.data?.message || "Failed to load permissions."}
        </FeedbackMessage>
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

    </div>
  );
}
