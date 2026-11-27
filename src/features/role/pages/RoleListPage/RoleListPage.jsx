import { FeedbackMessage } from "../../../../components/FeedbackMessage.jsx";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { CoreCard, CoreModal, CoreTable, useDisclosure } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";

import { ROUTES } from "../../../../constants/routes.js";
import { useRoleDirectory } from "../../hooks/useRoleDirectory.js";
import { RoleCreateForm } from "../../components/RoleCreateForm.jsx";
import "./RoleListPage.css";

const COLUMNS = [{ accessorKey: "name", header: "Name" }];

export function RoleListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useRoleDirectory();
  const columns = useMemo(() => COLUMNS, []);

  const createModal = useDisclosure(false);

  function handleRowClick(role) {
    navigate(`${ROUTES.ROLES}/${role.id}`);
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
        <FeedbackMessage>
          {error?.response?.data?.message || "Failed to load roles."}
        </FeedbackMessage>
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
    </div>
  );
}
