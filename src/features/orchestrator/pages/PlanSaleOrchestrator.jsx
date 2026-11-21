import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreButton } from "@thinh-17/fe-core";
import { FiSettings } from "react-icons/fi";
import { useCurrentRoles } from "../../auth/hooks/useCurrentRoles.js";
import { useAuthStore } from "../../auth/store/authStore.js";
import { errorMessage } from "../../proposition/lib/proposition.js";
import { canConfigurePlanSale } from "../lib/planSale.js";
import { getPlanSale } from "../api/planSale.api.js";
import { PlanSaleEditor } from "./PlanSaleEditor.jsx";
import "./PlanSaleOrchestrator.css";

export function PlanSaleOrchestrator({ proposition, plan }) {
  const tenant = useAuthStore((s) => s.tenantId),
    roles = useCurrentRoles();
  const [open, setOpen] = useState(false);
  if (!canConfigurePlanSale(roles, tenant, plan)) return null;
  return (
    <div className="plan-sale">
      <CoreButton
        variant="secondary"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <FiSettings /> {open ? "Close Sale Orchestrator" : "Sale Orchestrator"}
      </CoreButton>
      {open && (
        <PlanConfiguration
          key={`${tenant}:${proposition.id}:${plan.id}`}
          proposition={proposition}
          plan={plan}
          tenant={tenant}
        />
      )}
    </div>
  );
}
function PlanConfiguration({ proposition, plan, tenant }) {
  const client = useQueryClient(),
    queryKey = ["plan-sale", tenant, proposition.id, plan.id];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getPlanSale(proposition.id, plan.id, signal),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const [notice, setNotice] = useState("");
  if (query.isPending)
    return <p role="status">Loading this Plan's Sale configuration…</p>;
  if (query.isError)
    return (
      <p role="alert" className="sale-error">
        {errorMessage(query.error)}{" "}
        <button onClick={() => query.refetch()}>Retry</button>
      </p>
    );
  return (
    <section
      className="sale-panel"
      aria-label={`Sale Orchestrator for ${plan.name}`}
    >
      <div className="sale-heading">
        <div>
          <h3>Sale Orchestrator · {plan.name}</h3>
          <p>Configure the payload and post-workflow for this Plan.</p>
        </div>
        <span className="sale-status">
          {query.data?.activeVersion
            ? `Active v${query.data.activeVersion}`
            : "Draft"}
        </span>
      </div>
      {notice && (
        <p className="sale-notice" role="status">
          {notice}
        </p>
      )}
      <PlanSaleEditor
        key={query.data ? `${query.data.id}:${query.data.revision}` : "new"}
        row={query.data}
        proposition={proposition}
        plan={plan}
        tenant={tenant}
        onSaved={(row) => {
          client.setQueryData(queryKey, row);
          setNotice("Sale configuration saved for this Plan.");
        }}
        onReload={() => query.refetch()}
      />
    </section>
  );
}
