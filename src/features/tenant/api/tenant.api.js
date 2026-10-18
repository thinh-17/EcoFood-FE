import { apiClient, unwrapData } from "../../../services/apiClient.js";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

export async function getMyTenants() {
  if (USE_MOCK) {
    return [
      { id: "tenant-001", name: "EcoFood – Quận 1", role: "TENANT_ADMIN" },
      { id: "tenant-002", name: "EcoFood – Thủ Đức", role: "TENANT_USER" },
    ];
  }
  const response = await apiClient.get("/api/v1/tenants/me");
  return unwrapData(response);
}
