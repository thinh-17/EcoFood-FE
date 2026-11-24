import { useNavigate, useParams } from "react-router-dom";

import { CorePageHeader } from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";
import { useDataAccessRuleDetail } from "../../hooks/useDataAccessRuleDetail.js";
import { DataAccessRuleDetailForm } from "./DataAccessRuleDetailForm.jsx";

export function DataAccessRuleEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: rule, isLoading, isError } = useDataAccessRuleDetail(id);

  return (
    <div className="eco-module-page data-access-rule-list-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="Edit Data Access Rule" />

      {isLoading && <p>Loading…</p>}
      {isError && <p className="data-access-rule-list__error">Failed to load rule detail.</p>}

      {rule && (
        <DataAccessRuleDetailForm
          key={rule.id}
          rule={rule}
          onCancel={() => navigate(ROUTES.DATA_ACCESS_RULES)}
          onSaved={() => navigate(ROUTES.DATA_ACCESS_RULES)}
        />
      )}
    </div>
  );
}
