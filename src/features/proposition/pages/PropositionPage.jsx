import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CoreButton,
  CoreCard,
  CorePageHeader,
  CoreTable,
} from "@thinh-17/fe-core";
import { useAuthStore } from "../../auth/store/authStore.js";
import { useCurrentRoles } from "../../auth/hooks/useCurrentRoles.js";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";
import {
  getProposition,
  listPropositions,
  propositionOptions,
} from "../api/proposition.api.js";
import {
  canUsePropositions,
  errorMessage,
  showDate,
} from "../lib/proposition.js";
import { PropositionForm } from "./PropositionForm.jsx";
import { PropositionDetail } from "./PropositionDetail.jsx";
import { PlanForm } from "./PlanForm.jsx";
import { PlanDetail } from "./PlanDetail.jsx";
import { isEnterpriseSaleOrchestratorActor } from "../../orchestrator/lib/planSale.js";
import { SaleOrchestratorEditor } from "../../orchestrator/pages/PlanSaleOrchestrator.jsx";
import "./PropositionPage.css";

const PAGE_SIZE = 20;
const COLUMNS = [
  {
    id: "name",
    accessorFn: (row) => row.definition.name,
    header: "Name",
    cell: ({ getValue }) => (
      <button type="button" className="prop-link">
        {getValue()}
      </button>
    ),
  },
  { accessorKey: "enterpriseName", header: "Enterprise" },
  {
    id: "regions",
    accessorFn: (row) => row.definition.regionIds.join(", "),
    header: "Regions",
  },
  {
    id: "currency",
    accessorFn: (row) => row.definition.currency,
    header: "Currency",
  },
  { id: "plans", accessorFn: (row) => row.plans.length, header: "Plans" },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ getValue }) => showDate(getValue()),
  },
];

export function PropositionPage() {
  const tenant = useAuthStore((state) => state.tenantId),
    roles = useCurrentRoles();
  const scope = `${tenant}:${roles.join(",")}`;
  if (!canUsePropositions(roles))
    return (
      <section className="prop-page">
        <CorePageHeader
          title="Propositions"
          description="Your role does not have access to Proposition management."
        />
      </section>
    );
  return <PropositionDirectory key={scope} scope={scope} />;
}
export function PropositionDirectory({ scope }) {
  const client = useQueryClient();
  const location = useLocation();
  const tenant = useAuthStore((state) => state.tenantId),
    roles = useCurrentRoles();
  // Reached from a Product's "Create Proposition" button (see
  // ProductDetail.jsx) carrying the APPROVED ProductProcess to source from —
  // read once on mount so Create opens straight into PropositionForm with
  // that product already chosen, skipping the search/select UI entirely.
  const [createSource] = useState(location.state?.createFromSource ?? null);
  const [view, setView] = useState(createSource ? "create" : "list"),
    [id, setId] = useState(null),
    [plan, setPlan] = useState(null),
    [saleOrchestrator, setSaleOrchestrator] = useState(null),
    [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const term = useDebouncedValue(search, 400);
  const options = useQuery({
    queryKey: ["propositions", scope, "options"],
    queryFn: ({ signal }) => propositionOptions(signal),
  });
  const list = useQuery({
    queryKey: ["propositions", scope, "list", term, page],
    queryFn: ({ signal }) =>
      listPropositions(
        { search: term.trim() || undefined, page, size: PAGE_SIZE },
        signal,
      ),
    placeholderData: keepPreviousData,
    enabled: view === "list",
  });
  const detail = useQuery({
    queryKey: ["propositions", scope, "detail", id],
    queryFn: ({ signal }) => getProposition(id, signal),
    enabled: Boolean(id) && ["detail", "edit", "plan", "sale-orchestrator"].includes(view),
    refetchInterval: view === "detail" ? 30000 : false,
  });
  const reload = () =>
    client.invalidateQueries({ queryKey: ["propositions", scope] });
  const open = (value) => {
    setId(value);
    setView("detail");
  };
  const saved = (result) => {
    client.setQueryData(["propositions", scope, "detail", result.id], result);
    reload();
    setNotice("Proposition saved.");
    open(result.id);
  };
  const saleOrchestratorSaved = () => {
    client.invalidateQueries({ queryKey: ["propositions", id, "sale-orchestrators", "directory"] });
    setNotice("Sale Orchestrator saved.");
    setView("detail");
  };
  const title = {
    list: "Propositions",
    create: "Create Proposition",
    edit: "Edit Proposition",
    detail: "Proposition details",
    plan: plan ? "Edit Plan" : "Create Plan",
    "sale-orchestrator": saleOrchestrator ? "Edit Sale Orchestrator" : "Create Sale Orchestrator",
  }[view];
  return (
    <section className="prop-page">
      <CorePageHeader
        title={title}
        description="Commercial proposals, partner Plans and market pricing for approved product versions."
      />
      {notice && (
        <div className="prop-notice" role="status">
          {notice}
          <CoreButton
            variant="ghost"
            size="sm"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </CoreButton>
        </div>
      )}
      {options.isPending && <p role="status">Loading permissions...</p>}
      {options.isError && (
        <ErrorState error={options.error} retry={options.refetch} />
      )}
      {view === "create" && options.data?.canCreate && (
        <PropositionForm
          options={{ ...options.data, scope }}
          presetSource={createSource}
          onCancel={() => setView("list")}
          onSaved={saved}
        />
      )}
      {["detail", "edit", "plan", "sale-orchestrator"].includes(view) && (
        <>
          {detail.isPending && <p role="status">Loading Proposition...</p>}
          {detail.isError && (
            <>
              <CoreButton variant="secondary" onClick={() => setView("list")}>
                Back to list
              </CoreButton>
              <ErrorState error={detail.error} retry={detail.refetch} />
            </>
          )}
          {detail.data && (
            <>
              {view === "detail" && (
                <PropositionDetail
                  proposition={detail.data}
                  options={options.data}
                  onBack={() => setView("list")}
                  onEdit={() => setView("edit")}
                  onPlan={(value) => {
                    setPlan(value);
                    setView("plan");
                  }}
                  onSaleOrchestrator={(value) => {
                    setSaleOrchestrator(value);
                    setView("sale-orchestrator");
                  }}
                />
              )}
              {view === "edit" && options.data && (
                <PropositionForm
                  key={`${id}:${detail.data.revision}`}
                  proposition={detail.data}
                  options={{ ...options.data, scope }}
                  onCancel={() => setView("detail")}
                  onSaved={saved}
                />
              )}
              {view === "plan" && plan && (
                <PlanDetail
                  key={`${id}:${plan.id}:${detail.data.revision}`}
                  proposition={detail.data}
                  plan={plan}
                  tenantName={(tenantId) =>
                    [
                      ...(options.data?.brands ?? []),
                      ...(options.data?.distributionPartners ?? []),
                      ...detail.data.eligibleTenants,
                    ].find((t) => t.id === tenantId)?.name ?? tenantId
                  }
                  onCancel={() => setView("detail")}
                  onSaved={saved}
                  onReload={reload}
                />
              )}
              {view === "plan" && !plan && (
                <PlanForm
                  key={`${id}:new:${detail.data.revision}`}
                  proposition={detail.data}
                  plan={null}
                  onCancel={() => setView("detail")}
                  onSaved={saved}
                />
              )}
              {view === "sale-orchestrator" && (
                <SaleOrchestratorEditor
                  key={`${id}:${saleOrchestrator?.id ?? "new"}`}
                  proposition={detail.data}
                  id={saleOrchestrator?.id ?? null}
                  // A Tenant declared as a distribution partner on the
                  // Proposition itself (definition.distributionPartnerIds)
                  // gets every Plan in it, not only ones that separately
                  // list it in their own tenantIds — matches the backend's
                  // PlanSaleAccess.currentForProposition().
                  plans={
                    isEnterpriseSaleOrchestratorActor(roles) ||
                    (detail.data.definition.distributionPartnerIds ?? []).includes(tenant)
                      ? detail.data.plans
                      : detail.data.plans.filter((p) => (p.tenantIds ?? []).includes(tenant))
                  }
                  onCancel={() => setView("detail")}
                  onSaved={saleOrchestratorSaved}
                />
              )}
            </>
          )}
        </>
      )}
      {view === "list" && (
        <CoreCard>
          <div className="prop-toolbar">
            <input
              type="search"
              className="fe-input prop-list-search"
              aria-label="Search Propositions"
              placeholder="Search propositions by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          {list.isError && (
            <ErrorState error={list.error} retry={list.refetch} />
          )}
          <CoreTable
            columns={COLUMNS}
            data={list.data?.content ?? []}
            loading={list.isFetching}
            page={page}
            pageSize={list.data?.size ?? PAGE_SIZE}
            totalElements={list.data?.totalElements ?? 0}
            onPageChange={setPage}
            onRowClick={(row) => open(row.id)}
            emptyTitle="No propositions found"
            emptyDescription="Try a different search term."
          />
        </CoreCard>
      )}
    </section>
  );
}
function ErrorState({ error, retry }) {
  return (
    <p className="prop-error" role="alert">
      {errorMessage(error)}{" "}
      <CoreButton variant="ghost" size="sm" onClick={() => retry()}>
        Retry
      </CoreButton>
    </p>
  );
}
