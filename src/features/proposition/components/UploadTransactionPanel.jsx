import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CoreButton, CoreSelect, CoreStatusBadge, CoreTable } from "@thinh-17/fe-core";

import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { errorMessage } from "../lib/proposition.js";
import { useAuthStore } from "../../auth/store/authStore.js";
import { useCurrentRoles } from "../../auth/hooks/useCurrentRoles.js";
import { canViewSaleOrchestratorDirectory } from "../../orchestrator/lib/planSale.js";
import { useSaleOrchestratorDirectory } from "../../orchestrator/hooks/useSaleOrchestratorDirectory.js";
import { getSaleOrchestrator } from "../../orchestrator/api/planSale.api.js";
import { submitTransactionCsv } from "../../transaction/api/transaction.api.js";
import { csvColumnsFor, csvExampleRowsFor, buildSampleCsv } from "../../transaction/lib/csvTemplate.js";

// Sibling to the Sale Orchestrator tab — same "managed by each distribution
// Tenant for its own Plans" gate (canViewSaleOrchestratorDirectory), since
// uploading a transaction batch is the same actor's capability.
export function UploadTransactionPanel({ proposition: p }) {
  const tenant = useAuthStore((s) => s.tenantId);
  const roles = useCurrentRoles();
  const allowed = canViewSaleOrchestratorDirectory(roles, tenant);

  const directory = useSaleOrchestratorDirectory({
    propositionId: p.id,
    page: 0,
    size: 100,
    sort: "name,asc",
    enabled: allowed,
  });
  const orchestratorOptions = (directory.data?.content ?? []).map((row) => ({
    value: row.id,
    label: row.name,
  }));
  const [orchestratorId, setOrchestratorId] = useState("");
  const detail = useQuery({
    queryKey: ["sale-orchestrator", p.id, orchestratorId],
    queryFn: ({ signal }) => getSaleOrchestrator(p.id, orchestratorId, signal),
    enabled: allowed && !!orchestratorId,
  });
  const orchestrator = orchestratorId ? detail.data : null;

  const columns = useMemo(() => csvColumnsFor(orchestrator), [orchestrator]);
  const exampleRows = useMemo(() => csvExampleRowsFor(orchestrator), [orchestrator]);
  const previewColumns = columns.map((key) => ({ accessorKey: key, header: key }));

  function downloadSample() {
    const blob = new Blob([buildSampleCsv(orchestrator)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = orchestrator ? `${orchestrator.name}-transaction-template.csv` : "transaction-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const fileInput = useRef(null);
  const [fileName, setFileName] = useState("");
  const upload = useMutation({
    mutationFn: (file) => submitTransactionCsv(file),
  });

  function pickFile(event) {
    const file = event.target.files?.[0] ?? null;
    setFileName(file?.name ?? "");
    upload.reset();
    if (file) upload.mutate(file);
  }

  if (!allowed)
    return (
      <section className="prop-panel">
        <h2>Upload Transaction</h2>
        <p className="prop-muted">
          Submitting a transaction batch is managed by each distribution
          Tenant for their own Plans — sign in as that Tenant to upload one.
        </p>
      </section>
    );

  return (
    <section className="prop-panel upload-transaction-panel">
      <div className="prop-section-heading">
        <div>
          <h2>Upload Transaction</h2>
          <p className="prop-muted">
            Submit a batch of invoices from a CSV file instead of calling the
            submit-transaction API directly — it's parsed into the exact
            same request and processed the exact same way.
          </p>
        </div>
      </div>

      <div className="upload-transaction-step">
        <h3>1. Check the column format</h3>
        <p className="prop-muted">
          Each row is one item. Rows sharing the same <code>invoiceRef</code>{" "}
          become one invoice — <code>invoiceHolder.*</code> columns must carry
          the same value on every row of that invoice, while{" "}
          <code>item.*</code> columns are per row. A blank cell means that
          field is omitted, not an empty value. Pick a Sale Orchestrator below
          to see the exact columns its configured fields require.
        </p>
        <label className="upload-transaction-orchestrator-picker">
          Preview columns for Sale Orchestrator
          <CoreSelect
            value={orchestratorId}
            onChange={setOrchestratorId}
            options={orchestratorOptions}
            placeholder={
              directory.isLoading
                ? "Loading Sale Orchestrators…"
                : orchestratorOptions.length
                  ? "Generic template (fixed columns only)"
                  : "No Sale Orchestrators yet — generic template below"
            }
            clearable
          />
        </label>
        <div className="upload-transaction-preview">
          <CoreTable columns={previewColumns} data={exampleRows} emptyTitle="No example rows" />
        </div>
        <CoreButton variant="secondary" onClick={downloadSample}>
          Download sample CSV
        </CoreButton>
      </div>

      <div className="upload-transaction-step">
        <h3>2. Upload your file</h3>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          onChange={pickFile}
          disabled={upload.isPending}
        />
        {fileName && <p className="prop-muted">Selected: {fileName}</p>}
        {upload.isPending && <p className="prop-muted">Uploading…</p>}
        {upload.isError && (
          <FeedbackMessage error={upload.error}>
            {errorMessage(upload.error)}
          </FeedbackMessage>
        )}
      </div>

      {upload.isSuccess && (
        <div className="upload-transaction-step">
          <h3>3. Results</h3>
          <UploadResultsTable invoices={upload.data.transaction.invoices} />
        </div>
      )}
    </section>
  );
}

function UploadResultsTable({ invoices }) {
  const columns = [
    { id: "index", header: "Invoice", cell: ({ row }) => `#${row.index + 1}` },
    { id: "items", header: "Items", cell: ({ row }) => row.original.items.length },
    {
      id: "result",
      header: "Result",
      cell: ({ row }) => (
        <CoreStatusBadge
          tone={row.original.result === "ACCEPTED" ? "success" : "error"}
          label={row.original.result}
        />
      ),
    },
    {
      id: "error",
      header: "Error",
      cell: ({ row }) =>
        row.original.error ? `${row.original.error.code}: ${row.original.error.message}` : "—",
    },
  ];
  return (
    <CoreTable
      columns={columns}
      data={invoices}
      emptyTitle="No invoices in this batch"
    />
  );
}
