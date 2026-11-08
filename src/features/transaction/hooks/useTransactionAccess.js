import { useMemo } from "react";
import { useAuthStore } from "../../auth/store/authStore.js";
import { decodeJwt } from "../../auth/lib/jwt.js";
import { transactionAccess } from "../lib/transactionAccess.js";

export function useTransactionAccess() {
  const token = useAuthStore((state) => state.internalAccessToken);
  return useMemo(() => {
    try {
      return transactionAccess(token ? decodeJwt(token) : {});
    } catch {
      return transactionAccess();
    }
  }, [token]);
}
