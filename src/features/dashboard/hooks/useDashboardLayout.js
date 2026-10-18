import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardDefinition, getDashboardWidgetData, saveDashboardDefinition } from "../api/dashboardLayout.api.js";

export function useDashboardLayout(tenantId) {
  const queryClient = useQueryClient();
  const definition = useQuery({
    queryKey: ["dashboard", "layout", tenantId],
    queryFn: () => getDashboardDefinition(tenantId),
    enabled: Boolean(tenantId),
  });
  const widgetData = useQuery({
    queryKey: ["dashboard", "widget-data", tenantId],
    queryFn: () => getDashboardWidgetData(tenantId),
    enabled: Boolean(tenantId),
  });
  const save = useMutation({
    mutationFn: (draft) => saveDashboardDefinition(tenantId, draft),
    onSuccess: (saved) => {
      queryClient.setQueryData(["dashboard", "layout", tenantId], saved);
    },
  });
  return { definition, widgetData, save };
}
