import { apiClient, unwrapData } from "../../../services/apiClient.js";

const BASE = "/api/v1/transactions";

export async function getTransactions(params, signal) {
  return unwrapData(await apiClient.get(BASE, { params, signal }));
}

export async function getTransaction(id, signal) {
  return unwrapData(await apiClient.get(`${BASE}/${encodeURIComponent(id)}`, { signal }));
}

export async function getTransactionSummary(params, signal) {
  return unwrapData(await apiClient.get(`${BASE}/summary`, { params, signal }));
}

export async function submitTransaction(payload) {
  return unwrapData(await apiClient.post(BASE, payload));
}
