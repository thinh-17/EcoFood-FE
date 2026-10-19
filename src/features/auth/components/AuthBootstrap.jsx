import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "../store/authStore.js";

/**
 * Resolves which tenant this browser belongs to (GET /api/v1/tenants/
 * login-info) and runs the initial auth check BEFORE anything under it
 * renders — mirrors DCMP's KeycloakConfigLoader.loadConfig() gating
 * angular-auth-oidc-client's module init. Without this gate, a route guard
 * could run before realm/clientId are known and fail to redirect anywhere.
 */
export function AuthBootstrap({ children }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const error = useAuthStore((s) => s.error);
  const [ready, setReady] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    bootstrap().finally(() => setReady(true));
  }, [bootstrap]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Đang tải…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-red-600">
        Không thể xác định tenant cho tên miền này: {error}
      </div>
    );
  }

  return children;
}
