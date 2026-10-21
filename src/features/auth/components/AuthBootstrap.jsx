import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "../store/authStore.js";

/** Gates rendering until the tenant is resolved and the initial auth check runs. */
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
