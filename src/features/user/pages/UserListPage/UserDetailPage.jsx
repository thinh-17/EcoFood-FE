import { useNavigate, useParams } from "react-router-dom";

import { CorePageHeader } from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";
import { useUserDetail } from "../../hooks/useUserDetail.js";
import { UserDetailForm } from "./UserDetailForm.jsx";

export function UserDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: user, isLoading, isError } = useUserDetail(id);

  return (
    <div className="eco-module-page user-list-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="Edit User" />

      {isLoading && <p>Loading…</p>}
      {isError && <p className="user-list__error">Failed to load user detail.</p>}

      {user && (
        <UserDetailForm
          key={user.id}
          user={user}
          onCancel={() => navigate(ROUTES.USERS)}
          onSaved={() => navigate(ROUTES.USERS)}
        />
      )}
    </div>
  );
}
