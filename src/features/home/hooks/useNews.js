import { useQuery } from "@tanstack/react-query";

import { getTenantNews } from "../api/news.api.js";

export function useNews(tenantId) {
  return useQuery({
    queryKey: ["news", tenantId],

    queryFn: () => getTenantNews(tenantId),

    enabled: Boolean(tenantId),

    staleTime: 60_000,
  });
}