import { useQuery } from "@tanstack/react-query";
import { apiClient, unwrapData } from "../../../services/apiClient.js";
export function useRuleEntities(tenantId, type) {
  return useQuery({ queryKey: ["data-access-rules", "entities", tenantId, type],
    queryFn: () => apiClient.get("/api/v1/data-access-rules/entities", { params: { tenantId, type } }).then(unwrapData),
    enabled: !!tenantId && ["BUSINESS_DASHBOARD", "INVOICE_DASHBOARD"].includes(type),
    select: (rows) => rows.map((row) => ({ value: row.id, label: row.name || row.id })) });
}
