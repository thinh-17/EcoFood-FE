import { apiClient, unwrapData } from "../../../services/apiClient.js";
import { configurationForSave } from "../lib/planSale.js";
export const planSalePath = (proposition, plan) =>
  `/api/v1/propositions/${encodeURIComponent(proposition)}/plans/${encodeURIComponent(plan)}/sale-orchestrator`;
export async function getPlanSale(proposition, plan, signal) {
  const response = await apiClient.get(planSalePath(proposition, plan), {
    signal,
  });
  return response.status === 204 ? null : unwrapData(response);
}
export async function savePlanSale(proposition, plan, row, configuration) {
  configuration = configurationForSave(configuration);
  const base = planSalePath(proposition, plan);
  return unwrapData(
    await (row
      ? apiClient.put(`${base}/draft`, {
          expectedRevision: row.revision,
          configuration,
        })
      : apiClient.post(base, { configuration })),
  );
}
export async function planSaleAction(
  proposition,
  plan,
  action,
  expectedRevision,
) {
  return unwrapData(
    await apiClient.post(`${planSalePath(proposition, plan)}/${action}`, {
      expectedRevision,
    }),
  );
}
