import { useNavigate, useParams } from "react-router-dom";

import { useState } from "react";
import { useDeleteDataAccessRule } from "../../hooks/useDeleteDataAccessRule.js";

import { CoreButton, CoreCard } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";

import { ROUTES } from "../../../../constants/routes.js";
import { useDataAccessRuleDetail } from "../../hooks/useDataAccessRuleDetail.js";
import { DataAccessRuleDetailForm } from "../../components/DataAccessRuleDetailForm.jsx";

export function DataAccessRuleEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deletion = useDeleteDataAccessRule();
  const { data: rule, isLoading, isError } = useDataAccessRuleDetail(id);

  return (
    <div className="eco-module-page data-access-rule-list-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="Edit Data Access Rule"
        aside={rule?.editable && <CoreButton variant="secondary" disabled={deletion.isPending} onClick={() => { deletion.reset(); setConfirmDelete(true); }}>Delete Rule</CoreButton>} />

      {confirmDelete && rule?.editable && <CoreCard>
        <div role="group" aria-label="Confirm rule deletion">
          <p>Delete <strong>{rule.ruleName}</strong>? This rule will be removed and its access will be revoked from all assigned users.</p>
          <CoreButton variant="secondary" disabled={deletion.isPending} onClick={() => { setConfirmDelete(false); deletion.reset(); }}>Cancel</CoreButton>{" "}
          <CoreButton loading={deletion.isPending} onClick={() => deletion.mutate(id, { onSuccess: () => navigate(ROUTES.DATA_ACCESS_RULES) })}>Confirm Delete</CoreButton>
          {deletion.isError && <p role="alert">{deletion.error?.response?.data?.message || "Unable to delete this rule. Please retry."}</p>}
        </div>
      </CoreCard>}

      {isLoading && <p>Loading…</p>}
      {isError && <p className="data-access-rule-list__error">Failed to load rule detail.</p>}

      {rule && <div hidden={confirmDelete}>
        <DataAccessRuleDetailForm
          key={rule.id}
          rule={rule}
          onCancel={() => navigate(ROUTES.DATA_ACCESS_RULES)}
          onSaved={() => navigate(ROUTES.DATA_ACCESS_RULES)}
        />
      </div>}
    </div>
  );
}
