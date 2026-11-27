import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { LoadingPage } from "../../../pages/LoadingPage/LoadingPage.jsx";

import { useAuthStore } from "../store/authStore.js";
import { useIdleTimeout } from "../hooks/useIdleTimeout.js";
import { SessionTimeoutDialog } from "./SessionTimeoutDialog.jsx";

/** Route guard — re-checks auth on every navigation, redirects straight to Keycloak if invalid. */
export function RequireAuth({ children }) {
  const location = useLocation();
  const status = useAuthStore((s) => s.status);
  const isValid = useAuthStore((s) => s.isValid);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const startLogin = useAuthStore((s) => s.startLogin);
  const logout = useAuthStore((s) => s.logout);
  const redirectStarted = useRef(false);

  const idle = useIdleTimeout(status === "authenticated");

  useEffect(() => {
    if (isValid()) {
      return undefined;
    }

    let cancelled = false;
    checkAuth().then((result) => {
      if (cancelled || result.isAuth || redirectStarted.current) {
        return;
      }
      redirectStarted.current = true;
      startLogin();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!isValid()) {
    return (
      <LoadingPage fullscreen title="Redirecting to sign in" description="Connecting you to secure sign-in." />
    );
  }

  return (
    <>
      {children}
      {idle.showDialog && (
        <SessionTimeoutDialog
          secondsLeft={idle.secondsLeft}
          onContinue={idle.continueSession}
          onLogout={() => {
            idle.dismiss();
            logout();
          }}
        />
      )}
    </>
  );
}
