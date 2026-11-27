import { FeedbackMessage } from "../../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useNavigate, useParams } from "react-router-dom";


import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";

import { ROUTES } from "../../../../constants/routes.js";
import { useUserDetail } from "../../hooks/useUserDetail.js";
import { UserDetailForm } from "../../components/UserDetailForm.jsx";

export function UserDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: user, isLoading, isError } = useUserDetail(id);

  return (
    <div className="eco-module-page user-list-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="Edit User" />

      {isLoading && <CoreLoadingState title="Loading" />}
      {isError && <FeedbackMessage>Failed to load user detail.</FeedbackMessage>}

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
