import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore.js";
import { ROUTES } from "../../../constants/routes.js";

/** Reads tokens carried in the URL after a cross-origin tenant switch, stores them, then continues. */
export function AuthHandoffPage() {
  const completeHandoff = useAuthStore((s) => s.completeHandoff);
  const navigate = useNavigate();
  const [status, setStatus] = useState("Đang hoàn tất chuyển tenant…");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    console.log("[auth-handoff] landed on new tenant origin:", window.location.href);

    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    if (!accessToken || !refreshToken) {
      setStatus("Thiếu token chuyển tenant — quay lại trang chủ.");
      navigate(ROUTES.HOME, { replace: true });
      return;
    }

    completeHandoff(accessToken, refreshToken);

    // strip tokens from the URL/history
    window.history.replaceState({}, "", window.location.pathname);
    console.log("[auth-handoff] cleaned URL:", window.location.href);

    navigate(ROUTES.HOME, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-gray-600">{status}</div>
  );
}
