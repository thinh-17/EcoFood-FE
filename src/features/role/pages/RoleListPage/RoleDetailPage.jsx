import { useNavigate, useParams } from "react-router-dom";

import { CorePageHeader } from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";
import { useRoleDetail } from "../../hooks/useRoleDetail.js";
import { RoleDetailForm } from "./RoleDetailForm.jsx";

export function RoleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: role, isLoading, isError } = useRoleDetail(id);

  return (
    <div className="eco-module-page role-list-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="Edit Role" />

      {isLoading && <p>Loading…</p>}
      {isError && <p className="role-list__error">Failed to load role detail.</p>}

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
