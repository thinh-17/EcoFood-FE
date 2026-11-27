import { FeedbackMessage } from "../../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useNavigate, useParams } from "react-router-dom";


import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";

import { ROUTES } from "../../../../constants/routes.js";
import { useRoleDetail } from "../../hooks/useRoleDetail.js";
import { RoleDetailForm } from "../../components/RoleDetailForm.jsx";

export function RoleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: role, isLoading, isError } = useRoleDetail(id);

  return (
    <div className="eco-module-page role-list-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="Edit Role" />

      {isLoading && <CoreLoadingState title="Loading" />}
      {isError && <FeedbackMessage>Failed to load role detail.</FeedbackMessage>}

      {role && (
        <RoleDetailForm
          key={role.id}
          role={role}
          onCancel={() => navigate(ROUTES.ROLES)}
          onSaved={() => navigate(ROUTES.ROLES)}
        />
      )}
    </div>
  );
}
