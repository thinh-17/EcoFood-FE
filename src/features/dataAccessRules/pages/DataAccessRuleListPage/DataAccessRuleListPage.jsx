import { useNavigate } from "react-router-dom";

import { CoreButton, CoreCard, CoreEmptyState, CorePageHeader } from "@thinh-17/fe-core";
import { FiDatabase } from "react-icons/fi";

import { ROUTES } from "../../../../constants/routes.js";

/**
 * Replaces the stub ModulePage at /users/data-access-rules. The directory
 * table (listing existing rules) isn't built yet — per explicit instruction
 * this round only covers the "+ Create New" entry point and the detail page
 * it navigates to; this list stays an empty state until that's asked for.
 */
export function DataAccessRuleListPage() {
  const navigate = useNavigate();

  return (
    <div className="eco-module-page data-access-rule-list-page">
      <CorePageHeader
        eyebrow="EcoFood Platform"
        title="Data Access Rules"
        description="Define what transaction data is accessible and which users are allowed to access it."
        aside={<CoreButton onClick={() => navigate(ROUTES.DATA_ACCESS_RULE_NEW)}>+ Create New</CoreButton>}
      />

      <CoreCard>
        <CoreEmptyState
          icon={FiDatabase}
          title="No data access rules yet"
          description="Create one to start scoping which users can see which tenant data."
        />
      </CoreCard>
    </div>
  );
}
