import { apiClient, unwrapData } from "../../../services/apiClient.js";
import { requestForSave } from "../lib/planSale.js";

export const saleOrchestratorsPath = (proposition) =>
  `/api/v1/propositions/${encodeURIComponent(proposition)}/sale-orchestrators`;

// GET .../sale-orchestrators/directory — one row per Sale Orchestrator (not
// per Plan: one Orchestrator can cover many), same page/size/sort/search
// convention as every other directory endpoint in this platform.
export async function getSaleOrchestratorDirectory(
  propositionId,
  { page = 0, size = 20, sort, search } = {},
  signal,
) {
  const response = await apiClient.get(
    `${saleOrchestratorsPath(propositionId)}/directory`,
    { params: { page, size, sort, search }, signal },
  );
  return unwrapData(response);
}

export async function getSaleOrchestrator(propositionId, id, signal) {
  const response = await apiClient.get(
    `${saleOrchestratorsPath(propositionId)}/${encodeURIComponent(id)}`,
    { signal },
  );
  return unwrapData(response);
}

// Create and update both use the same request shape — a Sale Orchestrator
// has no version/status lifecycle, just a current, always-editable
// configuration (name/description + the Plans it covers).
export async function saveSaleOrchestrator(propositionId, row, value) {
  const body = requestForSave(row, value);
  const base = saleOrchestratorsPath(propositionId);
  return unwrapData(
    await (row
      ? apiClient.put(`${base}/${encodeURIComponent(row.id)}`, body)
      : apiClient.post(base, body)),
  );
}
