import axios from "axios";
import { apiClient, unwrapData } from "../../../services/apiClient.js";

// Capability/Keycloak authentication endpoints must not inherit a stale staff JWT.
const publicClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8081", timeout: 10000 });
export const customerApi = {
  config: (tenantId) => publicClient.get("/api/v1/auth/customers/config", { params: { tenantId } }).then(unwrapData),
  defaultTenant: () => publicClient.get("/api/v1/auth/customers/default-tenant").then(unwrapData),
  bootstrap: (data) => publicClient.post("/api/v1/auth/customers/bootstrap", data).then(unwrapData),
  receipt: (token) => publicClient.post("/api/v1/auth/customer-receipts/view", { token }).then(unwrapData),
  profile: () => apiClient.get("/api/v1/customers/me").then(unwrapData),
  update: (profile) => apiClient.put("/api/v1/customers/me", { firstName: profile.firstName, lastName: profile.lastName, revision: profile.revision }).then(unwrapData),
  invoices: (page) => apiClient.get("/api/v1/customers/me/invoices", { params: { page, size: 20 } }).then(unwrapData),
  invoice: (id) => apiClient.get(`/api/v1/customers/me/invoices/${encodeURIComponent(id)}`).then(unwrapData),
  claim: (token) => apiClient.post("/api/v1/customers/me/invoices/claim", { token }).then(unwrapData),
};
