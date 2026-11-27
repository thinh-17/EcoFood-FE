import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/authStore.js";
import { notificationsApi as api } from "../api/notification.api.js";
import { historyParams } from "../lib/notification.js";

export const emptyNotificationFilters = { event: "", status: "", from: "", to: "" };
export function useNotificationHistory({ enabled = true, filters = emptyNotificationFilters, page = 0, secondary = false } = {}) {
  const token = useAuthStore((state) => state.internalAccessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const root = ["notifications", token, tenantId];
  const capabilities = useQuery({ queryKey: [...root, "capabilities"], queryFn: api.capabilities, enabled,
    staleTime: 15000 });
  const history = useQuery({ queryKey: [...root, "history", filters, page],
    queryFn: () => api.history(historyParams(filters, page)), enabled: enabled && !!capabilities.data?.read,
    // A popup sharing the full page's exact query lets that page own the timer.
    // With different filters the popup has its own query and still refreshes.
    refetchInterval: (query) => enabled && !(secondary && query.getObserversCount() > 1) ? 15000 : false,
    staleTime: 10000 });
  return { root, capabilities, history };
}
