import { useQuery } from "@tanstack/react-query";
import { complaintApi } from "../api/complaint.api.js";
import { customerComplaintRoot } from "../lib/customerComplaintUpdates.js";

export function useCustomerComplaintUpdates(token, tenantId) {
  return useQuery({ queryKey: [...customerComplaintRoot(token, tenantId), "list", "", "", 0],
    queryFn: () => complaintApi.list(true, { page: 0, size: 20 }), enabled: !!token && !!tenantId,
    staleTime: 10000, refetchInterval: 15000, retry: false });
}
