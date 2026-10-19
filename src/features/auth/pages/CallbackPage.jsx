import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore.js";
import { ROUTES } from "../../../constants/routes.js";

export function CallbackPage() {
  const [status, setStatus] = useState("Đang xác thực đăng nhập…");
  const handleCallback = useAuthStore((s) => s.handleCallback);
  const navigate = useNavigate();
  // Guards against React 18 StrictMode's dev-only double-invoke of effects
  // — without this, the same authorization code gets redeemed twice (the
  // second redemption is harmlessly rejected by Keycloak, but noisy).
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    handleCallback(params)
      .then(() => {
        // Per requirement: always land on the homepage after a successful login.
        navigate(ROUTES.HOME, { replace: true });
      })
      .catch((err) => setStatus(`Đăng nhập thất bại: ${err.message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-gray-600">
      {status}
    </div>
  );
}
