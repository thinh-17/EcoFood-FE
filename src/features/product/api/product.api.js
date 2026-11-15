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
export async function getReferenceProducts(signal) {
  const products = [];
  let page = 0;
  let result;
  do {
    result = await listProducts({ page, size: 100 }, signal);
    products.push(...(result.content ?? []));
    page += 1;
  } while (page < result.totalPages);
  return Promise.all(products.map(async (product) => {
    if (product.type !== "MASTER") return product;
    const versions = await getProductVersions(product.id, signal);
    const approved = versions.filter((version) => version.status === "APPROVED").sort((a, b) => b.version - a.version)[0];
    if (!approved) return { ...product, approvedSource: false };
    const source = unwrapData(await apiClient.get(`${path(product.id)}/processes/${approved.version}`, { signal }));
    return { ...source, approvedSource: true };
  }));
}
export async function createProduct(payload) {
  return unwrapData(await apiClient.post(base, payload));
}
export async function updateProduct(id, payload) {
  return unwrapData(await apiClient.put(path(id), payload));
}
export async function productAction(id, action, payload) {
  if (!["submit", "approve", "reject", "versions"].includes(action)) throw new Error("Unknown product action");
  return unwrapData(await apiClient.post(`${path(id)}/${action}`, payload));
}
