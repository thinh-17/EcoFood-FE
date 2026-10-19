import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary, getDashboardActivities } from "../api/dashboard.api.js";

export function useDashboard(tenantId) {
  const summary = useQuery({
    queryKey: ["dashboard", "summary", tenantId],
    queryFn: () => getDashboardSummary(tenantId),
    enabled: Boolean(tenantId),
  });
  const activities = useQuery({
    queryKey: ["dashboard", "activities", tenantId],
    queryFn: () => getDashboardActivities(tenantId),
    enabled: Boolean(tenantId),
  });
  return { summary, activities };
}
