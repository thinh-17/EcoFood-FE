import { FeedbackMessage } from "../../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useNavigate, useParams } from "react-router-dom";


import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";

import { ROUTES } from "../../../../constants/routes.js";
import { usePermissionDetail } from "../../hooks/usePermissionDetail.js";
import { PermissionDetailForm } from "../../components/PermissionDetailForm.jsx";

export function PermissionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: permission, isLoading, isError, error } = usePermissionDetail(id);

  return (
    <div className="eco-module-page permission-list-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="Edit Permission" />

      {isLoading && <CoreLoadingState title="Loading" />}
      {isError && <FeedbackMessage error={error}>Failed to load permission detail.</FeedbackMessage>}

      {permission && (
        <PermissionDetailForm
          key={permission.id}
          permission={permission}
          onCancel={() => navigate(ROUTES.PERMISSIONS)}
          onSaved={() => navigate(ROUTES.PERMISSIONS)}
        />
      )}
    </div>
  );
}
