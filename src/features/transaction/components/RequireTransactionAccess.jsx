import { Outlet } from "react-router-dom";
import { CoreCard, CoreEmptyState } from "@thinh-17/fe-core";
import { useTransactionAccess } from "../hooks/useTransactionAccess.js";

export function RequireTransactionAccess({ submit = false }) {
  const access = useTransactionAccess();
  if (!(submit ? access.canSubmit : access.canRead)) {
    return <CoreCard><CoreEmptyState title="Không có quyền truy cập"
      description={submit ? "Tài khoản cần quyền TRANSACTION_SUBMIT."
        : "Tài khoản cần quyền TRANSACTION_READ và Data Scope dành cho nhân viên."} /></CoreCard>;
  }
  // Reset filters, details and replay payloads when user/tenant/ACL changes.
  return <Outlet key={access.cacheKey} />;
}
