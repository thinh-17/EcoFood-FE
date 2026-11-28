import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { CoreLoadingState, CoreNotFoundState } from "@thinh-17/fe-core";
import { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CoreCard, CoreTable } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
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
import { PropositionForm } from "../components/PropositionForm.jsx";
import { PropositionDetail } from "../components/PropositionDetail.jsx";
import { PlanForm } from "../components/PlanForm.jsx";
import { PlanDetail } from "../components/PlanDetail.jsx";
import { isEnterpriseSaleOrchestratorActor } from "../../orchestrator/lib/planSale.js";
import { SaleOrchestratorEditor } from "../../orchestrator/pages/PlanSaleOrchestrator.jsx";
import { propositionPaths, tabFromSearch } from "../lib/propositionRoutes.js";
import "./PropositionPage.css";

const DETAIL_VIEWS = ["detail", "edit", "plan", "sale-orchestrator"];

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

// `view` comes from the matched route (see AppRouter) and every id from the
// URL (see propositionRoutes.js), so each Proposition, Plan and Sale
// Orchestrator screen has its own /{id} URL.
export function PropositionPage({ view = "list" }) {
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
  return <PropositionDirectory key={scope} scope={scope} view={view} />;
}
export function PropositionDirectory({ scope, view = "list" }) {
  const client = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { propositionId: id, planId, orchestratorId } = useParams();
  const tenant = useAuthStore((state) => state.tenantId),
    roles = useCurrentRoles();
  // Reached from a Product's "Create Proposition" button (see
  // ProductDetail.jsx), which navigates to the list URL carrying the
  // APPROVED ProductProcess to source from — forwarded to /new below so
  // Create opens straight into PropositionForm with that product chosen.
  const createSource = view === "create" ? (location.state?.createFromSource ?? null) : null;
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const term = useDebouncedValue(search, 400);
  // Permissions first: `options` carries this caller's Proposition rights
  // (canCreate, brands, distribution partners). Data for the current screen
  // is requested only after it has loaded successfully — never in parallel.
  const options = useQuery({
    queryKey: ["propositions", scope, "options"],
    queryFn: ({ signal }) => propositionOptions(signal),
  });
  const permissionsReady = options.isSuccess;
  const list = useQuery({
    queryKey: ["propositions", scope, "list", term, page],
    queryFn: ({ signal }) =>
      listPropositions(
        { search: term.trim() || undefined, page, size: PAGE_SIZE },
        signal,
      ),
    placeholderData: keepPreviousData,
    enabled: permissionsReady && view === "list",
  });
  const detail = useQuery({
    queryKey: ["propositions", scope, "detail", id],
    queryFn: ({ signal }) => getProposition(id, signal),
    enabled: permissionsReady && Boolean(id) && DETAIL_VIEWS.includes(view),
    refetchInterval: view === "detail" ? 30000 : false,
  });
  const reload = () =>
    client.invalidateQueries({ queryKey: ["propositions", scope] });
  const toDetail = (propositionId = id, tab) => navigate(propositionPaths.detail(propositionId, tab));
  const toList = () => navigate(propositionPaths.list());
  const saved = (result) => {
    client.setQueryData(["propositions", scope, "detail", result.id], result);
    reload();
    setNotice("Proposition saved.");
    toDetail(result.id);
  };
  const saleOrchestratorSaved = () => {
    client.invalidateQueries({ queryKey: ["propositions", id, "sale-orchestrators", "directory"] });
    setNotice("Sale Orchestrator saved.");
    toDetail(id, "orchestrator");
  };
  // Plans come from the already-loaded Proposition (only the Plans visible to
  // this caller — see PropositionMapper/PropositionAccess.visiblePlan), so a
  // /plans/{planId} URL resolves without a separate request.
  const plan = planId ? (detail.data?.plans ?? []).find((p) => p.id === planId) : null;
  const title = {
    list: "Propositions",
    create: "Create Proposition",
    edit: "Edit Proposition",
    detail: "Proposition details",
    plan: planId ? "Edit Plan" : "Create Plan",
    "sale-orchestrator": orchestratorId ? "Edit Sale Orchestrator" : "Create Sale Orchestrator",
  }[view];
  // Header Back goes one level up: Plan / Sale Orchestrator / edit → this
  // Proposition (on the tab they were opened from); detail / create → list.
  const back = {
    create: { onBack: toList, label: "Back to propositions" },
    detail: { onBack: toList, label: "Back to propositions" },
    edit: { onBack: () => toDetail(), label: "Back to proposition" },
    plan: { onBack: () => toDetail(), label: "Back to proposition" },
    "sale-orchestrator": { onBack: () => toDetail(id, "orchestrator"), label: "Back to proposition" },
  }[view];
  // Old entry point: the Product page navigates to the list URL with a
  // createFromSource state — forward it to the dedicated /new URL.
  if (view === "list" && location.state?.createFromSource)
    return <Navigate to={propositionPaths.create()} replace state={location.state} />;
  return (
    <section className="prop-page">
      <CorePageHeader
        title={title}
        onBack={back?.onBack}
        backLabel={back?.label}
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
      {options.isPending && <CoreLoadingState title="Loading permissions" />}
      {options.isError && (
        <ErrorState error={options.error} retry={options.refetch} />
      )}
      {view === "create" && options.data?.canCreate && (
        <PropositionForm
          options={{ ...options.data, scope }}
          presetSource={createSource}
          onCancel={toList}
          onSaved={saved}
        />
      )}
      {permissionsReady && DETAIL_VIEWS.includes(view) && (
        <>
          {detail.isPending && <CoreLoadingState title="Loading Proposition" />}
          {detail.isError && (
            <>
              <ErrorState error={detail.error} retry={detail.refetch} />
            </>
          )}
          {detail.data && (
            <>
              {view === "detail" && (
                <PropositionDetail
                  proposition={detail.data}
                  options={options.data}
                  activeTab={tabFromSearch(location.search)}
                  // Tab switches replace the history entry — Back leaves the
                  // Proposition instead of stepping through every tab.
                  onTabChange={(tab) => navigate(propositionPaths.detail(id, tab), { replace: true })}
                  onEdit={() => navigate(propositionPaths.edit(id))}
                  onPlan={(value) => navigate(propositionPaths.plan(id, value?.id))}
                  onSaleOrchestrator={(value) =>
                    navigate(propositionPaths.saleOrchestrator(id, value?.id))
                  }
                />
              )}
              {view === "edit" && options.data && (
                <PropositionForm
                  key={`${id}:${detail.data.revision}`}
                  proposition={detail.data}
                  options={{ ...options.data, scope }}
                  onCancel={() => toDetail()}
                  onSaved={saved}
                />
              )}
              {view === "plan" && planId && !plan && (
                <CoreNotFoundState
                  title="Plan not found"
                  description="This Plan was removed or is not in your data scope."
                  actions={
                    <CoreButton variant="secondary" onClick={() => toDetail()}>
                      Back to proposition
                    </CoreButton>
                  }
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
                  onCancel={() => toDetail()}
                  onSaved={saved}
                  onReload={reload}
                />
              )}
              {view === "plan" && !planId && (
                <PlanForm
                  key={`${id}:new:${detail.data.revision}`}
                  proposition={detail.data}
                  plan={null}
                  onCancel={() => toDetail()}
                  onSaved={saved}
                />
              )}
              {view === "sale-orchestrator" && (
                <SaleOrchestratorEditor
                  key={`${id}:${orchestratorId ?? "new"}`}
                  proposition={detail.data}
                  id={orchestratorId ?? null}
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
                  onCancel={() => toDetail(id, "orchestrator")}
                  onSaved={saleOrchestratorSaved}
                />
              )}
            </>
          )}
        </>
      )}
      {permissionsReady && view === "list" && (
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
            onRowClick={(row) => toDetail(row.id)}
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
    <FeedbackMessage error={error}>
      {errorMessage(error)}{" "}
      <CoreButton variant="ghost" size="sm" onClick={() => retry()}>
        Retry
      </CoreButton>
    </FeedbackMessage>
  );
}
