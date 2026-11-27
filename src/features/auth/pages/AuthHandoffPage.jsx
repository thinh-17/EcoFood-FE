import { useEffect, useRef, useState } from "react";
import { LoadingPage } from "../../../pages/LoadingPage/LoadingPage.jsx";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore.js";
import { ROUTES } from "../../../constants/routes.js";

/** Reads tokens carried in the URL after a cross-origin tenant switch, stores them, then continues. */
export function AuthHandoffPage() {
  const completeHandoff = useAuthStore((s) => s.completeHandoff);
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing tenant switch…");
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
      setStatus("Tenant switch token is missing. Return to Home.");
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
    <LoadingPage fullscreen title={status} description="Preparing your selected tenant workspace." />
  );
}
