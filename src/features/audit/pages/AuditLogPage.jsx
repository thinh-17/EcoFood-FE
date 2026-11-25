import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CoreButton, CoreCard, CoreFormActions, CoreModal, CorePageHeader, CoreSelect, CoreTable } from "@thinh-17/fe-core";
import { apiClient, unwrapData } from "../../../services/apiClient.js";
import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { canReadAudit } from "../lib/auditAccess.js";
import "./audit.css";

const endpoint = "/api/v1/audit-events";
const empty = { actorId: "", action: "", module: "", from: "", to: "", outcome: "" };
const pageSize = 25;
const actionOptions = ["CREATE", "UPDATE", "DELETE"].map((v) => ({ value: v, label: v }));
const outcomeOptions = ["SUCCESS", "FAILURE"].map((v) => ({ value: v, label: v }));
const formatTime = (value) => new Date(value).toLocaleString("en");
const columns = [
  { header: "Actor", accessorKey: "actorId" },
  { header: "Action", accessorKey: "action" },
  { header: "Module", accessorKey: "module" },
  { header: "Timestamp", accessorKey: "timestamp", cell: ({ getValue }) => formatTime(getValue()) },
  { header: "Outcome", accessorKey: "outcome" },
];
const read = (path, params, signal) => apiClient.get(path, { params, signal }).then(unwrapData);

function errorText(error) {
  if (error.response?.status === 403) return "Access denied.";
  if (error.response?.status === 401) return "Your session has expired.";
  if (error.response?.status === 400) return "Invalid filters.";
  return "Unable to load audit logs.";
}

export function AuditLogPage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  let claims = {};
  try { claims = decodeJwt(token) || {}; } catch { /* Invalid sessions cannot access this view. */ }
  return canReadAudit(claims.roles, claims.permissions)
    ? <Workspace key={token} scope={token} />
    : <main className="eco-module-page audit-page"><CorePageHeader eyebrow="EcoFood Platform" title="Audit Log" /><p className="audit-error" role="alert">Access denied.</p></main>;
}

function Workspace({ scope }) {
  const [draft, setDraft] = useState(empty);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState("");
  const [validation, setValidation] = useState("");
  const root = ["audit", scope];
  const events = useQuery({ queryKey: [...root, filters, page], retry: false,
    queryFn: ({ signal }) => read(endpoint, { ...filters, page, size: pageSize }, signal) });
  const actors = useQuery({ queryKey: [...root, "actors", draft.actorId], retry: false,
    queryFn: ({ signal }) => read(endpoint + "/actors", { prefix: draft.actorId }, signal) });
  const detail = useQuery({ queryKey: [...root, "detail", selected], enabled: !!selected, retry: false,
    queryFn: ({ signal }) => read(endpoint + "/" + encodeURIComponent(selected), {}, signal) });

  function apply(values) {
    const params = {};
    for (const [key, raw] of Object.entries(values)) {
      if (raw.trim()) params[key] = ["from", "to"].includes(key) ? new Date(raw).toISOString() : raw.trim();
    }
    if (params.from && params.to && params.from >= params.to) {
      setValidation("End time must be later than start time.");
      return;
    }
    setValidation(""); setSelected(""); setPage(0); setFilters(params);
  }
  const setValue = (name, value) => setDraft((d) => ({ ...d, [name]: value }));
  const inputField = (name) => ({ value: draft[name], onChange: (e) => setValue(name, e.target.value) });
  const selectField = (name) => ({ value: draft[name], onChange: (value) => setValue(name, value) });
  function changePage(next) { setSelected(""); setPage(next); }
  function refresh() { setSelected(""); events.refetch(); actors.refetch(); }

  return <main className="eco-module-page audit-page">
    <CorePageHeader eyebrow="EcoFood Platform" title="Audit Log"
      aside={<CoreButton variant="secondary" onClick={refresh}>Refresh</CoreButton>} />
    <CoreCard>
      <form className="audit-filters" onSubmit={(e) => { e.preventDefault(); apply(draft); }}>
        <label className="fe-field">Actor
          <input className="fe-input" list="audit-actors" maxLength={24} {...inputField("actorId")} />
        </label>
        <datalist id="audit-actors">{(actors.data || []).map((id) => <option key={id} value={id} />)}</datalist>
        <label className="fe-field">Action
          <CoreSelect options={actionOptions} placeholder="All actions" {...selectField("action")} />
        </label>
        <label className="fe-field">Module
          <input className="fe-input" {...inputField("module")} />
        </label>
        <label className="fe-field">From
          <input className="fe-input" type="datetime-local" {...inputField("from")} />
        </label>
        <label className="fe-field">Until
          <input className="fe-input" type="datetime-local" {...inputField("to")} />
        </label>
        <label className="fe-field">Outcome
          <CoreSelect options={outcomeOptions} placeholder="All outcomes" {...selectField("outcome")} />
        </label>
        <div className="audit-filters__actions">
          <CoreFormActions cancelLabel="Clear filters" onCancel={() => { setDraft(empty); apply(empty); }}
            confirmLabel="Apply filters" confirmType="submit" />
        </div>
      </form>
    </CoreCard>
    {validation && <p className="audit-error" role="alert">{validation}</p>}
    {events.isError && <p className="audit-error" role="alert">{errorText(events.error)}</p>}
    {!events.isError && <CoreCard>
      <CoreTable columns={columns} data={events.data?.content ?? []} loading={events.isPending}
        onRowClick={(row) => setSelected(row.id)} emptyTitle="No audit logs found." />
      <nav className="audit-pagination" aria-label="Audit log pagination">
        <CoreButton size="sm" variant="secondary" disabled={!page} onClick={() => changePage(page - 1)}>Previous</CoreButton>
        <span>Page {page + 1}</span>
        <CoreButton size="sm" variant="secondary" disabled={!events.data?.hasNext} onClick={() => changePage(page + 1)}>Next</CoreButton>
      </nav>
    </CoreCard>}
    <CoreModal isOpen={!!selected && !events.isError} onClose={() => setSelected("")} title="Event details"
      footer={<CoreButton variant="secondary" onClick={() => setSelected("")}>Close</CoreButton>}>
      {detail.isPending && <p role="status">Loading event…</p>}
      {detail.isError && <p className="audit-error" role="alert">{errorText(detail.error)}</p>}
      {detail.data && !detail.isError && <div className="fe-detail-grid">
        {[
          ["Actor", detail.data.actorId],
          ["Action", detail.data.action],
          ["Module", detail.data.module],
          ["Timestamp", formatTime(detail.data.timestamp)],
          ["Outcome", detail.data.outcome],
          ["Request ID", detail.data.requestId],
        ].map(([label, value]) => <div className="fe-detail-field" key={label}>
          <span className="fe-detail-field__label">{label}</span>
          <span className="fe-detail-field__value audit-detail-value">{value}</span>
        </div>)}
      </div>}
    </CoreModal>
  </main>;
}