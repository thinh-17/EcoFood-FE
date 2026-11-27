import { FeedbackMessage } from "../../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { useNavigate, useParams } from "react-router-dom";


import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";

import { ROUTES } from "../../../../constants/routes.js";
import { useTenantDetail } from "../../hooks/useTenantDetail.js";
import { TenantEditForm } from "../../components/TenantEditForm.jsx";

export function TenantDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: tenant, isLoading, isError } = useTenantDetail(id);

  return (
    <div className="eco-module-page tenant-list-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="Edit Tenant" />

      {isLoading && <CoreLoadingState title="Loading" />}
      {isError && <FeedbackMessage>Failed to load tenant detail.</FeedbackMessage>}

      {tenant && (
        <TenantEditForm
          key={tenant.id}
          tenant={tenant}
          onCancel={() => navigate(ROUTES.TENANT)}
          onSaved={() => navigate(ROUTES.TENANT)}
        />
      )}
    </div>
  );
}
