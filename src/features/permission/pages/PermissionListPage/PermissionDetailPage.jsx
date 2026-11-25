import { useNavigate, useParams } from "react-router-dom";

import { CorePageHeader } from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";
import { usePermissionDetail } from "../../hooks/usePermissionDetail.js";
import { PermissionDetailForm } from "./PermissionDetailForm.jsx";

export function PermissionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: permission, isLoading, isError } = usePermissionDetail(id);

  return (
    <div className="eco-module-page permission-list-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="Edit Permission" />

      {isLoading && <p>Loading…</p>}
      {isError && <p className="permission-list__error">Failed to load permission detail.</p>}

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
