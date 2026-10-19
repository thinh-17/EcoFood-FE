import {
  apiClient,
  unwrapData,
} from "../../../services/apiClient.js";

import { newsMock } from "../mock/news.mock.js";

const USE_MOCK =
  import.meta.env.VITE_USE_MOCK_API === "true";

export async function getTenantNews(tenantId) {
  if (!tenantId) {
    return [];
  }

  // Giai đoạn 1: mọi tenant nhận cùng bản tin.
  if (USE_MOCK) {
    return newsMock;
  }

  // Giai đoạn 2:
  // Đây là endpoint đề xuất, cần thống nhất với BE.
  const response = await apiClient.get("/api/v1/news", {
    headers: {
      "X-Tenant-Id": tenantId,
    },
  });

  const result = unwrapData(response);

  return Array.isArray(result)
    ? result
    : result?.items ?? [];
}