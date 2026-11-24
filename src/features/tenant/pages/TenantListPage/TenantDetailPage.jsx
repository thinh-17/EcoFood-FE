import { useNavigate, useParams } from "react-router-dom";

import { CorePageHeader } from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";
import { useTenantDetail } from "../../hooks/useTenantDetail.js";
import { TenantEditForm } from "./TenantEditForm.jsx";

export function TenantDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: tenant, isLoading, isError } = useTenantDetail(id);

  return (
    <div className="eco-module-page tenant-list-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="Edit Tenant" />

      {isLoading && <p>Loading…</p>}
      {isError && <p className="tenant-list__error">Failed to load tenant detail.</p>}

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
