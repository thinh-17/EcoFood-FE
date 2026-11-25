import { apiClient, unwrapData } from "../../../services/apiClient.js";
import { getTenantDirectory } from "../../tenant/api/tenant.api.js";
const base = "/api/v1/propositions";
const path = (id) => `${base}/${encodeURIComponent(id)}`;
export const listPropositions = async (params, signal) =>
  unwrapData(await apiClient.get(base, { params, signal }));
export const propositionOptions = async (signal) =>
  unwrapData(await apiClient.get(`${base}/options`, { signal }));
export const approvedProcesses = async (params, signal) =>
  unwrapData(
    await apiClient.get(`${base}/approved-processes`, { params, signal }),
  );
export const getProposition = async (id, signal) =>
  unwrapData(await apiClient.get(path(id), { signal }));
// GET /api/v1/propositions/{id}/plans/directory — one row per Plan visible
// to the caller, same page/size/sort/search convention as every other
// directory endpoint in this platform (e.g. getTenantDirectory). Backs the
// "Plans & Market Configuration" tab, fetched only once that tab is opened.
export const getPlanDirectory = async (
  id,
  { page = 0, size = 20, sort, search } = {},
  signal,
) =>
  unwrapData(
    await apiClient.get(`${path(id)}/plans/directory`, {
      params: { page, size, sort, search },
      signal,
    }),
  );
export const createProposition = async (body) =>
  unwrapData(await apiClient.post(base, body));
export const updateProposition = async (id, body) =>
  unwrapData(await apiClient.put(path(id), body));
export const savePlan = async (id, planId, body) =>
  planId
    ? unwrapData(
        await apiClient.put(
          `${path(id)}/plans/${encodeURIComponent(planId)}`,
          body,
        ),
      )
    : unwrapData(await apiClient.post(`${path(id)}/plans`, body));
export const approvePlan = async (id, planId, expectedRevision) =>
  unwrapData(
    await apiClient.post(
      `${path(id)}/plans/${encodeURIComponent(planId)}/approve`,
      { expectedRevision },
    ),
  );
export const rejectPlan = async (id, planId, expectedRevision, reason) =>
  unwrapData(
    await apiClient.post(
      `${path(id)}/plans/${encodeURIComponent(planId)}/reject`,
      { expectedRevision, reason },
    ),
  );
export const removePlan = async (id, planId, expectedRevision) =>
  unwrapData(
    await apiClient.delete(`${path(id)}/plans/${encodeURIComponent(planId)}`, {
      data: { expectedRevision },
    }),
  );
export const versionPlan = async (id, planId, expectedRevision) =>
  unwrapData(
    await apiClient.post(
      `${path(id)}/plans/${encodeURIComponent(planId)}/versions`,
      { expectedRevision },
    ),
  );
// Follow every Directory page; partners after the first 20 must remain selectable.
export async function propositionTenantDirectory(signal) {
  const rows = [];
  for (let page = 0; ; page++) {
    signal?.throwIfAborted();
    const result = await getTenantDirectory(
      { page, size: 100, sort: "tenantName,asc" },
      signal,
    );
    rows.push(...result.content);
    if (page + 1 >= result.totalPages) return rows;
  }
}
export const getCurrencySettings = async (signal) =>
  unwrapData(await apiClient.get(`${base}/settings`, { signal }));
export const saveCurrencySettings = async (body) =>
  unwrapData(await apiClient.put(`${base}/settings`, body));

export const submitPlan = async (id, planId, expectedRevision) =>
  unwrapData(
    await apiClient.post(
      `${path(id)}/plans/${encodeURIComponent(planId)}/submit`,
      { expectedRevision },
    ),
  );
