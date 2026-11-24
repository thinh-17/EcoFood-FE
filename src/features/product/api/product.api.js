import { apiClient, unwrapData } from "../../../services/apiClient.js";

const base = "/api/v1/products";
const path = (id) => `${base}/${encodeURIComponent(id)}`;

export async function listProducts(params, signal) {
  return unwrapData(await apiClient.get(base, { params, signal }));
}
export async function getProduct(id, signal) {
  return unwrapData(await apiClient.get(path(id), { signal }));
}
export async function getProductVersions(id, signal) {
  return unwrapData(await apiClient.get(`${path(id)}/versions`, { signal }));
}
export async function createProduct(payload) {
  return unwrapData(await apiClient.post(base, payload));
}
export async function updateProduct(id, payload) {
  return unwrapData(await apiClient.put(path(id), payload));
}
export async function productAction(id, action, payload) {
  if (!["submit", "versions"].includes(action)) throw new Error("Unknown product action");
  return unwrapData(await apiClient.post(`${path(id)}/${action}`, payload));
}
// approve/reject are version-targeted — any PENDING_REVIEW version can be
// approved/rejected, not just the latest (approving an older version demotes
// whichever other version currently holds APPROVED, server-side).
export async function productVersionAction(id, version, action, payload) {
  if (!["approve", "reject"].includes(action)) throw new Error("Unknown product version action");
  return unwrapData(await apiClient.post(`${path(id)}/processes/${version}/${action}`, payload));
}
