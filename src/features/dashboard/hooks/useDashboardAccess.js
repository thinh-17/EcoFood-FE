import { useQuery } from "@tanstack/react-query";
import { getDashboardAccess } from "../api/dashboardAccess.api.js";
export function useDashboardAccess(scope, type) {
  return useQuery({ queryKey: ["dashboard-access", scope, type], queryFn: () => getDashboardAccess(type), retry: false });
}
