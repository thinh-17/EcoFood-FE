import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { useState } from "react";
import { CoreTabs, CoreTable } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { errorMessage, money, showDate } from "../lib/proposition.js";
import { propositionRevenueTotal } from "../lib/quarterlyMetrics.js";
import { usePlanDirectory } from "../hooks/usePlanDirectory.js";
import { MetricsTable } from "./PropositionFields.jsx";
import { PlanStatus } from "./PlanStatus.jsx";
import { useAuthStore } from "../../auth/store/authStore.js";
import { useCurrentRoles } from "../../auth/hooks/useCurrentRoles.js";
import { canViewSaleOrchestratorDirectory } from "../../orchestrator/lib/planSale.js";
import { useSaleOrchestratorDirectory } from "../../orchestrator/hooks/useSaleOrchestratorDirectory.js";
import { UploadTransactionPanel } from "./UploadTransactionPanel.jsx";

const OVERVIEW_TABS = [
  { id: "overview", label: "Overview" },
  { id: "revenue", label: "Expected Revenue" },
  { id: "actual", label: "Actual Metrics" },
];
const TABS = [
  { id: "plans", label: "Plans & Market Configuration" },
  { id: "orchestrator", label: "Sale Orchestrator" },
  { id: "upload-transaction", label: "Upload Transaction" },
];
export function PropositionDetail({
  proposition: p,
  options,
  onEdit,
  onPlan,
  onSaleOrchestrator,
}) {
  const [overviewTab, setOverviewTab] = useState("overview");
  const [activeTab, setActiveTab] = useState("plans");
  const tenantName = (id) =>
    [
      ...(options?.brands ?? []),
      ...(options?.distributionPartners ?? []),
      ...p.eligibleTenants,
    ].find((t) => t.id === id)?.name ?? id;
  return (
    <>
      <div className="prop-actions">
        {p.canEdit && (
          <CoreButton onClick={onEdit}>Edit Proposition</CoreButton>
        )}
      </div>
      <CoreTabs tabs={OVERVIEW_TABS} activeId={overviewTab} onChange={setOverviewTab} />
      {overviewTab === "overview" && (
        <OverviewPanel proposition={p} tenantName={tenantName} />
      )}
      {overviewTab === "revenue" && (
        <RevenuePanel proposition={p} tenantName={tenantName} />
      )}
      {overviewTab === "actual" && <ActualMetricsPanel proposition={p} />}
      <CoreTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
      {activeTab === "plans" && <PlansPanel proposition={p} onPlan={onPlan} />}
      {activeTab === "orchestrator" && (
        <SaleOrchestratorPanel proposition={p} onSaleOrchestrator={onSaleOrchestrator} />
      )}
      {activeTab === "upload-transaction" && <UploadTransactionPanel proposition={p} />}
    </>
  );
}

function OverviewPanel({ proposition: p, tenantName }) {
  const d = p.definition;
  return (
    <section className="prop-panel prop-overview">
      <div className="prop-overview-header">
        <div>
          <h2>{d.name}</h2>
          <p className="prop-muted">{p.enterpriseName}</p>
        </div>
        <span
          className={"prop-status-pill " + (p.active ? "prop-status-pill--approved" : "")}
        >
          <span aria-hidden="true" />
          {p.active ? "Active" : "Not active"}
        </span>
      </div>
      <p className="prop-overview-description">
        {d.description || "No description."}
      </p>
      <div className="prop-overview-stats">
        <div className="prop-stat">
          <span className="prop-stat-label">Countries of Sale</span>
          <span className="prop-stat-value">{d.regionIds.join(", ")}</span>
        </div>
        <div className="prop-stat">
          <span className="prop-stat-label">Target year</span>
          <span className="prop-stat-value">{d.targetYear ?? "—"}</span>
        </div>
        <div className="prop-stat">
          <span className="prop-stat-label">Current revenue</span>
          <span className="prop-stat-value">
            {money(propositionRevenueTotal(p), d.currency)}
          </span>
        </div>
        <div className="prop-stat">
          <span className="prop-stat-label">Effective period</span>
          <span className="prop-stat-value">
            {showDate(d.startDate)} – {showDate(d.endDate)}
          </span>
        </div>
      </div>
      <dl className="prop-facts prop-overview-details">
        {d.brandId && (
          <div>
            <dt>Brand</dt>
            <dd>{tenantName(d.brandId)}</dd>
          </div>
        )}
        <div>
          <dt>Distribution partners</dt>
          <dd>{d.distributionPartnerIds.map(tenantName).join(", ")}</dd>
        </div>
      </dl>
    </section>
  );
}

function RevenuePanel({ proposition: p, tenantName }) {
  const d = p.definition;
  return (
    <section className="prop-panel">
      <h2>Expected Revenue</h2>
      <p>
        Expected revenue:{" "}
        <strong>{money(d.expectRevenue, d.currency)}</strong>
      </p>
      <MetricsTable value={d.expectMetrics} currency={d.currency} />
      <dl className="prop-facts">
        {["enterprise", "platform", "distribution"].map((kind) => (
          <div key={kind}>
            <dt>{kind === "distribution" ? "Partner" : kind} profit share</dt>
            <dd>
              {d[kind + "ProfitShare"] == null
                ? "—"
                : d[kind + "ProfitShare"] + "%"}
            </dd>
          </div>
        ))}
      </dl>
      {d.partnerMetrics.map((item) => (
        <details key={item.tenantId}>
          <summary>
            {tenantName(item.tenantId)} · Expected revenue{" "}
            {money(item.expectRevenue, d.currency)}
          </summary>
          <MetricsTable value={item.expectMetrics} currency={d.currency} />
        </details>
      ))}
    </section>
  );
}

// Tenant-scoped monthly actuals are rolled up to quarters without mixing currencies.
function ActualMetricsPanel({ proposition: p }) {
  const d = p.definition;
  const currencies = [...new Set([d.currency, ...(p.actualMetrics ?? []).map((row) => row.currency)].filter(Boolean))];
  const [selectedCurrency, setSelectedCurrency] = useState(d.currency ?? currencies[0] ?? "");
  const rows = (p.actualMetrics ?? []).filter((row) => (row.currency ?? d.currency) === selectedCurrency);
  return (
    <section className="prop-panel">
      <h2>Actual metrics</h2>
      <p className="prop-muted">
        Accumulated from accepted Plan sales and grouped by calendar quarter.
      </p>
      {currencies.length > 1 && <label>Currency <select value={selectedCurrency} onChange={(event) => setSelectedCurrency(event.target.value)}>
        {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
      </select></label>}
      <MetricsTable value={rows} currency={selectedCurrency} />
    </section>
  );
}

// Fetched only once this tab is opened — GET .../plans/directory, same
// page/size/sort/search convention as every other directory endpoint in
// this platform. A row click opens the Plan's own edit/detail page
// (PlanDetail, rendered by PropositionPage's "plan" view) — same pattern as
// clicking a row in the Product directory opens ProductDetail.
function PlansPanel({ proposition: p, onPlan }) {
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [sort, setSort] = useState({ field: "name", direction: "asc" });
  const directory = usePlanDirectory({
    propositionId: p.id,
    revision: p.revision,
    page: 0,
    size: 100,
    sort: `${sort.field},${sort.direction}`,
    search,
    hasSearched,
  });
  const plans = directory.data?.content ?? [];
  const columns = [
    {
      accessorKey: "name",
      header: "Plan",
      meta: { sortable: true, sortField: "name" },
      cell: ({ row }) => (
        <span>
          {row.original.name} {row.original.code && <small>({row.original.code})</small>}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { sortable: true, sortField: "status" },
      cell: ({ getValue }) => <PlanStatus status={getValue()} />,
    },
    { id: "country", accessorFn: (row) => row.regionIds.join(", "), header: "Country of Sale" },
    {
      id: "updatedAt",
      accessorFn: (row) => showDate(row.updatedAt),
      header: "Last updated",
      meta: { sortable: true, sortField: "updatedAt" },
    },
  ];
  return (
    <section className="prop-panel">
      <div className="prop-section-heading">
        <div>
          <h2>Plans & market configuration</h2>
        </div>
        {p.canManagePlans && (
          <CoreButton onClick={() => onPlan(null)}>Add Plan</CoreButton>
        )}
      </div>
      <input
        type="search"
        className="fe-input"
        placeholder="Search Plans by name or code..."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setHasSearched(true);
        }}
      />
      {directory.isError && (
        <FeedbackMessage error={directory.error}>
          {errorMessage(directory.error)}{" "}
          <CoreButton variant="secondary" size="sm" onClick={() => directory.refetch()}>
            Retry
          </CoreButton>
        </FeedbackMessage>
      )}
      <CoreTable
        columns={columns}
        data={directory.isError ? [] : plans}
        loading={directory.isLoading}
        page={directory.data?.page ?? 0}
        pageSize={directory.data?.size ?? 100}
        totalElements={directory.data?.totalElements ?? 0}
        sort={sort}
        onSortChange={setSort}
        onPageChange={() => {}}
        onRowClick={(row) => onPlan(row)}
        emptyTitle={directory.isError ? "Unable to load Plans" : "No Plans in your data scope"}
        emptyDescription={
          directory.isError
            ? "Retry to load the Plan list."
            : search
              ? "Try another search."
              : "Add a Plan to start building this Proposition's market configuration."
        }
      />
    </section>
  );
}

// Fetched only once this tab is opened — GET .../sale-orchestrators/directory
// — one row per Sale Orchestrator (not per Plan: one Orchestrator can cover
// many at once). Same "table, Create new, click a row to view and edit it"
// convention as the Plans tab — Create/click-a-row swap the whole page to
// SaleOrchestratorEditor (see PropositionPage's "sale-orchestrator" view),
// not an inline panel under this table. Forbidden for an Enterprise viewer —
// a Sale Orchestrator is managed by each distribution Tenant for their own
// Plans.
function SaleOrchestratorPanel({ proposition: p, onSaleOrchestrator }) {
  const tenant = useAuthStore((s) => s.tenantId),
    roles = useCurrentRoles();
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [sort, setSort] = useState({ field: "name", direction: "asc" });
  const allowed = canViewSaleOrchestratorDirectory(roles, tenant);
  const directory = useSaleOrchestratorDirectory({
    propositionId: p.id,
    page: 0,
    size: 100,
    sort: `${sort.field},${sort.direction}`,
    search,
    hasSearched,
    enabled: allowed,
  });
  if (!allowed)
    return (
      <section className="prop-panel">
        <h2>Sale Orchestrator</h2>
        <p className="prop-muted">
          Sale Orchestrator configuration is managed by each distribution
          Tenant for their own Plans — sign in as that Tenant to view or
          configure it.
        </p>
      </section>
    );
  const columns = [
    { accessorKey: "name", header: "Name", meta: { sortable: true, sortField: "name" } },
    {
      id: "planNames",
      accessorFn: (row) => row.planNames.join(", "),
      header: "Plans",
    },
    {
      id: "updatedAt",
      accessorFn: (row) => showDate(row.updatedAt),
      header: "Last updated",
      meta: { sortable: true, sortField: "updatedAt" },
    },
  ];
  return (
    <section className="prop-panel">
      <div className="prop-section-heading">
        <div>
          <h2>Sale Orchestrator</h2>
          <p className="prop-muted">
            Configure which of your Plans a customer can buy together on one
            invoice when submitting a Sale transaction.
          </p>
        </div>
        <CoreButton onClick={() => onSaleOrchestrator(null)}>
          Create Sale Orchestrator
        </CoreButton>
      </div>
      <input
        type="search"
        className="fe-input"
        placeholder="Search by name, description or Plan..."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setHasSearched(true);
        }}
      />
      {directory.isError && (
        <FeedbackMessage error={directory.error}>
          {errorMessage(directory.error)}{" "}
          <CoreButton variant="secondary" size="sm" onClick={() => directory.refetch()}>
            Retry
          </CoreButton>
        </FeedbackMessage>
      )}
      <CoreTable
        columns={columns}
        data={directory.isError ? [] : (directory.data?.content ?? [])}
        loading={directory.isLoading}
        page={directory.data?.page ?? 0}
        pageSize={directory.data?.size ?? 100}
        totalElements={directory.data?.totalElements ?? 0}
        sort={sort}
        onSortChange={setSort}
        onPageChange={() => {}}
        onRowClick={(row) => onSaleOrchestrator(row)}
        emptyTitle={directory.isError ? "Unable to load Sale Orchestrators" : "No Sale Orchestrators yet"}
        emptyDescription={
          directory.isError
            ? "Retry to load the Sale Orchestrator list."
            : search
              ? "Try another search."
              : "Create one to let a customer buy several of your Plans on one invoice."
        }
      />
    </section>
  );
}
