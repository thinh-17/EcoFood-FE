import { useQuery } from "@tanstack/react-query";
import { invoiceDashboardApi as api } from "../api/invoiceDashboard.api.js";
export function useInvoiceTenants(scope) {
  return useQuery({ queryKey: ["invoice-dashboard", scope, "tenants"], queryFn: api.tenants, retry: false });
}
export function useInvoiceDirectory(scope, tenantId, page) {
  return useQuery({ queryKey: ["invoice-dashboard", scope, tenantId, "list", page],
    queryFn: () => api.list({ tenantId, page, size: 20 }), enabled: !!tenantId, retry: false });
}
export function useInvoiceDetail(scope, tenantId, id) {
  return useQuery({ queryKey: ["invoice-dashboard", scope, tenantId, "detail", id],
    queryFn: () => api.detail(id, tenantId), enabled: !!tenantId && !!id, retry: false });
}
