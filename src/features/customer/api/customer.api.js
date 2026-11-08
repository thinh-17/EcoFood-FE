import { apiClient, unwrapData } from "../../../services/apiClient.js";

const BASE = "/api/v1/customers/me";

export async function getMyCustomerProfile() {
  return unwrapData(await apiClient.get(BASE));
}

export async function updateMyCustomerProfile(payload) {
  return unwrapData(await apiClient.patch(BASE, payload));
}

export async function getMyCustomerStatistics() {
  return unwrapData(await apiClient.get(`${BASE}/statistics`));
}

export async function getMyCustomerInvoices({ page = 0, size = 10 } = {}) {
  return unwrapData(await apiClient.get(`${BASE}/invoices`, { params: { page, size } }));
}

export async function getMyCustomerInvoiceDetail(invoiceId) {
  return unwrapData(await apiClient.get(`${BASE}/invoices/${encodeURIComponent(invoiceId)}`));
}
