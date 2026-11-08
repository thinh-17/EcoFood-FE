import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTransaction, getTransactions, getTransactionSummary, submitTransaction } from "../api/transaction.api.js";
import { useTransactionAccess } from "./useTransactionAccess.js";

export function useTransactions(filters, page, size) {
  const { cacheKey, canRead } = useTransactionAccess();
  return useQuery({
    queryKey: ["transactions", cacheKey, "list", filters, page, size],
    queryFn: ({ signal }) => getTransactions({ ...filters, page, size }, signal),
    enabled: canRead,
    retry: false,
  });
}

export function useTransactionSummary(filters) {
  const { cacheKey, canRead } = useTransactionAccess();
  return useQuery({
    queryKey: ["transactions", cacheKey, "summary", filters],
    queryFn: ({ signal }) => getTransactionSummary(filters, signal),
    enabled: canRead,
    retry: false,
  });
}

export function useTransactionDetail(id) {
  const { cacheKey, canRead } = useTransactionAccess();
  return useQuery({
    queryKey: ["transactions", cacheKey, "detail", id],
    queryFn: ({ signal }) => getTransaction(id, signal),
    enabled: canRead && Boolean(id),
    retry: false,
  });
}

export function useSubmitTransaction() {
  const client = useQueryClient();
  const { cacheKey } = useTransactionAccess();
  return useMutation({
    mutationFn: submitTransaction,
    retry: false,
    onSuccess: () => client.invalidateQueries({ queryKey: ["transactions", cacheKey] }),
  });
}
