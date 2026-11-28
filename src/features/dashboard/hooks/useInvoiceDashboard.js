import { useQuery } from "@tanstack/react-query";
import { invoiceDashboardApi as api } from "../api/invoiceDashboard.api.js";
export function useInvoiceTenants(scope) {
  return useQuery({ queryKey: ["invoice-dashboard", scope, "tenants"], queryFn: api.tenants, retry: false });
}
export function useInvoiceDirectory(scope, tenantIds, page) {
  const selection = [...new Set(tenantIds)].sort().join(",");
  return useQuery({ queryKey: ["invoice-dashboard", scope, selection, "list", page],
    queryFn: () => api.list({ tenantIds: selection, page, size: 20 }), enabled: !!selection, retry: false });
}
export function useInvoiceDetail(scope, tenantId, id) {
  return useQuery({ queryKey: ["invoice-dashboard", scope, tenantId, "detail", id],
    queryFn: () => api.detail(id, tenantId), enabled: !!tenantId && !!id, retry: false });
}
