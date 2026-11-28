import { useQuery } from "@tanstack/react-query";
import { apiClient, unwrapData } from "../../../services/apiClient.js";
import { useAuthStore } from "../../auth/store/authStore.js";

export function useRuleTenants() {
  const token = useAuthStore((state) => state.internalAccessToken);
  return useQuery({
    queryKey: ["data-access-rules", "tenants", token],
    queryFn: () => apiClient.get("/api/v1/data-access-rules/tenants").then(unwrapData),
  });
}
