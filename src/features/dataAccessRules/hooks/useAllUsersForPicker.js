import { useQuery } from "@tanstack/react-query";
import { apiClient, unwrapData } from "../../../services/apiClient.js";
import { getUserDirectory } from "../../user/api/user.api.js";
export function useAllUsersForPicker(tenantId, entityType) {
  const legacyProduct = entityType === "Product";
  return useQuery({ queryKey: legacyProduct ? ["users", "directory", "picker"] : ["data-access-rules", "users", tenantId],
    queryFn: legacyProduct ? () => getUserDirectory({ page: 0, size: 100, sort: "firstName,asc" }).then((data) => data.content) : () => apiClient.get("/api/v1/data-access-rules/users", { params: { tenantId } }).then(unwrapData),
    enabled: legacyProduct || !!tenantId });
}
