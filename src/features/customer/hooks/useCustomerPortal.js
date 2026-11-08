import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import {
  getMyCustomerInvoiceDetail,
  getMyCustomerInvoices,
  getMyCustomerProfile,
  getMyCustomerStatistics,
  updateMyCustomerProfile,
} from "../api/customer.api.js";

// Cache keys include BOTH user and tenant; data must not carry over on switch/login.
function useScope() {
  const token = useAuthStore((state) => state.internalAccessToken);
  return useMemo(() => {
    if (!token) return "";
    try {
      const jwt = decodeJwt(token);
      return jwt.sub && jwt.tenantId ? `${jwt.tenantId}:${jwt.sub}` : "";
    } catch {
      return "";
    }
  }, [token]);
}

export function useCustomerProfile() {
  const scope = useScope();
  return useQuery({
    queryKey: ["customer", scope, "profile"],
    queryFn: getMyCustomerProfile,
    enabled: Boolean(scope),
  });
}

export function useUpdateCustomerProfile() {
  const scope = useScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyCustomerProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(["customer", scope, "profile"], profile);
    },
  });
}

export function useCustomerStatistics() {
  const scope = useScope();
  return useQuery({
    queryKey: ["customer", scope, "statistics"],
    queryFn: getMyCustomerStatistics,
    enabled: Boolean(scope),
  });
}

export function useCustomerInvoices(page = 0) {
  const scope = useScope();
  return useQuery({
    queryKey: ["customer", scope, "invoices", page],
    queryFn: () => getMyCustomerInvoices({ page, size: 10 }),
    enabled: Boolean(scope),
  });
}

export function useCustomerInvoiceDetail(id) {
  const scope = useScope();
  return useQuery({
    queryKey: ["customer", scope, "invoice-detail", id],
    queryFn: () => getMyCustomerInvoiceDetail(id),
    enabled: Boolean(scope && id),
  });
}
