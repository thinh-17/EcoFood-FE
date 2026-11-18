import { useState } from "react";
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
  statusLabel,
} from "../lib/proposition.js";
import { PropositionForm } from "./PropositionForm.jsx";
import { PropositionDetail } from "./PropositionDetail.jsx";
import { PlanForm } from "./PlanForm.jsx";
import { CurrencySettingsForm } from "./CurrencySettingsForm.jsx";
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
    accessorKey: "productVersion",
    header: "Product version",
    cell: ({ getValue }) => `v${getValue()}`,
  },
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
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => (
      <span className="prop-status">{statusLabel(getValue())}</span>
    ),
  },
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
  const [view, setView] = useState("list"),
    [id, setId] = useState(null),
    [plan, setPlan] = useState(null),
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
    enabled: Boolean(id) && ["detail", "edit", "plan"].includes(view),
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
  const title = {
    list: "Propositions",
    create: "Create Proposition",
    edit: "Edit Proposition",
    detail: "Proposition details",
    plan: plan ? "Edit Draft Plan" : "Create Plan",
    settings: "Enterprise currencies",
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
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {options.isPending && <p role="status">Loading permissions...</p>}
      {options.isError && (
        <ErrorState error={options.error} retry={options.refetch} />
      )}
      {view === "settings" && (
        <CurrencySettingsForm
          scope={scope}
          onCancel={() => setView("list")}
          onSaved={() => {
            reload();
            setNotice("Enterprise currencies saved.");
            setView("list");
          }}
        />
      )}
      {view === "create" && options.data?.canCreate && (
        <PropositionForm
          options={{ ...options.data, scope }}
          onCancel={() => setView("list")}
          onSaved={saved}
        />
      )}
      {["detail", "edit", "plan"].includes(view) && (
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
                  onSaved={saved}
                  onReload={reload}
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
              {view === "plan" && (
                <PlanForm
                  key={`${id}:${plan?.id ?? "new"}:${detail.data.revision}`}
                  proposition={detail.data}
                  plan={plan}
                  onCancel={() => setView("detail")}
                  onSaved={saved}
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
            {options.data?.canCreate && (
              <div className="prop-actions">
                <CoreButton
                  variant="secondary"
                  onClick={() => setView("settings")}
                >
                  Currencies
                </CoreButton>
                <CoreButton onClick={() => setView("create")}>
                  Create Proposition
                </CoreButton>
              </div>
            )}
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
      {errorMessage(error)} <button onClick={() => retry()}>Retry</button>
    </p>
  );
}
